from decimal import Decimal
import pytest
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.patients.services import (
    patient_create,
    prescription_create,
    prescription_deactivate,
    prescription_dispense,
)

pytestmark = pytest.mark.django_db


class TestPatientServices:
    def test_patient_create_success(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ahmed Mahmoud",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
            baseline_glucose=Decimal("95.50"),
        )
        assert patient.id is not None
        assert patient.national_id == "29001010101234"
        assert patient.full_name == "Ahmed Mahmoud"
        assert patient.baseline_systolic == 120
        assert patient.baseline_diastolic == 80
        assert patient.baseline_glucose == Decimal("95.50")

    def test_duplicate_national_id_raises_conflict(self) -> None:
        patient_create(
            national_id="29001010101234",
            full_name="First Patient",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
        )

        with pytest.raises(ApplicationError) as exc:
            patient_create(
                national_id="29001010101234",
                full_name="Second Patient",
                phone_number="+201009999999",
                baseline_systolic=130,
                baseline_diastolic=85,
            )
        assert exc.value.status_code == status.HTTP_409_CONFLICT
        assert exc.value.code == "patient_national_id_conflict"


class TestPrescriptionServices:
    def test_prescription_create_success(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ahmed Mahmoud",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
        )

        rx = prescription_create(
            patient=patient,
            medication_name="Metformin",
            dosage="500mg daily",
            refill_interval_days=30,
        )
        assert rx.id is not None
        assert rx.patient == patient
        assert rx.medication_name == "Metformin"
        assert rx.is_active is True
        assert rx.last_dispensed_at is None

    def test_duplicate_active_prescription_case_insensitive_raises_conflict(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ahmed Mahmoud",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
        )

        prescription_create(
            patient=patient,
            medication_name="Metformin",
            dosage="500mg daily",
        )

        # Attempt duplicate with different casing
        with pytest.raises(ApplicationError) as exc:
            prescription_create(
                patient=patient,
                medication_name="metformin",
                dosage="1000mg daily",
            )
        assert exc.value.status_code == status.HTTP_409_CONFLICT
        assert exc.value.code == "active_prescription_conflict"

    def test_create_prescription_after_deactivation_succeeds(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ahmed Mahmoud",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
        )

        rx1 = prescription_create(
            patient=patient,
            medication_name="Amlodipine",
            dosage="5mg daily",
        )
        prescription_deactivate(prescription=rx1)
        rx1.refresh_from_db()
        assert rx1.is_active is False

        # Creating another prescription for same medication now succeeds
        rx2 = prescription_create(
            patient=patient,
            medication_name="Amlodipine",
            dosage="10mg daily",
        )
        assert rx2.id != rx1.id
        assert rx2.is_active is True

    def test_prescription_dispense_updates_timestamp(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ahmed Mahmoud",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
        )
        rx = prescription_create(
            patient=patient,
            medication_name="Lisinopril",
            dosage="10mg daily",
        )
        assert rx.last_dispensed_at is None

        dispensed_rx = prescription_dispense(prescription=rx)
        assert dispensed_rx.last_dispensed_at is not None

    def test_dispense_inactive_prescription_raises_bad_request(self) -> None:
        patient = patient_create(
            national_id="29001010101234",
            full_name="Ahmed Mahmoud",
            phone_number="+201001234567",
            baseline_systolic=120,
            baseline_diastolic=80,
        )
        rx = prescription_create(
            patient=patient,
            medication_name="Lisinopril",
            dosage="10mg daily",
        )
        prescription_deactivate(prescription=rx)

        with pytest.raises(ApplicationError) as exc:
            prescription_dispense(prescription=rx)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "prescription_inactive"
