from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from apps.patients.models import Patient, PatientPrescription
from apps.patients.services import patient_create, prescription_create

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client() -> APIClient:
    user = User.objects.create_user(username="testdoctor", password="password123456")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestPatientAPI:
    def test_create_patient_success(self, auth_client: APIClient) -> None:
        payload = {
            "national_id": "29505150101234",
            "full_name": "Fatima Mostafa",
            "phone_number": "+201234567890",
            "baseline_systolic": 130,
            "baseline_diastolic": 85,
            "baseline_glucose": "110.50",
        }
        response = auth_client.post("/api/v1/patients/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["national_id"] == "29505150101234"
        assert data["full_name"] == "Fatima Mostafa"
        assert data["baseline_systolic"] == 130
        assert data["baseline_diastolic"] == 85
        assert data["baseline_glucose"] == "110.50"
        assert data["active_prescriptions"] == []

    def test_create_patient_invalid_national_id_returns_400(self, auth_client: APIClient) -> None:
        payload = {
            "national_id": "2950515010123",  # 13 digits
            "full_name": "Fatima Mostafa",
            "phone_number": "+201234567890",
            "baseline_systolic": 130,
            "baseline_diastolic": 85,
        }
        response = auth_client.post("/api/v1/patients/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_patient_invalid_blood_pressure_returns_400(self, auth_client: APIClient) -> None:
        payload = {
            "national_id": "29505150101234",
            "full_name": "Fatima Mostafa",
            "phone_number": "+201234567890",
            "baseline_systolic": 80,
            "baseline_diastolic": 120,  # Systolic < diastolic
        }
        response = auth_client.post("/api/v1/patients/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_duplicate_patient_returns_409(self, auth_client: APIClient) -> None:
        payload = {
            "national_id": "29505150101234",
            "full_name": "Fatima Mostafa",
            "phone_number": "+201234567890",
            "baseline_systolic": 130,
            "baseline_diastolic": 85,
        }
        first_resp = auth_client.post("/api/v1/patients/", payload, format="json")
        assert first_resp.status_code == status.HTTP_201_CREATED

        second_resp = auth_client.post("/api/v1/patients/", payload, format="json")
        assert second_resp.status_code == status.HTTP_409_CONFLICT
        assert second_resp.json()["code"] == "patient_national_id_conflict"

    def test_get_patient_details_with_active_prescriptions(self, auth_client: APIClient) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ali Hassan",
            phone_number="+201112223334",
            baseline_systolic=125,
            baseline_diastolic=82,
        )
        rx1 = prescription_create(
            patient=patient,
            medication_name="Metformin",
            dosage="850mg twice daily",
        )
        rx2 = prescription_create(
            patient=patient,
            medication_name="Atorvastatin",
            dosage="20mg bedtime",
        )
        # Inactive prescription
        rx3 = prescription_create(
            patient=patient,
            medication_name="OldMed",
            dosage="10mg",
        )
        rx3.is_active = False
        rx3.save()

        response = auth_client.get(f"/api/v1/patients/{patient.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(patient.id)
        assert len(data["active_prescriptions"]) == 2
        med_names = [p["medication_name"] for p in data["active_prescriptions"]]
        assert "Metformin" in med_names
        assert "Atorvastatin" in med_names
        assert "OldMed" not in med_names


class TestPrescriptionAPI:
    def test_create_prescription_success(self, auth_client: APIClient) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ali Hassan",
            phone_number="+201112223334",
            baseline_systolic=125,
            baseline_diastolic=82,
        )
        payload = {
            "medication_name": "Glimepiride",
            "dosage": "2mg morning",
            "refill_interval_days": 30,
        }
        response = auth_client.post(
            f"/api/v1/patients/{patient.id}/prescriptions/",
            payload,
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["medication_name"] == "Glimepiride"
        assert data["dosage"] == "2mg morning"
        assert data["is_active"] is True

    def test_duplicate_active_prescription_returns_409(self, auth_client: APIClient) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ali Hassan",
            phone_number="+201112223334",
            baseline_systolic=125,
            baseline_diastolic=82,
        )
        payload = {
            "medication_name": "Glimepiride",
            "dosage": "2mg morning",
        }
        first_resp = auth_client.post(
            f"/api/v1/patients/{patient.id}/prescriptions/",
            payload,
            format="json",
        )
        assert first_resp.status_code == status.HTTP_201_CREATED

        # Duplicate attempt (case-insensitive)
        payload_dup = {
            "medication_name": "glimepiride",
            "dosage": "4mg morning",
        }
        second_resp = auth_client.post(
            f"/api/v1/patients/{patient.id}/prescriptions/",
            payload_dup,
            format="json",
        )
        assert second_resp.status_code == status.HTTP_409_CONFLICT
        assert second_resp.json()["code"] == "active_prescription_conflict"

    def test_deactivate_prescription(self, auth_client: APIClient) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ali Hassan",
            phone_number="+201112223334",
            baseline_systolic=125,
            baseline_diastolic=82,
        )
        rx = prescription_create(
            patient=patient,
            medication_name="Losartan",
            dosage="50mg daily",
        )
        response = auth_client.patch(f"/api/v1/prescriptions/{rx.id}/deactivate/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_active"] is False

    def test_dispense_prescription(self, auth_client: APIClient) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ali Hassan",
            phone_number="+201112223334",
            baseline_systolic=125,
            baseline_diastolic=82,
        )
        rx = prescription_create(
            patient=patient,
            medication_name="Losartan",
            dosage="50mg daily",
        )
        response = auth_client.post(f"/api/v1/prescriptions/{rx.id}/dispense/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["last_dispensed_at"] is not None


class TestDatabaseIntegrityAndDecommissioning:
    def test_cascade_delete_patient_removes_prescriptions(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ali Hassan",
            phone_number="+201112223334",
            baseline_systolic=125,
            baseline_diastolic=82,
        )
        rx = prescription_create(
            patient=patient,
            medication_name="Metformin",
            dosage="500mg",
        )
        rx_id = rx.id
        # Hard delete patient
        patient.hard_delete()
        assert not Patient.objects.filter(id=patient.id).exists()
        assert not PatientPrescription.objects.filter(id=rx_id).exists()

    def test_legacy_orders_routes_return_404(self, auth_client: APIClient) -> None:
        response = auth_client.get("/api/v1/orders/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

        response_post = auth_client.post("/api/v1/orders/", {}, format="json")
        assert response_post.status_code == status.HTTP_404_NOT_FOUND
