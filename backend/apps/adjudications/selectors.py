from uuid import UUID
from django.db.models import Case, IntegerField, QuerySet, Value, When
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.adjudications.models import ManualAdjudication
from apps.refills.models import RefillRequest, RefillStatus
from apps.triage.models import TriageColor


def adjudication_queue_list(
    *,
    triage_color: str | None = None,
) -> QuerySet[RefillRequest]:
    """
    Retrieves the clinical adjudication exception queue for claims in NEEDS_REVIEW.
    Sorts by urgency: prioritizes RED (1) over YELLOW (2), ordered by submitted_at ASC (FIFO).
    Optionally filters by triage color.
    """
    queryset = (
        RefillRequest.objects.filter(status=RefillStatus.NEEDS_REVIEW)
        .select_related("patient", "prescription", "triage_record")
        .prefetch_related("telemetry_records")
        .annotate(
            urgency_priority=Case(
                When(triage_record__triage_color=TriageColor.RED, then=Value(1)),
                When(triage_record__triage_color=TriageColor.YELLOW, then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            )
        )
        .order_by("urgency_priority", "submitted_at")
    )

    if triage_color:
        queryset = queryset.filter(triage_record__triage_color=triage_color.upper())

    return queryset


def adjudication_claim_detail(*, refill_request_id: UUID) -> RefillRequest:
    """
    Retrieves a single refill claim with all associated clinical, telemetry,
    and intake metadata eagerly loaded.
    """
    try:
        return (
            RefillRequest.objects.select_related("patient", "prescription", "triage_record")
            .prefetch_related("telemetry_records")
            .get(id=refill_request_id)
        )
    except RefillRequest.DoesNotExist:
        raise ApplicationError(
            message=f"Refill claim '{refill_request_id}' not found.",
            code="claim_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


def manual_adjudication_get_for_refill(*, refill_request_id: UUID) -> ManualAdjudication | None:
    """
    Retrieves any manual adjudication record already recorded for a refill request.
    """
    return ManualAdjudication.objects.filter(refill_request_id=refill_request_id).first()
