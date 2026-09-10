import uuid
from django.db.models import QuerySet
from apps.refills.models import RefillRequest


def refill_request_get_by_id(*, refill_id: uuid.UUID | str) -> RefillRequest | None:
    """
    Retrieves a single refill request with patient, prescription, and all attached
    scans prefetched to avoid N+1 query overhead.
    """
    try:
        return (
            RefillRequest.objects.select_related("patient", "prescription")
            .get(id=refill_id)
        )
    except RefillRequest.DoesNotExist:
        return None


def refill_request_list_for_patient(
    *,
    patient_id: uuid.UUID | str,
    status: str | None = None,
) -> QuerySet[RefillRequest]:
    """
    Retrieves an optimized QuerySet of refill requests for a patient.
    """
    queryset = (
        RefillRequest.objects.filter(patient_id=patient_id)
        .select_related("prescription")
        .order_by("-submitted_at")
    )
    if status:
        queryset = queryset.filter(status=status)
    return queryset



