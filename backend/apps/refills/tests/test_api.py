from datetime import timedelta
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client() -> APIClient:
    user = User.objects.create_user(username="clinicaldoctor", password="securepassword123")
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
        medication_name="Metformin",
        dosage="500mg daily",
        refill_interval_days=30,
        is_active=True,
    )


class TestRefillAPI:
    def test_create_refill_request_success(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        payload = {
            "patient_id": str(patient.id),
            "prescription_id": str(prescription.id),
            "missed_doses_past_week": 0,
            "has_severe_symptoms": False,
        }
        response = auth_client.post("/api/v1/refill-requests/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["patient_id"] == str(patient.id)
        assert data["prescription_id"] == str(prescription.id)
        assert data["status"] == RefillStatus.SUBMITTED

    def test_create_refill_request_premature_returns_422(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        # Dispensed 10 days ago (< 25 days)
        prescription.last_dispensed_at = timezone.now() - timedelta(days=10)
        prescription.save(update_fields=["last_dispensed_at"])

        payload = {
            "patient_id": str(patient.id),
            "prescription_id": str(prescription.id),
        }
        response = auth_client.post("/api/v1/refill-requests/", payload, format="json")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        data = response.json()
        assert data["code"] == "early_refill_blocked"

    def test_get_refill_request_detail(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )

        response = auth_client.get(f"/api/v1/refill-requests/{refill_req.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(refill_req.id)
        assert data["status"] == RefillStatus.SUBMITTED

    def test_create_refill_request_requires_auth(self, patient: Patient, prescription: PatientPrescription) -> None:
        client = APIClient()
        payload = {
            "patient_id": str(patient.id),
            "prescription_id": str(prescription.id),
        }
        response = client.post("/api/v1/refill-requests/", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_duplicate_pending_refill_rejected(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.NEEDS_REVIEW,
        )
        payload = {
            "patient_id": str(patient.id),
            "prescription_id": str(prescription.id),
        }
        response = auth_client.post("/api/v1/refill-requests/", payload, format="json")
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["code"] == "refill_request_pending_conflict"