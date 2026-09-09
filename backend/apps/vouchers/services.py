from datetime import timedelta
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.refills.models import RefillRequest
from apps.vouchers.models import PharmacyVoucher, VoucherStatus
from apps.vouchers.tokens import generate_secure_voucher_code


@transaction.atomic
def voucher_issue_for_refill(
    *,
    refill_request: RefillRequest,
) -> PharmacyVoucher:
    """
    Issues a cryptographically secure 16-character e-prescription redemption voucher
    for an approved refill intake request with a 96-hour expiration TTL.
    Strictly idempotent: returns existing voucher if already issued.
    """
    existing = PharmacyVoucher.objects.filter(refill_request=refill_request).first()
    if existing is not None:
        return existing

    # Generate unique non-colliding code
    for _ in range(5):
        code = generate_secure_voucher_code()
        if not PharmacyVoucher.objects.filter(voucher_code=code).exists():
            break
    else:
        code = generate_secure_voucher_code(20)

    expires_at = timezone.now() + timedelta(hours=96)

    try:
        voucher = PharmacyVoucher.objects.create(
            refill_request=refill_request,
            voucher_code=code,
            status=VoucherStatus.ACTIVE,
            expires_at=expires_at,
        )
        return voucher
    except IntegrityError:
        # Concurrent issuance fallback
        return PharmacyVoucher.objects.get(refill_request=refill_request)


@transaction.atomic
def voucher_redeem_pos(
    *,
    voucher_code: str,
    national_id: str,
    dispensing_pharmacy_id: str,
) -> PharmacyVoucher:
    """
    Hardened Point-of-Sale (POS) voucher verification and medication dispensing engine.
    Applies row-level locking (SELECT ... FOR UPDATE), validates active status and 96-hour TTL,
    verifies Egyptian National ID integrity, transitions voucher status to DISPENSED,
    and atomically synchronizes prescription last_dispensed_at.
    """
    code = voucher_code.strip().upper() if voucher_code else ""
    cleaned_pharmacy_id = dispensing_pharmacy_id.strip() if dispensing_pharmacy_id else ""
    supplied_national_id = national_id.strip() if national_id else ""

    if not cleaned_pharmacy_id:
        raise ApplicationError(
            message="Dispensing pharmacy identifier is required.",
            code="missing_dispensing_pharmacy_id",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 1. Row Lock & Existence Lookup
    try:
        voucher = (
            PharmacyVoucher.objects.select_for_update()
            .select_related(
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

    # 2. State Verification
    if voucher.status == VoucherStatus.DISPENSED:
        raise ApplicationError(
            message="Voucher has already been dispensed.",
            code="voucher_already_dispensed",
            status_code=status.HTTP_409_CONFLICT,
        )

    if voucher.status != VoucherStatus.ACTIVE:
        raise ApplicationError(
            message=f"Voucher cannot be redeemed because its status is '{voucher.status}'.",
            code="voucher_invalid",
            status_code=status.HTTP_409_CONFLICT,
        )

    # 3. TTL Expiration Verification (96 Hours)
    now = timezone.now()
    if now > voucher.expires_at:
        raise ApplicationError(
            message="Voucher has expired (96-hour validity window exceeded).",
            code="voucher_expired",
            status_code=status.HTTP_410_GONE,
        )

    # 4. Identity Verification (Anti-Fraud Anchor)
    patient = voucher.refill_request.patient
    if supplied_national_id != patient.national_id:
        raise ApplicationError(
            message="Identity verification failed. The presented National ID does not match the prescription record.",
            code="identity_verification_failed",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 5. Atomic Dispense Execution
    voucher.status = VoucherStatus.DISPENSED
    voucher.dispensed_at = now
    voucher.dispensing_pharmacy_id = cleaned_pharmacy_id
    voucher.save(update_fields=["status", "dispensed_at", "dispensing_pharmacy_id", "updated_at"])

    # 6. Synchronize Prescription Dispensing Record
    prescription = voucher.refill_request.prescription
    prescription.last_dispensed_at = now
    prescription.save(update_fields=["last_dispensed_at", "updated_at"])

    return voucher
