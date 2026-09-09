from decimal import Decimal
from typing import Any
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from apps.patients.models import Patient, PatientPrescription
from apps.patients.validators import (
    validate_blood_pressure,
    validate_egyptian_national_id,
)


class PatientCreateInputSerializer(serializers.Serializer):
    national_id = serializers.CharField(
        max_length=14,
        min_length=14,
        help_text="14-digit Egyptian National ID",
    )
    full_name = serializers.CharField(
        max_length=255,
        help_text="Patient's full legal name",
    )
    phone_number = serializers.CharField(
        max_length=32,
        help_text="Contact telephone number",
    )
    baseline_systolic = serializers.IntegerField(
        min_value=50,
        max_value=300,
        help_text="Baseline systolic pressure in mmHg (50 - 300)",
    )
    baseline_diastolic = serializers.IntegerField(
        min_value=30,
        max_value=200,
        help_text="Baseline diastolic pressure in mmHg (30 - 200)",
    )
    baseline_glucose = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
        allow_null=True,
        default=None,
        help_text="Baseline fasting glucose in mg/dL (> 0)",
    )

    def validate_national_id(self, value: str) -> str:
        try:
            validate_egyptian_national_id(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        systolic = attrs.get("baseline_systolic")
        diastolic = attrs.get("baseline_diastolic")
        if systolic is not None and diastolic is not None:
            try:
                validate_blood_pressure(systolic, diastolic)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages) from exc
        return attrs


class PrescriptionCreateInputSerializer(serializers.Serializer):
    medication_name = serializers.CharField(
        max_length=255,
        help_text="Commercial or generic medication name",
    )
    dosage = serializers.CharField(
        max_length=255,
        help_text="Prescribed dosage instructions (e.g., '100mg daily')",
    )
    refill_interval_days = serializers.IntegerField(
        min_value=1,
        default=30,
        required=False,
        help_text="Days between allowable refills",
    )


class PrescriptionOutputSerializer(serializers.ModelSerializer):
    patient_id = serializers.UUIDField(source="patient.id", read_only=True)

    class Meta:
        model = PatientPrescription
        fields = [
            "id",
            "patient_id",
            "medication_name",
            "dosage",
            "refill_interval_days",
            "last_dispensed_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PatientOutputSerializer(serializers.ModelSerializer):
    active_prescriptions = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id",
            "national_id",
            "full_name",
            "phone_number",
            "baseline_systolic",
            "baseline_diastolic",
            "baseline_glucose",
            "created_at",
            "updated_at",
            "active_prescriptions",
        ]
        read_only_fields = fields

    def get_active_prescriptions(self, obj: Patient) -> list[dict[str, Any]]:
        # Use prefetched active_prescriptions attribute if available, fallback to filtered queryset
        if hasattr(obj, "active_prescriptions"):
            prescriptions = obj.active_prescriptions  # type: ignore[attr-defined]
        else:
            prescriptions = obj.prescriptions.filter(is_active=True)
        return PrescriptionOutputSerializer(prescriptions, many=True).data  # type: ignore[no-any-return]
