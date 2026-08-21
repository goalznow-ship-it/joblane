"""
Deterministic TEST/SANDBOX payment provider.

- No real money, no network calls.
- Checkout URL points at the local payment result page.
- Confirmation happens exclusively through the backend test-confirm
  endpoint (or signed webhooks in tests), never via browser redirects.
- Only usable when APP_ENV != production and PAYMENT_MODE != production
  (enforced by base.get_provider).
"""

import hashlib
import hmac
import json
import time
from decimal import Decimal
from typing import Optional

from app.billing.providers.base import PaymentProvider, ProviderError
from app.core.config import settings

WEBHOOK_REPLAY_WINDOW_SECONDS = 300


class TestPaymentProvider(PaymentProvider):
    name = "test"

    def _secret(self) -> str:
        return settings.payment_webhook_secret or "test-webhook-secret"

    # ── Provider API surface ────────────────────────────────────────────

    def create_payment(
        self,
        *,
        transaction_id: str,
        amount: Decimal,
        currency: str,
        description: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        provider_payment_id = f"test_pay_{transaction_id.replace('-', '')[:20]}"
        provider_order_id = f"test_order_{transaction_id.replace('-', '')[:20]}"
        base = settings.web_url.rstrip("/")
        checkout_url = (
            f"{base}/employer/billing/payment/result"
            f"?transaction_id={transaction_id}&provider=test"
        )
        return {
            "checkout_url": checkout_url,
            "provider_payment_id": provider_payment_id,
            "provider_order_id": provider_order_id,
        }

    def get_payment(self, provider_payment_id: str) -> dict:
        return {"provider_payment_id": provider_payment_id, "status": "PENDING"}

    def cancel_payment(self, provider_payment_id: str) -> dict:
        return {"provider_payment_id": provider_payment_id, "status": "CANCELED"}

    def refund_payment(self, provider_payment_id: str, amount: Decimal) -> dict:
        return {
            "provider_payment_id": provider_payment_id,
            "status": "REFUNDED",
            "refunded_amount": str(amount),
        }

    # ── Webhook signing/verification ────────────────────────────────────

    @staticmethod
    def build_webhook_payload(
        *,
        event_id: str,
        event_type: str,
        transaction_ref: str,
        status: str,
    ) -> bytes:
        """Deterministic payload used by tests and the test-confirm endpoint."""
        body = json.dumps(
            {
                "id": event_id,
                "type": event_type,
                "data": {
                    "payment_id": transaction_ref,
                    "order_id": f"test_order_{transaction_ref.replace('-', '')[:20]}",
                    "status": status,
                },
            },
            sort_keys=True,
        ).encode("utf-8")
        return body

    @staticmethod
    def sign(body: bytes, secret: str, timestamp: int) -> str:
        mac = hmac.new(secret.encode("utf-8"), body, hashlib.sha256)
        mac.update(str(timestamp).encode("utf-8"))
        return mac.hexdigest()

    def verify_webhook(self, *, body: bytes, headers: dict) -> dict:
        signature = headers.get("x-jl-signature") or ""
        timestamp_raw = headers.get("x-jl-timestamp") or ""
        if not signature or not timestamp_raw:
            raise ProviderError("Missing webhook signature headers")
        try:
            timestamp = int(timestamp_raw)
        except ValueError as exc:
            raise ProviderError("Invalid webhook timestamp") from exc

        if abs(time.time() - timestamp) > WEBHOOK_REPLAY_WINDOW_SECONDS:
            raise ProviderError("Webhook timestamp outside replay window")

        expected = self.sign(body, self._secret(), timestamp)
        if not hmac.compare_digest(expected, signature):
            raise ProviderError("Invalid webhook signature")

        try:
            payload = json.loads(body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise ProviderError("Invalid webhook JSON body") from exc

        data = payload.get("data", {})
        return {
            "event_id": str(payload.get("id", "")),
            "event_type": str(payload.get("type", "")),
            "provider_payment_id": str(data.get("payment_id", "")),
            "provider_order_id": str(data.get("order_id", "")),
            "status": str(data.get("status", "")).upper(),
            "safe_payload": {"type": payload.get("type"), "status": data.get("status")},
        }
