"""
Payment provider abstraction.

A provider handles the actual money movement. Joblane never touches card
data: providers receive an amount/currency/description and return a
checkout reference (URL or provider-side payment id).

Production providers are only activated through environment configuration.
The deterministic TEST provider is refused when APP_ENV=production.
"""

import abc
from typing import Optional

from app.core.config import settings


class ProviderError(Exception):
    """Raised for provider-level failures."""


class PaymentProvider(abc.ABC):
    """Interface every payment provider must implement."""

    name: str = "base"

    @abc.abstractmethod
    def create_payment(
        self,
        *,
        transaction_id: str,
        amount,  # Decimal
        currency: str,
        description: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Create a provider-side payment. Returns dict with checkout_url and provider ids."""

    @abc.abstractmethod
    def get_payment(self, provider_payment_id: str) -> dict:
        """Fetch current payment state from the provider."""

    @abc.abstractmethod
    def cancel_payment(self, provider_payment_id: str) -> dict:
        """Cancel a pending provider-side payment."""

    @abc.abstractmethod
    def refund_payment(self, provider_payment_id: str, amount) -> dict:
        """Refund a settled payment (full or partial amount)."""

    @abc.abstractmethod
    def verify_webhook(self, *, body: bytes, headers: dict) -> dict:
        """
        Verify webhook authenticity + freshness and parse the event.
        Must raise ProviderError on invalid signature or stale timestamp.
        Returns dict with at least:
          {event_id, event_type, provider_payment_id, status, safe_payload}
        """


def get_provider(name: Optional[str] = None) -> PaymentProvider:
    """Resolve a provider by name with production safety guards."""
    from app.billing.providers.test_provider import TestPaymentProvider

    provider_name = (name or settings.payment_provider or "test").lower()
    if provider_name == "test":
        _guard_test_provider()
        return TestPaymentProvider()
    raise ProviderError(f"Unknown payment provider: {provider_name}")


def _guard_test_provider() -> None:
    env = (settings.app_env or "").lower()
    mode = (settings.payment_mode or "").lower()
    if env == "production":
        raise RuntimeError(
            "TEST payment provider is not allowed in production "
            f"(APP_ENV={env}, PAYMENT_PROVIDER=test)."
        )
    if mode == "production":
        raise RuntimeError(
            "TEST payment provider is not allowed with PAYMENT_MODE=production."
        )
