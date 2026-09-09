from datetime import timedelta
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus
from apps.vouchers.models import PharmacyVoucher, VoucherStatus
from apps.vouchers.services import voucher_issue_for_refill, voucher_redeem_pos

pytestmark = pytest.mark.django_db


@pytest.fixture
def patient() -> Patient:
    return Patient.objects.create(
        national_id="29001010101234",
        full_name="Mahmoud Salem",
        phone_number="+201001234567",
        baseline_systolic=120,
        baseline_diastolic=80,
    )


@pytest.fixture
def prescription(patient: Patient) -> PatientPrescription:
    return PatientPrescription.objects.create(
        patient=patient,
        medication_name="Amlodipine",
        dosage="5mg daily",
        refill_interval_days=30,
        is_active=True,
    )


@pytest.fixture
def refill_approved(patient: Patient, prescription: PatientPrescription) -> RefillRequest:
    return RefillRequest.objects.create(
        patient=patient,
        prescription=prescription,
        status=RefillStatus.APPROVED,
        has_severe_symptoms=False,
    )


class TestVoucherIssuanceService:
    """
    Unit tests for automated voucher issuance and 96-hour TTL initialization.
    """

    def test_voucher_issue_success(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        before = timezone.now()
        voucher = voucher_issue_for_refill(refill_request=refill_approved)
        after = timezone.now()

        assert len(voucher.voucher_code) == 16
        assert voucher.status == VoucherStatus.ACTIVE
        assert voucher.refill_request_id == refill_approved.id

        # TTL must be approximately 96 hours from now
        expected_expiry_min = before + timedelta(hours=96)
        expected_expiry_max = after + timedelta(hours=96)
        assert expected_expiry_min <= voucher.expires_at <= expected_expiry_max

    def test_voucher_issuance_is_strictly_idempotent(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        v1 = voucher_issue_for_refill(refill_request=refill_approved)
        v2 = voucher_issue_for_refill(refill_request=refill_approved)

        assert v1.id == v2.id
        assert v1.voucher_code == v2.voucher_code
        assert PharmacyVoucher.objects.filter(refill_request=refill_approved).count() == 1


class TestPOSRedemptionService:
    """
    Unit tests for POS redemption validation pipeline, identity checks,
    TTL expiration, and atomic dispensing synchronization.
    """

    def test_pos_redemption_success_and_prescription_sync(
        self,
        patient: Patient,
        prescription: PatientPrescription,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        before_dispense = timezone.now()
        redeemed = voucher_redeem_pos(
            voucher_code=voucher.voucher_code,
            national_id="29001010101234",
            dispensing_pharmacy_id="PHARM-CAIRO-001",
        )
        after_dispense = timezone.now()

        assert redeemed.status == VoucherStatus.DISPENSED
        assert redeemed.dispensing_pharmacy_id == "PHARM-CAIRO-001"
        assert redeemed.dispensed_at is not None
        assert before_dispense <= redeemed.dispensed_at <= after_dispense

        # Prescription synchronization verification
        prescription.refresh_from_db()
        assert prescription.last_dispensed_at is not None
        assert before_dispense <= prescription.last_dispensed_at <= after_dispense

    def test_pos_redemption_missing_pharmacy_id_raises_400(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)
        with pytest.raises(ApplicationError) as exc:
            voucher_redeem_pos(
                voucher_code=voucher.voucher_code,
                national_id="29001010101234",
                dispensing_pharmacy_id="   ",
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "missing_dispensing_pharmacy_id"

    def test_pos_redemption_identity_mismatch_fails_403(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        # Mismatched national ID
        with pytest.raises(ApplicationError) as exc:
            voucher_redeem_pos(
                voucher_code=voucher.voucher_code,
                national_id="29999999999999",
                dispensing_pharmacy_id="PHARM-CAIRO-001",
            )
        assert exc.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc.value.code == "identity_verification_failed"

        # Voucher remains ACTIVE
        voucher.refresh_from_db()
        assert voucher.status == VoucherStatus.ACTIVE

    def test_pos_redemption_expiration_boundary_check(
        self,
        patient: Patient,
        prescription: PatientPrescription,
        refill_approved: RefillRequest,
    ) -> None:
        now = timezone.now()

        # Case 1: Valid at 95h 59m
        voucher_valid = voucher_issue_for_refill(refill_request=refill_approved)
        voucher_valid.expires_at = now + timedelta(hours=95, minutes=59)
        voucher_valid.save(update_fields=["expires_at"])

        res_valid = voucher_redeem_pos(
            voucher_code=voucher_valid.voucher_code,
            national_id=patient.national_id,
            dispensing_pharmacy_id="PHARM-CAIRO-001",
        )
        assert res_valid.status == VoucherStatus.DISPENSED

        # Case 2: Expired at 96h 01m (1 minute past expiration)
        refill2 = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.APPROVED,
        )
        voucher_expired = voucher_issue_for_refill(refill_request=refill2)
        voucher_expired.expires_at = now - timedelta(minutes=1)
        voucher_expired.save(update_fields=["expires_at"])

        with pytest.raises(ApplicationError) as exc:
            voucher_redeem_pos(
                voucher_code=voucher_expired.voucher_code,
                national_id=patient.national_id,
                dispensing_pharmacy_id="PHARM-CAIRO-001",
            )
        assert exc.value.status_code == status.HTTP_410_GONE
        assert exc.value.code == "voucher_expired"

        # Voucher was in ACTIVE status but past 96-hour window
        voucher_expired.refresh_from_db()
        assert voucher_expired.status == VoucherStatus.ACTIVE

    def test_double_redemption_concurrency_guard_raises_409(
        self,
        patient: Patient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        # First redemption succeeds
        voucher_redeem_pos(
            voucher_code=voucher.voucher_code,
            national_id=patient.national_id,
            dispensing_pharmacy_id="PHARM-CAIRO-001",
        )

        # Second redemption attempt fails with 409 Conflict
        with pytest.raises(ApplicationError) as exc:
            voucher_redeem_pos(
                voucher_code=voucher.voucher_code,
                national_id=patient.national_id,
                dispensing_pharmacy_id="PHARM-ALEX-002",
            )
        assert exc.value.status_code == status.HTTP_409_CONFLICT
        assert exc.value.code == "voucher_already_dispensed"


class TestPharmacyVoucherModelConstraints:
    """
    Unit tests for database integrity constraints and model methods.
    """

    def test_database_check_constraint_rejects_dispensed_without_pharmacy_id(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        now = timezone.now()
        with pytest.raises(IntegrityError):
            PharmacyVoucher.objects.create(
                refill_request=refill_approved,
                voucher_code="ABCDEFGHJKMNPQRS",
                status=VoucherStatus.DISPENSED,
                expires_at=now + timedelta(hours=96),
                dispensed_at=now,
                dispensing_pharmacy_id=None,  # Violated
            )

    def test_database_check_constraint_rejects_dispensed_without_dispensed_at(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        now = timezone.now()
        with pytest.raises(IntegrityError):
            PharmacyVoucher.objects.create(
                refill_request=refill_approved,
                voucher_code="ABCDEFGHJKMNPQRS",
                status=VoucherStatus.DISPENSED,
                expires_at=now + timedelta(hours=96),
                dispensed_at=None,  # Violated
                dispensing_pharmacy_id="PHARM-001",
            )

    def test_model_clean_and_str(
        self,
        refill_approved: RefillRequest,
    ) -> None:
        now = timezone.now()
        voucher = PharmacyVoucher(
            refill_request=refill_approved,
            voucher_code="23456789ABCDEFGH",
            status=VoucherStatus.ACTIVE,
            expires_at=now + timedelta(hours=96),
        )
        voucher.clean()
        assert "23456789ABCDEFGH" in str(voucher)

        # Invalid clean on DISPENSED without required fields
        voucher.status = VoucherStatus.DISPENSED
        with pytest.raises(ValidationError):
            voucher.clean()
