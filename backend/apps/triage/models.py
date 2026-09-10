from decimal import Decimal
from django.db import models
from django.db.models import Q
from django.utils import timezone
from apps.common.models import BaseModel
from apps.refills.models import RefillRequest


class TriageColor(models.TextChoices):
    GREEN = "GREEN", "Green"
    YELLOW = "YELLOW", "Yellow"
    RED = "RED", "Red"


class AnomalyReason(models.TextChoices):
    PHYSIOLOGICAL_IMPOSSIBILITY = "PHYSIOLOGICAL_IMPOSSIBILITY", "Physiological Impossibility"
    SUSPECTED_DATA_FABRICATION = "SUSPECTED_DATA_FABRICATION", "Suspected Data Fabrication"
    CLINICAL_VARIANCE_EXCEEDED = "CLINICAL_VARIANCE_EXCEEDED", "Clinical Variance Exceeded"
    SEVERE_SYMPTOMS_REPORTED = "SEVERE_SYMPTOMS_REPORTED", "Severe Symptoms Reported"


class IntakeTelemetry(BaseModel):
    """
    Persists manual telemetry submitted for a refill intake request.
    """
    refill_request = models.ForeignKey(
        RefillRequest,
        on_delete=models.CASCADE,
        related_name="telemetry_records",
        db_index=True,
    )
    systolic = models.IntegerField(
        null=True,
        blank=True,
        help_text="Extracted systolic blood pressure in mmHg",
    )
    diastolic = models.IntegerField(
        null=True,
        blank=True,
        help_text="Extracted diastolic blood pressure in mmHg",
    )
    glucose = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Extracted blood glucose in mg/dL",
    )
    processed_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    class Meta(BaseModel.Meta):
        db_table = "intake_telemetry"
        indexes = [
            models.Index(
                fields=["refill_request", "-processed_at"],
                name="idx_telemetry_refill_processed",
            ),
        ]

    def __str__(self) -> str:
        return f"IntakeTelemetry {self.id} for Refill {self.refill_request_id}"


class TriageRecord(BaseModel):
    """
    Enforces a strict 1:1 automated clinical triage determination for a refill intake request.
    """
    refill_request = models.OneToOneField(
        RefillRequest,
        on_delete=models.CASCADE,
        related_name="triage_record",
        unique=True,
        db_index=True,
    )
    triage_color = models.CharField(
        max_length=10,
        choices=TriageColor.choices,
    )
    anomaly_reason = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        choices=AnomalyReason.choices,
    )
    evaluated_at = models.DateTimeField(
        default=timezone.now,
    )

    class Meta(BaseModel.Meta):
        db_table = "triage_records"
        constraints = [
            models.CheckConstraint(
                condition=Q(triage_color__in=TriageColor.values),
                name="chk_triage_color_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"TriageRecord {self.id} for Refill {self.refill_request_id} [{self.triage_color}]"
