import uuid
from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus
from apps.triage.models import AnomalyReason, TriageColor, TriageRecord

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client() -> APIClient:
    user = User.objects.create_user(username="triage_officer", password="password123")
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
def refill_request(patient: Patient, prescription: PatientPrescription) -> RefillRequest:
    return RefillRequest.objects.create(
        patient=patient,
        prescription=prescription,
        status=RefillStatus.SUBMITTED,
        has_severe_symptoms=False,
    )


class TestProcessIntakeAPI:
    """
    Integration tests for POST /api/v1/refill-requests/{refill_id}/process-intake/
    """

    def test_full_lifecycle_process_intake_success(
        self,
        auth_client: APIClient,
        refill_request: RefillRequest,
    ) -> None:
        url = f"/api/v1/refill-requests/{refill_request.id}/process-intake/"
        payload = {
            "systolic": 125,
            "diastolic": 82,
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["refill_request_id"] == str(refill_request.id)
        assert data["triage_color"] == TriageColor.GREEN
        assert data["anomaly_reason"] is None
        assert data["refill_request_status"] == RefillStatus.APPROVED
        assert data["telemetry"] is not None
        assert data["telemetry"]["systolic"] == 125
        assert data["telemetry"]["diastolic"] == 82

        # Database state verification
        refill_request.refresh_from_db()
        assert refill_request.status == RefillStatus.APPROVED
        assert TriageRecord.objects.filter(refill_request=refill_request).count() == 1

    def test_process_intake_idempotency_and_1_to_1_constraint(
        self,
        auth_client: APIClient,
        refill_request: RefillRequest,
    ) -> None:
        url = f"/api/v1/refill-requests/{refill_request.id}/process-intake/"
        # First call succeeds
        res1 = auth_client.post(url, {"systolic": 120, "diastolic": 80}, format="json")
        assert res1.status_code == status.HTTP_201_CREATED

        # Second call yields 409 Conflict (idempotency guard)
        res2 = auth_client.post(url, {"systolic": 120, "diastolic": 80}, format="json")
        assert res2.status_code == status.HTTP_409_CONFLICT
        assert res2.json()["code"] == "triage_record_conflict"

        # Direct DB level unique constraint verification
        with pytest.raises(IntegrityError):
            TriageRecord.objects.create(
                refill_request=refill_request,
                triage_color=TriageColor.RED,
            )

    def test_process_intake_missing_fields_returns_400(
        self,
        auth_client: APIClient,
        refill_request: RefillRequest,
    ) -> None:
        url = f"/api/v1/refill-requests/{refill_request.id}/process-intake/"
        response = auth_client.post(url, {"systolic": 120}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_process_intake_nonexistent_refill_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        fake_id = uuid.uuid4()
        url = f"/api/v1/refill-requests/{fake_id}/process-intake/"
        response = auth_client.post(url, {"systolic": 120, "diastolic": 80}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestTriageDetailAPI:
    """
    Integration tests for GET /api/v1/refill-requests/{refill_id}/triage
    """

    def test_get_triage_detail_success(
        self,
        auth_client: APIClient,
        refill_request: RefillRequest,
    ) -> None:
        # Seed triage record
        TriageRecord.objects.create(
            refill_request=refill_request,
            triage_color=TriageColor.YELLOW,
            anomaly_reason=AnomalyReason.CLINICAL_VARIANCE_EXCEEDED,
        )

        url = f"/api/v1/refill-requests/{refill_request.id}/triage"
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["refill_request_id"] == str(refill_request.id)
        assert data["triage_color"] == TriageColor.YELLOW
        assert data["anomaly_reason"] == AnomalyReason.CLINICAL_VARIANCE_EXCEEDED

    def test_get_triage_detail_not_triaged_returns_404(
        self,
        auth_client: APIClient,
        refill_request: RefillRequest,
    ) -> None:
        url = f"/api/v1/refill-requests/{refill_request.id}/triage"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["code"] == "triage_record_not_found"

    def test_get_triage_detail_nonexistent_refill_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        fake_id = uuid.uuid4()
        url = f"/api/v1/refill-requests/{fake_id}/triage"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
