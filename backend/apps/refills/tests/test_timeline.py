from datetime import timedelta
import pytest
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillStatus
from apps.refills.services import refill_request_create

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
def other_patient() -> Patient:
    return Patient.objects.create(
        national_id="29505150204567",
        full_name="Sara Youssef",
        phone_number="+201112223334",
        baseline_systolic=115,
        baseline_diastolic=75,
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


class TestEarlyRefillTimelineGuardrail:
    def test_initial_refill_allowed_when_last_dispensed_at_is_none(
        self, patient: Patient, prescription: PatientPrescription
    ) -> None:
        assert prescription.last_dispensed_at is None

        refill_req = refill_request_create(
            patient_id=patient.id,
            prescription_id=prescription.id,
            missed_doses_past_week=1,
            has_severe_symptoms=False,
        )
        assert refill_req.id is not None
        assert refill_req.status == RefillStatus.SUBMITTED
        assert refill_req.missed_doses_past_week == 1

    def test_refill_rejected_at_exactly_24_days(
        self, patient: Patient, prescription: PatientPrescription
    ) -> None:
        now = timezone.now()
        prescription.last_dispensed_at = now - timedelta(days=24)
        prescription.save(update_fields=["last_dispensed_at"])

        with pytest.raises(ApplicationError) as exc:
            refill_request_create(
                patient_id=patient.id,
                prescription_id=prescription.id,
            )
        assert exc.value.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert exc.value.code == "early_refill_blocked"
        assert "Earliest allowable submission date" in str(exc.value)

    def test_refill_rejected_at_24_days_23_hours(
        self, patient: Patient, prescription: PatientPrescription
    ) -> None:
        now = timezone.now()
        prescription.last_dispensed_at = now - timedelta(days=24, hours=23)
        prescription.save(update_fields=["last_dispensed_at"])

        with pytest.raises(ApplicationError) as exc:
            refill_request_create(
                patient_id=patient.id,
                prescription_id=prescription.id,
            )
        assert exc.value.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert exc.value.code == "early_refill_blocked"

    def test_refill_allowed_at_exactly_25_days(
        self, patient: Patient, prescription: PatientPrescription
    ) -> None:
        now = timezone.now()
        prescription.last_dispensed_at = now - timedelta(days=25, seconds=5)
        prescription.save(update_fields=["last_dispensed_at"])

        refill_req = refill_request_create(
            patient_id=patient.id,
            prescription_id=prescription.id,
        )
        assert refill_req.id is not None
        assert refill_req.status == RefillStatus.SUBMITTED

    def test_cross_patient_mismatch_rejected(
        self, patient: Patient, other_patient: Patient, prescription: PatientPrescription
    ) -> None:
        # Prescription belongs to 'patient', but request is submitted for 'other_patient'
        with pytest.raises(ApplicationError) as exc:
            refill_request_create(
                patient_id=other_patient.id,
                prescription_id=prescription.id,
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "prescription_patient_mismatch"

    def test_inactive_prescription_rejected(
        self, patient: Patient, prescription: PatientPrescription
    ) -> None:
        prescription.is_active = False
        prescription.save(update_fields=["is_active"])

        with pytest.raises(ApplicationError) as exc:
            refill_request_create(
                patient_id=patient.id,
                prescription_id=prescription.id,
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "prescription_inactive"
