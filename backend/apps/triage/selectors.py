from uuid import UUID
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.triage.models import IntakeTelemetry, TriageRecord


def triage_record_get_by_refill_id(refill_id: UUID) -> TriageRecord:
    """
    Retrieves the clinical triage determination record associated with a refill request.
    """
    try:
        return (
            TriageRecord.objects.select_related("refill_request", "refill_request__patient")
            .get(refill_request_id=refill_id)
        )
    except TriageRecord.DoesNotExist:
        raise ApplicationError(
            message=f"Triage record for refill request '{refill_id}' not found.",
            code="triage_record_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


def intake_telemetry_get_latest_for_refill(refill_id: UUID) -> IntakeTelemetry | None:
    """
    Fetches the most recently submitted telemetry record for a refill request.
    """
    return (
        IntakeTelemetry.objects.filter(refill_request_id=refill_id)
        .order_by("-processed_at")
        .first()
    )


def intake_telemetry_get_previous_for_patient(
    patient_id: UUID,
    exclude_refill_id: UUID,
) -> IntakeTelemetry | None:
    """
    Fetches the immediately preceding telemetry record for the same patient
    across previous refill requests, ordered by processed_at DESC.
    """
    return (
        IntakeTelemetry.objects.filter(refill_request__patient_id=patient_id)
        .exclude(refill_request_id=exclude_refill_id)
        .order_by("-processed_at")
        .first()
    )
