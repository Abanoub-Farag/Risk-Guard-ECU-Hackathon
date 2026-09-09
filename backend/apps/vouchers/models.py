from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from apps.common.models import BaseModel
from apps.refills.models import RefillRequest


class VoucherStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DISPENSED = "DISPENSED", "Dispensed"
    EXPIRED = "EXPIRED", "Expired"
    CANCELLED = "CANCELLED", "Cancelled"


class PharmacyVoucher(BaseModel):
    """
    Cryptographically secure digital e-prescription voucher issued upon refill approval,
    enforcing a 96-hour redemption window and strict POS identity verification.
    """
    refill_request = models.OneToOneField(
        RefillRequest,
        on_delete=models.CASCADE,
        related_name="voucher",
        unique=True,
        db_index=True,
    )
    voucher_code = models.CharField(
        max_length=16,
        unique=True,
        db_index=True,
        help_text="Cryptographically strong, non-sequential 16-character alphanumeric code",
    )
    status = models.CharField(
        max_length=20,
        choices=VoucherStatus.choices,
        default=VoucherStatus.ACTIVE,
        db_index=True,
    )
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Expiration timestamp (96 hours after issuance)",
    )
    dispensed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when medication was dispensed at pharmacy POS",
    )
    dispensing_pharmacy_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Unique identifier of the dispensing pharmacy branch",
    )

    class Meta(BaseModel.Meta):
        db_table = "pharmacy_vouchers"
        constraints = [
            models.CheckConstraint(
                condition=Q(status__in=VoucherStatus.values),
                name="chk_voucher_status_valid",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        status=VoucherStatus.DISPENSED,
                        dispensed_at__isnull=False,
                        dispensing_pharmacy_id__isnull=False,
                    )
                    | ~Q(status=VoucherStatus.DISPENSED)
                ),
                name="chk_voucher_dispensed_fields",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.status == VoucherStatus.DISPENSED:
            if self.dispensed_at is None or not self.dispensing_pharmacy_id or not self.dispensing_pharmacy_id.strip():
                raise ValidationError(
                    "Dispensed vouchers must contain non-null dispensed_at and dispensing_pharmacy_id."
                )

    def __str__(self) -> str:
        return f"Voucher {self.voucher_code} [{self.status}] for Refill {self.refill_request_id}"
