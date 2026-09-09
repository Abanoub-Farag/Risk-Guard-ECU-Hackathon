import datetime
import uuid
from datetime import timedelta
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import DeviceScan, DeviceType, RefillRequest, RefillStatus
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

    refill_request = RefillRequest.objects.create(
        patient=patient,
        prescription=prescription,
        status=RefillStatus.SUBMITTED,
        missed_doses_past_week=missed_doses_past_week,
        has_severe_symptoms=has_severe_symptoms,
    )

    return refill_request


@transaction.atomic
def device_scan_create(
    *,
    refill_request: RefillRequest,
    device_type: str,
    uploaded_file: UploadedFile,
    storage_service: ObjectStorageService | None = None,
) -> DeviceScan:
    """
    Validates screen capture payload, persists binary to sovereign storage,
    and links the resulting DeviceScan to the refill request.
    """
    if device_type not in DeviceType.values:
        raise ApplicationError(
            message=f"Invalid device type '{device_type}'. Allowed: {DeviceType.values}",
            code="invalid_device_type",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    storage = storage_service or ObjectStorageService()
    image_storage_uri = storage.store_file(
        patient_id=refill_request.patient_id,
        refill_request_id=refill_request.id,
        uploaded_file=uploaded_file,
    )

    scan = DeviceScan.objects.create(
        refill_request=refill_request,
        device_type=device_type,
        image_storage_uri=image_storage_uri,
    )

    return scan


@transaction.atomic
def refill_request_submit_for_review(
    *,
    refill_request: RefillRequest,
) -> RefillRequest:
    """
    Transitions refill request into the verification pipeline.
    Blocks if no device scans have been ingested for this intake.
    """
    scan_count = refill_request.scans.count()
    if scan_count < 1:
        raise ApplicationError(
            message="Cannot submit refill request for review without at least one device screen capture scan.",
            code="missing_device_scans",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    refill_request.status = RefillStatus.NEEDS_REVIEW
    refill_request.save(update_fields=["status", "updated_at"])
    return refill_request
