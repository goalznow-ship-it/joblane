"""
Billing & monetization domain for Joblane.

Entities:
- BillingPlan: admin-managed plans (source of truth for prices/limits)
- CompanySubscription: one active subscription per company
- CompanyCreditLedger: append-only credit ledger, balances derived from it
- PaymentTransaction + PaymentEvent: provider-backed payments with event history
- Invoice + InvoiceItem: invoices with DB-sequence backed numbering
- PromoCode + PromoCodeRedemption: server-side validated promo codes
- PromotionProduct: purchasable promotion catalog (duration options)
- PromotionOrder: premium/featured/urgent orders on jobs

Money is stored as Numeric(12,2). All arithmetic uses Decimal - never float.
No card data (PAN/CVV) is ever modeled or stored.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.admin.models import PromotionType
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ── Enums ──────────────────────────────────────────────────────────────


class BillingPeriod(enum.Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class BillingPlanStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class SubscriptionStatus(enum.Enum):
    TRIALING = "TRIALING"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"


class CreditType(enum.Enum):
    JOB_POST = "JOB_POST"
    PREMIUM = "PREMIUM"
    FEATURED = "FEATURED"
    URGENT = "URGENT"


class CreditLedgerReason(enum.Enum):
    PLAN_ALLOCATION = "PLAN_ALLOCATION"
    PURCHASE = "PURCHASE"
    USAGE = "USAGE"
    REFUND = "REFUND"
    ADMIN_GRANT = "ADMIN_GRANT"
    EXPIRATION = "EXPIRATION"
    ADJUSTMENT = "ADJUSTMENT"


class PaymentTxnType(enum.Enum):
    PLAN_PURCHASE = "PLAN_PURCHASE"
    PLAN_RENEWAL = "PLAN_RENEWAL"
    CREDIT_PURCHASE = "CREDIT_PURCHASE"
    PROMOTION_PURCHASE = "PROMOTION_PURCHASE"


class PaymentStatus(enum.Enum):
    PENDING = "PENDING"
    REQUIRES_ACTION = "REQUIRES_ACTION"
    PROCESSING = "PROCESSING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class InvoiceStatus(enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    PAID = "PAID"
    VOID = "VOID"
    REFUNDED = "REFUNDED"


class PromoCodeType(enum.Enum):
    PERCENT = "PERCENT"
    FIXED = "FIXED"
    CREDIT_GRANT = "CREDIT_GRANT"


class PromoCodeStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class PromotionOrderStatus(enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELED = "CANCELED"
    REFUNDED = "REFUNDED"


# ── Plans ──────────────────────────────────────────────────────────────


class BillingPlan(Base):
    """Admin-managed plan definition. The database is the source of truth."""

    __tablename__ = "billing_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    price = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="AZN")
    billing_period = Column(Enum(BillingPeriod, name="billing_period"), nullable=False, default=BillingPeriod.MONTHLY)

    status = Column(Enum(BillingPlanStatus, name="billing_plan_status"), nullable=False, default=BillingPlanStatus.ACTIVE, index=True)

    included_job_posts = Column(Integer, nullable=False, default=0)
    included_premium_credits = Column(Integer, nullable=False, default=0)
    included_featured_credits = Column(Integer, nullable=False, default=0)
    included_urgent_credits = Column(Integer, nullable=False, default=0)
    max_active_jobs = Column(Integer, nullable=True)

    features = Column(JSON, default=list)
    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class CompanySubscription(Base):
    """One active subscription per company (V1)."""

    __tablename__ = "company_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("billing_plans.id"), nullable=False)

    status = Column(Enum(SubscriptionStatus, name="subscription_status"), nullable=False, default=SubscriptionStatus.ACTIVE, index=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    canceled_at = Column(DateTime(timezone=True))

    provider = Column(String(40), nullable=False, default="test")
    provider_customer_id = Column(String(255))
    provider_subscription_id = Column(String(255))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


# ── Credit ledger ──────────────────────────────────────────────────────


class CompanyCreditLedger(Base):
    """Append-only credit ledger. Balance = SUM(amount); never mutate history."""

    __tablename__ = "company_credit_ledger"
    __table_args__ = (
        Index("ix_credit_ledger_company_type_created", "company_id", "credit_type", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    credit_type = Column(Enum(CreditType, name="credit_type"), nullable=False)

    amount = Column(Integer, nullable=False)  # signed

    reason = Column(Enum(CreditLedgerReason, name="credit_ledger_reason"), nullable=False)
    reference_type = Column(String(60))
    reference_id = Column(String(64))

    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── Payments ───────────────────────────────────────────────────────────


class PaymentTransaction(Base):
    """Provider-backed payment. Never stores card data of any kind."""

    __tablename__ = "payment_transactions"
    __table_args__ = (
        UniqueConstraint("provider", "idempotency_key", name="uq_payment_txn_provider_idempotency"),
        Index("ix_payment_txn_company_created", "company_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    provider = Column(String(40), nullable=False, default="test")
    provider_payment_id = Column(String(255), index=True)
    provider_order_id = Column(String(255))

    type = Column(Enum(PaymentTxnType, name="payment_txn_type"), nullable=False)
    status = Column(Enum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.PENDING, index=True)

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="AZN")

    description = Column(String(500))
    metadata_json = Column("metadata", JSON, default=dict)  # safe data only

    idempotency_key = Column(String(120), nullable=False)
    checkout_url = Column(String(1000))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)
    completed_at = Column(DateTime(timezone=True))


class PaymentEvent(Base):
    """Provider/webhook event history for a transaction (safe payload subset)."""

    __tablename__ = "payment_events"
    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_payment_event_provider_event"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("payment_transactions.id", ondelete="CASCADE"), nullable=False, index=True)

    provider = Column(String(40), nullable=False)
    provider_event_id = Column(String(255), nullable=False)
    event_type = Column(String(80), nullable=False)
    payload_hash = Column(String(64))
    payload_safe = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── Invoices ───────────────────────────────────────────────────────────


class Invoice(Base):
    """Company invoice with collision-safe DB-sequence numbering."""

    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    invoice_number = Column(String(32), unique=True, nullable=False, index=True)
    status = Column(Enum(InvoiceStatus, name="invoice_status"), nullable=False, default=InvoiceStatus.OPEN, index=True)

    currency = Column(String(3), nullable=False, default="AZN")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    tax = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)

    promo_code = Column(String(60))
    payment_transaction_id = Column(UUID(as_uuid=True), ForeignKey("payment_transactions.id"))

    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    description = Column(String(500), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    amount = Column(Numeric(12, 2), nullable=False, default=0)

    reference_type = Column(String(60))
    reference_id = Column(String(64))


class InvoiceNumberSequence(Base):
    """DB-backed per-year counter for collision-safe invoice numbering."""

    __tablename__ = "invoice_number_sequences"

    year = Column(Integer, primary_key=True)
    last_value = Column(Integer, nullable=False, default=0)


# ── Promo codes ────────────────────────────────────────────────────────


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    code_normalized = Column(String(60), unique=True, nullable=False, index=True)

    type = Column(Enum(PromoCodeType, name="promo_code_type"), nullable=False)
    value = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3))  # required for FIXED, optional otherwise
    credit_type = Column(Enum(CreditType, name="credit_type", create_type=False), nullable=True)

    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)

    max_redemptions = Column(Integer, nullable=True)
    max_redemptions_per_company = Column(Integer, nullable=True)
    minimum_amount = Column(Numeric(12, 2), nullable=True)

    applicable_plan_codes = Column(JSON, default=list)  # empty list = all plans/products
    status = Column(Enum(PromoCodeStatus, name="promo_code_status"), nullable=False, default=PromoCodeStatus.ACTIVE, index=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PromoCodeRedemption(Base):
    __tablename__ = "promo_code_redemptions"
    __table_args__ = (
        Index("ix_promo_redemptions_code_company", "promo_code_id", "company_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    promo_code_id = Column(UUID(as_uuid=True), ForeignKey("promo_codes.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    transaction_id = Column(UUID(as_uuid=True), ForeignKey("payment_transactions.id"))
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    credits_granted = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── Promotions ─────────────────────────────────────────────────────────


class PromotionProduct(Base):
    """Catalog entry: one product (PREMIUM/FEATURED/URGENT) duration option."""

    __tablename__ = "promotion_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    product = Column(Enum(PromotionType, name="promotion_product_type"), nullable=False, index=True)
    duration_days = Column(Integer, nullable=False)

    price = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="AZN")
    credit_cost = Column(Integer, nullable=False, default=1)

    is_active = Column(Boolean, nullable=False, default=True, index=True)
    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class PromotionOrder(Base):
    """An order to promote a job; must belong to the company's own job."""

    __tablename__ = "promotion_orders"
    __table_args__ = (
        Index("ix_promotion_orders_company_created", "company_id", "created_at"),
        UniqueConstraint("company_id", "idempotency_key", name="uq_promotion_order_company_idem"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    product = Column(Enum(PromotionType, name="promotion_product_type"), nullable=False)
    duration_days = Column(Integer, nullable=False)

    payment_transaction_id = Column(UUID(as_uuid=True), ForeignKey("payment_transactions.id"))
    credit_ledger_id = Column(UUID(as_uuid=True), ForeignKey("company_credit_ledger.id"))

    status = Column(Enum(PromotionOrderStatus, name="promotion_order_status"), nullable=False, default=PromotionOrderStatus.PENDING, index=True)

    starts_at = Column(DateTime(timezone=True))
    ends_at = Column(DateTime(timezone=True))
    idempotency_key = Column(String(120), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
