from datetime import timedelta
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus
from apps.vouchers.models import PharmacyVoucher, VoucherStatus
from apps.vouchers.services import voucher_issue_for_refill

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client() -> APIClient:
    user = User.objects.create_user(username="pos_pharmacist", password="password123")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


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


class TestPOSVoucherRedeemAPI:
    """
    Integration tests for POST /api/v1/vouchers/redeem
    """

    def test_redeem_voucher_success(
        self,
        auth_client: APIClient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        url = "/api/v1/vouchers/redeem"
        payload = {
            "voucher_code": voucher.voucher_code,
            "national_id": "29001010101234",
            "dispensing_pharmacy_id": "PHARM-GIZA-004",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["voucher_code"] == voucher.voucher_code
        assert data["status"] == VoucherStatus.DISPENSED
        assert data["dispensing_pharmacy_id"] == "PHARM-GIZA-004"
        assert data["medication_name"] == "Amlodipine"
        assert data["dosage"] == "5mg daily"
        assert data["patient_name"] == "Mahmoud Salem"

        voucher.refresh_from_db()
        assert voucher.status == VoucherStatus.DISPENSED

    def test_redeem_voucher_identity_mismatch_returns_403(
        self,
        auth_client: APIClient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        url = "/api/v1/vouchers/redeem"
        payload = {
            "voucher_code": voucher.voucher_code,
            "national_id": "28801010109999",  # Wrong national ID
            "dispensing_pharmacy_id": "PHARM-GIZA-004",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["code"] == "identity_verification_failed"

    def test_redeem_voucher_expired_returns_410(
        self,
        auth_client: APIClient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)
        voucher.expires_at = timezone.now() - timedelta(minutes=5)
        voucher.save(update_fields=["expires_at"])

        url = "/api/v1/vouchers/redeem"
        payload = {
            "voucher_code": voucher.voucher_code,
            "national_id": "29001010101234",
            "dispensing_pharmacy_id": "PHARM-GIZA-004",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_410_GONE
        assert response.json()["code"] == "voucher_expired"

    def test_redeem_voucher_already_dispensed_returns_409(
        self,
        auth_client: APIClient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        url = "/api/v1/vouchers/redeem"
        payload = {
            "voucher_code": voucher.voucher_code,
            "national_id": "29001010101234",
            "dispensing_pharmacy_id": "PHARM-GIZA-004",
        }
        # First redemption
        res1 = auth_client.post(url, payload, format="json")
        assert res1.status_code == status.HTTP_200_OK

        # Second redemption attempt
        res2 = auth_client.post(url, payload, format="json")
        assert res2.status_code == status.HTTP_409_CONFLICT
        assert res2.json()["code"] == "voucher_already_dispensed"

    def test_redeem_voucher_nonexistent_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        url = "/api/v1/vouchers/redeem"
        payload = {
            "voucher_code": "NONEXISTENT12345",
            "national_id": "29001010101234",
            "dispensing_pharmacy_id": "PHARM-GIZA-004",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestPOSVoucherLookupAPI:
    """
    Integration tests for GET /api/v1/vouchers/{voucher_code}
    """

    def test_lookup_voucher_returns_masked_identity_and_medication(
        self,
        auth_client: APIClient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        url = f"/api/v1/vouchers/{voucher.voucher_code}"
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["voucher_code"] == voucher.voucher_code
        assert data["status"] == VoucherStatus.ACTIVE
        assert data["medication_name"] == "Amlodipine"
        assert data["dosage"] == "5mg daily"
        assert data["patient_name"] == "Mahmoud Salem"
        # Masked National ID: 290010******34
        assert data["masked_national_id"] == "290010******34"

    def test_lookup_nonexistent_voucher_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        url = "/api/v1/vouchers/UNKNOWNVOUCHER12"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestRefillVoucherDetailAPI:
    """
    Integration tests for GET /api/v1/refill-requests/{refill_request_id}/voucher
    """

    def test_get_voucher_by_refill_request_id_success(
        self,
        auth_client: APIClient,
        refill_approved: RefillRequest,
    ) -> None:
        voucher = voucher_issue_for_refill(refill_request=refill_approved)

        url = f"/api/v1/refill-requests/{refill_approved.id}/voucher"
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(voucher.id)
        assert data["voucher_code"] == voucher.voucher_code
        assert data["medication_name"] == "Amlodipine"

    def test_get_voucher_nonexistent_refill_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        import uuid
        fake_id = uuid.uuid4()
        url = f"/api/v1/refill-requests/{fake_id}/voucher"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestEndToEndApprovalToDispensingLifecycle:
    """
    End-to-end integration test: Clinician approval triggers automated voucher issuance,
    followed by POS verification and medication dispensing.
    """

    def test_clinician_approval_auto_generates_voucher_and_allows_pos_redemption(
        self,
        auth_client: APIClient,
        patient: Patient,
        prescription: PatientPrescription,
    ) -> None:
        from apps.adjudications.services import adjudication_submit

        # Refill intake needing review
        refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.NEEDS_REVIEW,
        )

        # 1. Clinician adjudicates APPROVE
        import uuid
        reviewer_id = uuid.uuid4()
        adjudication_submit(
            refill_request_id=refill.id,
            reviewer_user_id=reviewer_id,
            decision="APPROVE",
            clinical_notes="Clinician reviewed lab telemetry and approved clearance.",
        )

        refill.refresh_from_db()
        assert refill.status == RefillStatus.APPROVED

        # 2. Verify voucher was automatically generated
        voucher = PharmacyVoucher.objects.get(refill_request=refill)
        assert voucher.status == VoucherStatus.ACTIVE

        # 3. Lookup voucher at pharmacy POS
        lookup_res = auth_client.get(f"/api/v1/vouchers/{voucher.voucher_code}")
        assert lookup_res.status_code == status.HTTP_200_OK
        assert lookup_res.json()["status"] == "ACTIVE"

        # 4. Dispense medication at POS
        redeem_res = auth_client.post(
            "/api/v1/vouchers/redeem",
            {
                "voucher_code": voucher.voucher_code,
                "national_id": patient.national_id,
                "dispensing_pharmacy_id": "EGY-PHARM-HQ-01",
            },
            format="json",
        )
        assert redeem_res.status_code == status.HTTP_200_OK
        assert redeem_res.json()["status"] == "DISPENSED"

        # 5. Verify prescription last_dispensed_at is updated
        prescription.refresh_from_db()
        assert prescription.last_dispensed_at is not None
