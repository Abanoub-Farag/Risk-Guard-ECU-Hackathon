import datetime
import uuid
from datetime import timedelta
from django.core.files.uploadedfile import UploadedFile
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus
from apps.refills.storage import ObjectStorageService


@transaction.atomic
def refill_request_create(
    *,
    patient_id: uuid.UUID | str,
    prescription_id: uuid.UUID | str,
    missed_doses_past_week: int = 0,
    has_severe_symptoms: bool = False,
) -> RefillRequest:
    """
    Evaluates prescription eligibility, enforces the 25-day early refill blocker,
    and initiates the refill intake request.
    """
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        raise ApplicationError(
            message=f"Patient with ID '{patient_id}' does not exist.",
            code="patient_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    try:
        prescription = PatientPrescription.objects.get(id=prescription_id)
    except PatientPrescription.DoesNotExist:
        raise ApplicationError(
            message=f"Prescription with ID '{prescription_id}' does not exist.",
            code="prescription_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # Invariant: Prescription must belong to the specified patient
    if str(prescription.patient_id) != str(patient.id):
        raise ApplicationError(
            message=f"Prescription '{prescription_id}' does not belong to patient '{patient_id}'.",
            code="prescription_patient_mismatch",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Invariant: Prescription must be active
    if not prescription.is_active:
        raise ApplicationError(
            message="Cannot request refill for an inactive prescription.",
            code="prescription_inactive",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Invariant: 25-day Early Refill Blocker
    if prescription.last_dispensed_at is not None:
        earliest_allowable_date = prescription.last_dispensed_at + timedelta(days=25)
        current_time = timezone.now()

        if current_time < earliest_allowable_date:
            raise ApplicationError(
                message=(
                    f"Early refill request blocked. Current interval is less than 25 days. "
                    f"Earliest allowable submission date: {earliest_allowable_date.isoformat()}."
                ),
                code="early_refill_blocked",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

    if missed_doses_past_week < 0:
        raise ApplicationError(
            message="Missed doses past week must be a non-negative integer.",
            code="invalid_missed_doses",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        refill_request = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.SUBMITTED,
            missed_doses_past_week=missed_doses_past_week,
            has_severe_symptoms=has_severe_symptoms,
        )
    except IntegrityError as exc:
        raise ApplicationError(
            message=f"An active refill request is already pending for prescription '{prescription_id}'.",
            code="refill_request_pending_conflict",
            status_code=status.HTTP_409_CONFLICT,
        ) from exc

    return refill_request





@transaction.atomic
def refill_request_update_status(
    *,
    refill_request: RefillRequest,
    new_status: str,
) -> RefillRequest:
    """
    Centralized state transition function for refill requests.
    Validates status and updates atomically.
    """
    if new_status not in RefillStatus.values:
        raise ApplicationError(
            message=f"Invalid refill status '{new_status}'.",
            code="invalid_refill_status",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    refill_request.status = new_status
    refill_request.save(update_fields=["status", "updated_at"])
    return refill_request
