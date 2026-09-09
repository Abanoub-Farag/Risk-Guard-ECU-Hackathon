from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone
from apps.common.models import BaseModel
from apps.refills.models import RefillRequest


class AdjudicationDecision(models.TextChoices):
    APPROVE = "APPROVE", "Approve"
    REJECT = "REJECT", "Reject"


class RejectionReasonCategory(models.TextChoices):
    UNVERIFIABLE_DEVICE_IMAGE = "UNVERIFIABLE_DEVICE_IMAGE", "Unverifiable Device Image"
    SUSPECTED_FRAUD_TAMPERING = "SUSPECTED_FRAUD_TAMPERING", "Suspected Fraud / Data Tampering"
    PHYSIOLOGICAL_DANGER = "PHYSIOLOGICAL_DANGER", "Acute Physiological Danger"
    CLINICAL_CONTRAINDICATION = "CLINICAL_CONTRAINDICATION", "Clinical Contraindication"
    EXCESSIVE_DOSAGE_VARIANCE = "EXCESSIVE_DOSAGE_VARIANCE", "Excessive Biometric Variance"
    OTHER = "OTHER", "Other Clinical Rationale"


class ManualAdjudication(BaseModel):
    """
    Enforces human clinician review, holding exclusive terminal authority over
    prescription refill rejection and medical exception clearance.
    """
    refill_request = models.OneToOneField(
        RefillRequest,
        on_delete=models.CASCADE,
        related_name="manual_adjudication",
        unique=True,
        db_index=True,
    )
    reviewer_user_id = models.UUIDField(
        db_index=True,
        help_text="UUID identifying the licensed adjudicating clinician",
    )
    decision = models.CharField(
        max_length=20,
        choices=AdjudicationDecision.choices,
    )
    rejection_reason_category = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        choices=RejectionReasonCategory.choices,
    )
    clinical_notes = models.TextField(
        help_text="Mandatory substantive clinical justification and clearance rationale",
    )
    decided_at = models.DateTimeField(
        default=timezone.now,
    )

    class Meta(BaseModel.Meta):
        db_table = "manual_adjudications"
        constraints = [
            models.CheckConstraint(
                condition=Q(decision__in=AdjudicationDecision.values),
                name="chk_adjudication_decision_valid",
            ),
            models.CheckConstraint(
                condition=(
                    Q(decision="APPROVE")
                    | (
                        Q(decision="REJECT")
                        & Q(rejection_reason_category__isnull=False)
                        & ~Q(rejection_reason_category="")
                        & ~Q(clinical_notes="")
                    )
                ),
                name="chk_adjudication_rejection_conditional",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if not self.clinical_notes or not self.clinical_notes.strip():
            raise ValidationError(
                {"clinical_notes": "Clinical notes must not be empty or whitespace only."}
            )
        if self.decision == AdjudicationDecision.REJECT:
            if not self.rejection_reason_category or not self.rejection_reason_category.strip():
                raise ValidationError(
                    {"rejection_reason_category": "Rejection reason category is mandatory on rejection."}
                )

    def __str__(self) -> str:
        return f"ManualAdjudication {self.id} for Refill {self.refill_request_id} [{self.decision}]"
