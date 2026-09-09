from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower
from apps.common.models import BaseModel


class Patient(BaseModel):
    """
    Patient entity capturing chronic registration data, contact information,
    and baseline biometric parameters.
    """
    national_id = models.CharField(
        max_length=14,
        unique=True,
        db_index=True,
    )
    full_name = models.CharField(
        max_length=255,
    )
    phone_number = models.CharField(
        max_length=32,
    )
    baseline_systolic = models.PositiveSmallIntegerField(
        help_text="Baseline systolic blood pressure in mmHg (50 - 300)",
    )
    baseline_diastolic = models.PositiveSmallIntegerField(
        help_text="Baseline diastolic blood pressure in mmHg (30 - 200)",
    )
    baseline_glucose = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Baseline blood glucose concentration in mg/dL (> 0)",
    )

    class Meta(BaseModel.Meta):
        db_table = "patients"
        constraints = [
            models.CheckConstraint(
                condition=Q(baseline_systolic__gte=50) & Q(baseline_systolic__lte=300),
                name="chk_patient_systolic_range",
            ),
            models.CheckConstraint(
                condition=Q(baseline_diastolic__gte=30) & Q(baseline_diastolic__lte=200),
                name="chk_patient_diastolic_range",
            ),
            models.CheckConstraint(
                condition=Q(baseline_systolic__gt=F("baseline_diastolic")),
                name="chk_patient_systolic_greater_than_diastolic",
            ),
            models.CheckConstraint(
                condition=Q(baseline_glucose__isnull=True) | (Q(baseline_glucose__gt=0) & Q(baseline_glucose__lte=1000)),
                name="chk_patient_glucose_positive",
            ),
        ]
        indexes = [
            models.Index(fields=["created_at"], name="idx_patient_created_at"),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.national_id})"


class PatientPrescription(BaseModel):
    """
    Prescription tracking entity linking medications, dosages, and refill cycles
    to registered chronic patients.
    """
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="prescriptions",
        db_index=True,
    )
    medication_name = models.CharField(
        max_length=255,
    )
    dosage = models.CharField(
        max_length=255,
    )
    refill_interval_days = models.PositiveIntegerField(
        default=30,
        help_text="Refill cycle interval in days (> 0)",
    )
    last_dispensed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    class Meta(BaseModel.Meta):
        db_table = "patient_prescriptions"
        constraints = [
            models.CheckConstraint(
                condition=Q(refill_interval_days__gt=0),
                name="chk_prescription_refill_interval_positive",
            ),
            models.UniqueConstraint(
                Lower("medication_name"),
                "patient",
                condition=Q(is_active=True, is_deleted=False),
                name="uq_patient_active_medication",
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "is_active"], name="idx_rx_patient_active"),
            models.Index(fields=["medication_name"], name="idx_rx_medication_name"),
        ]

    def __str__(self) -> str:
        status_str = "ACTIVE" if self.is_active else "INACTIVE"
        return f"{self.medication_name} ({self.dosage}) - {self.patient_id} [{status_str}]"
