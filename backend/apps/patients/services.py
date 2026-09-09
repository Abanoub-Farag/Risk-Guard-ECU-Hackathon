from decimal import Decimal
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.patients.models import Patient, PatientPrescription
from apps.patients.validators import (
    validate_baseline_glucose,
    validate_blood_pressure,
    validate_egyptian_national_id,
)


@transaction.atomic
def patient_create(
    *,
    national_id: str,
    full_name: str,
    phone_number: str,
    baseline_systolic: int,
    baseline_diastolic: int,
    baseline_glucose: Decimal | None = None,
) -> Patient:
    """
    Registers a new chronic patient with baseline biometrics.
    Enforces National ID validity, blood pressure invariants, and uniqueness.
    """
    national_id = national_id.strip()
    full_name = full_name.strip()
    phone_number = phone_number.strip()

    validate_egyptian_national_id(national_id)
    validate_blood_pressure(baseline_systolic, baseline_diastolic)
    validate_baseline_glucose(baseline_glucose)

    if Patient.objects.filter(national_id=national_id).exists():
        raise ApplicationError(
            message=f"A patient with National ID '{national_id}' is already registered.",
            code="patient_national_id_conflict",
            status_code=status.HTTP_409_CONFLICT,
        )

    try:
        patient = Patient.objects.create(
            national_id=national_id,
            full_name=full_name,
            phone_number=phone_number,
            baseline_systolic=baseline_systolic,
            baseline_diastolic=baseline_diastolic,
            baseline_glucose=baseline_glucose,
        )
    except IntegrityError as exc:
        raise ApplicationError(
            message=f"A patient with National ID '{national_id}' is already registered.",
            code="patient_national_id_conflict",
            status_code=status.HTTP_409_CONFLICT,
        ) from exc

    return patient


@transaction.atomic
def prescription_create(
    *,
    patient: Patient,
    medication_name: str,
    dosage: str,
    refill_interval_days: int = 30,
) -> PatientPrescription:
    """
    Adds a new active prescription for a chronic patient.
    Guards against duplicate active medications via pre-check and database partial index catch.
    """
    medication_name = medication_name.strip()
    dosage = dosage.strip()

    if not medication_name:
        raise ApplicationError(
            message="Medication name cannot be empty.",
            code="invalid_medication_name",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not dosage:
        raise ApplicationError(
            message="Dosage cannot be empty.",
            code="invalid_dosage",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if refill_interval_days <= 0:
        raise ApplicationError(
            message="Refill interval days must be strictly greater than zero.",
            code="invalid_refill_interval",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    active_exists = PatientPrescription.objects.filter(
        patient=patient,
        medication_name__iexact=medication_name,
        is_active=True,
    ).exists()

    if active_exists:
        raise ApplicationError(
            message=f"An active prescription for '{medication_name}' already exists for this patient.",
            code="active_prescription_conflict",
            status_code=status.HTTP_409_CONFLICT,
        )

    try:
        with transaction.atomic():
            prescription = PatientPrescription.objects.create(
                patient=patient,
                medication_name=medication_name,
                dosage=dosage,
                refill_interval_days=refill_interval_days,
                is_active=True,
            )
    except IntegrityError as exc:
        raise ApplicationError(
            message=f"An active prescription for '{medication_name}' already exists for this patient.",
            code="active_prescription_conflict",
            status_code=status.HTTP_409_CONFLICT,
        ) from exc

    return prescription


@transaction.atomic
def prescription_deactivate(
    *,
    prescription: PatientPrescription,
) -> PatientPrescription:
    """
    Safely transitions a prescription to inactive status.
    """
    prescription.is_active = False
    prescription.save(update_fields=["is_active", "updated_at"])
    return prescription


@transaction.atomic
def prescription_dispense(
    *,
    prescription: PatientPrescription,
) -> PatientPrescription:
    """
    Records a dispensation event by updating last_dispensed_at to the current system timestamp.
    """
    if not prescription.is_active:
        raise ApplicationError(
            message="Cannot dispense an inactive prescription.",
            code="prescription_inactive",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    prescription.last_dispensed_at = timezone.now()
    prescription.save(update_fields=["last_dispensed_at", "updated_at"])
    return prescription
