from datetime import timedelta
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import DeviceScan, DeviceType, RefillRequest, RefillStatus

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
        assert data["scans"] == []

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

    def test_upload_device_scan_success(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )
        jpeg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01" + b"\x00" * 50
        image_file = SimpleUploadedFile("bp_screen.jpg", jpeg_content, content_type="image/jpeg")

        payload = {
            "device_type": DeviceType.BLOOD_PRESSURE,
            "file": image_file,
        }
        response = auth_client.post(
            f"/api/v1/refill-requests/{refill_req.id}/scans/",
            payload,
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["refill_request_id"] == str(refill_req.id)
        assert data["device_type"] == DeviceType.BLOOD_PRESSURE
        assert "sovereign://" in data["image_storage_uri"]

    def test_upload_device_scan_spoofed_file_returns_415(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )
        fake_file = SimpleUploadedFile("fake.jpg", b"This is plain text not an image", content_type="image/jpeg")
        payload = {
            "device_type": DeviceType.GLUCOMETER,
            "file": fake_file,
        }
        response = auth_client.post(
            f"/api/v1/refill-requests/{refill_req.id}/scans/",
            payload,
            format="multipart",
        )
        assert response.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    def test_get_refill_request_detail_with_scans(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )
        DeviceScan.objects.create(
            refill_request=refill_req,
            device_type=DeviceType.GLUCOMETER,
            image_storage_uri="sovereign://bucket/region/scans/p/r/1.png",
        )

        response = auth_client.get(f"/api/v1/refill-requests/{refill_req.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(refill_req.id)
        assert len(data["scans"]) == 1
        assert data["scans"][0]["device_type"] == DeviceType.GLUCOMETER

    def test_submit_for_review_without_scans_rejected(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )
        assert refill_req.scans.count() == 0

        response = auth_client.post(f"/api/v1/refill-requests/{refill_req.id}/submit-for-review/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["code"] == "missing_device_scans"

    def test_submit_for_review_with_scans_succeeds(
        self, auth_client: APIClient, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )
        DeviceScan.objects.create(
            refill_request=refill_req,
            device_type=DeviceType.BLOOD_PRESSURE,
            image_storage_uri="sovereign://bucket/region/scans/p/r/2.jpg",
        )

        response = auth_client.post(f"/api/v1/refill-requests/{refill_req.id}/submit-for-review/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == RefillStatus.NEEDS_REVIEW

    def test_cascade_delete_refill_purges_scans(
        self, patient: Patient, prescription: PatientPrescription
    ) -> None:
        refill_req = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
        )
        scan = DeviceScan.objects.create(
            refill_request=refill_req,
            device_type=DeviceType.BLOOD_PRESSURE,
            image_storage_uri="sovereign://bucket/region/scans/p/r/3.jpg",
        )
        scan_id = scan.id
        refill_req.hard_delete()

        assert not RefillRequest.objects.filter(id=refill_req.id).exists()
        assert not DeviceScan.objects.filter(id=scan_id).exists()
