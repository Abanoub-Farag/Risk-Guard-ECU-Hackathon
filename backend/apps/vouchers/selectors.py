from uuid import UUID
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.vouchers.models import PharmacyVoucher


def voucher_get_by_code(*, voucher_code: str) -> PharmacyVoucher:
    """
    Retrieves a single pharmacy voucher by code with related refill request,
    patient identity, and prescription details eagerly loaded.
    """
    code = voucher_code.strip().upper() if voucher_code else ""
    try:
        return (
            PharmacyVoucher.objects.select_related(
                "refill_request",
                "refill_request__patient",
                "refill_request__prescription",
            )
            .get(voucher_code=code)
        )
    except PharmacyVoucher.DoesNotExist:
        raise ApplicationError(
            message=f"Voucher with code '{voucher_code}' not found.",
            code="voucher_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


def voucher_get_by_refill_id(*, refill_request_id: UUID) -> PharmacyVoucher:
    """
    Retrieves the issued voucher for a specific refill request intake.
    """
    try:
        return (
            PharmacyVoucher.objects.select_related(
                "refill_request",
                "refill_request__patient",
                "refill_request__prescription",
            )
            .get(refill_request_id=refill_request_id)
        )
    except PharmacyVoucher.DoesNotExist:
        raise ApplicationError(
            message=f"No voucher found for refill request '{refill_request_id}'.",
            code="voucher_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
