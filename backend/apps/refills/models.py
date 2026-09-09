from django.db import models
from django.db.models import Q
from apps.common.models import BaseModel
from apps.patients.models import Patient, PatientPrescription


class RefillStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Submitted"
    PROCESSED = "PROCESSED", "Processed"
    APPROVED = "APPROVED", "Approved"
    NEEDS_REVIEW = "NEEDS_REVIEW", "Needs Review"
    REJECTED = "REJECTED", "Rejected"


class DeviceType(models.TextChoices):
    BLOOD_PRESSURE = "BLOOD_PRESSURE", "Blood Pressure Monitor"
    GLUCOMETER = "GLUCOMETER", "Glucometer"


class RefillRequest(BaseModel):
    """
    Captures chronic prescription refill requests, tracking intake status,
    patient adherence, and timeline evaluations.
    """
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="refill_requests",
        db_index=True,
    )
    prescription = models.ForeignKey(
        PatientPrescription,
        on_delete=models.PROTECT,
        related_name="refill_requests",
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=RefillStatus.choices,
        default=RefillStatus.SUBMITTED,
        db_index=True,
    )
    missed_doses_past_week = models.PositiveIntegerField(
        default=0,
        help_text="Number of missed doses reported over the previous 7 days (>= 0)",
    )
    has_severe_symptoms = models.BooleanField(
        default=False,
        help_text="Whether patient experiences severe or acute symptoms",
    )
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta(BaseModel.Meta):
        db_table = "refill_requests"
        constraints = [
            models.CheckConstraint(
                condition=Q(status__in=RefillStatus.values),
                name="chk_refill_status_valid",
            ),
            models.CheckConstraint(
                condition=Q(missed_doses_past_week__gte=0),
                name="chk_refill_missed_doses_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "status"], name="idx_refill_patient_status"),
            models.Index(fields=["prescription", "-submitted_at"], name="idx_refill_rx_timeline"),
        ]

    def __str__(self) -> str:
        return f"Refill {self.id} for Patient {self.patient_id} [{self.status}]"


class DeviceScan(BaseModel):
    """
    Ingests and records biometric device screen captures (BP monitors, glucometers)
    associated with a refill intake request.
    """
    refill_request = models.ForeignKey(
        RefillRequest,
        on_delete=models.CASCADE,
        related_name="scans",
        db_index=True,
    )
    device_type = models.CharField(
        max_length=20,
        choices=DeviceType.choices,
    )
    image_storage_uri = models.TextField(
        help_text="Compliant sovereign object storage URI path",
    )
    captured_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta(BaseModel.Meta):
        db_table = "device_scans"
        constraints = [
            models.CheckConstraint(
                condition=Q(device_type__in=DeviceType.values),
                name="chk_device_type_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["refill_request", "device_type"], name="idx_scan_req_device"),
        ]

    def __str__(self) -> str:
        return f"Scan {self.id} ({self.device_type}) for Refill {self.refill_request_id}"
