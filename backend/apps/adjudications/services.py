from uuid import UUID
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.adjudications.models import (
    AdjudicationDecision,
    ManualAdjudication,
)
from apps.refills.models import RefillRequest, RefillStatus


@transaction.atomic
def adjudication_submit(
    *,
    refill_request_id: UUID,
    reviewer_user_id: UUID,
    decision: str,
    clinical_notes: str,
    rejection_reason_category: str | None = None,
) -> ManualAdjudication:
    """
    Submits a human clinician review decision for a flagged refill request.
    Enforces human terminal authority, clinical justifications, eligibility,
    and executes atomic state transitions.
    """
    try:
        refill_request = RefillRequest.objects.select_for_update().get(id=refill_request_id)
    except RefillRequest.DoesNotExist:
        raise ApplicationError(
            message=f"Refill request '{refill_request_id}' not found.",
            code="refill_request_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # 1:1 Adjudication Invariant Check
    if (
        hasattr(refill_request, "manual_adjudication")
        or ManualAdjudication.objects.filter(refill_request=refill_request).exists()
    ):
        raise ApplicationError(
            message=f"Refill request '{refill_request_id}' has already been adjudicated.",
            code="adjudication_already_exists",
            status_code=status.HTTP_409_CONFLICT,
        )

    # Eligibility Check: Only claims in NEEDS_REVIEW may be adjudicated
    if refill_request.status != RefillStatus.NEEDS_REVIEW:
        raise ApplicationError(
            message=(
                f"Refill request '{refill_request_id}' with status '{refill_request.status}' "
                "cannot be adjudicated. Only requests in 'NEEDS_REVIEW' are eligible."
            ),
            code="invalid_refill_status_for_adjudication",
            status_code=status.HTTP_409_CONFLICT,
        )

    # Validate decision value
    if decision not in AdjudicationDecision.values:
        raise ApplicationError(
            message=f"Invalid decision '{decision}'. Must be 'APPROVE' or 'REJECT'.",
            code="invalid_adjudication_decision",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Validate clinical notes
    cleaned_notes = clinical_notes.strip() if clinical_notes else ""
    if not cleaned_notes or len(cleaned_notes) < 10:
        raise ApplicationError(
            message="Substantive clinical justification is mandatory (minimum 10 characters).",
            code="insufficient_clinical_notes",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Rejection Justification Enforcement
    category: str | None = None
    if decision == AdjudicationDecision.REJECT:
        if not rejection_reason_category or not rejection_reason_category.strip():
            raise ApplicationError(
                message="A rejection reason category is strictly required when rejecting a refill claim.",
                code="missing_rejection_reason_category",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        category = rejection_reason_category.strip()
    elif decision == AdjudicationDecision.APPROVE:
        # Rejection reason category must be nullified on approval
        category = None

    try:
        adjudication = ManualAdjudication.objects.create(
            refill_request=refill_request,
            reviewer_user_id=reviewer_user_id,
            decision=decision,
            rejection_reason_category=category,
            clinical_notes=cleaned_notes,
            decided_at=timezone.now(),
        )
    except IntegrityError:
        raise ApplicationError(
            message=f"Refill request '{refill_request_id}' has already been adjudicated concurrently.",
            code="adjudication_conflict",
            status_code=status.HTTP_409_CONFLICT,
        )

    # Atomic parent status transition
    if decision == AdjudicationDecision.APPROVE:
        new_status = RefillStatus.APPROVED
    else:
        new_status = RefillStatus.REJECTED

    from apps.refills.services import refill_request_update_status
    refill_request = refill_request_update_status(
        refill_request=refill_request,
        new_status=new_status,
    )

    # Automatically issue digital e-prescription voucher upon claim approval
    if decision == AdjudicationDecision.APPROVE:
        from apps.vouchers.services import voucher_issue_for_refill
        voucher_issue_for_refill(refill_request=refill_request)

    return adjudication
