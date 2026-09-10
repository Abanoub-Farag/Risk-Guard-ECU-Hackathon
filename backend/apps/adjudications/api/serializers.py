from typing import Any
from rest_framework import serializers
from apps.adjudications.models import (
    AdjudicationDecision,
    ManualAdjudication,
    RejectionReasonCategory,
)
from apps.refills.models import RefillRequest
from apps.triage.selectors import (
    intake_telemetry_get_latest_for_refill,
    intake_telemetry_get_previous_for_patient,
)


class AdjudicationDecisionInputSerializer(serializers.Serializer):
    """
    Validates a human clinician's adjudication decision and clinical justifications.
    """
    decision = serializers.ChoiceField(
        choices=AdjudicationDecision.choices,
        help_text="Clinician determination: 'APPROVE' or 'REJECT'",
    )
    rejection_reason_category = serializers.ChoiceField(
        choices=RejectionReasonCategory.choices,
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Standardized rejection category (mandatory if decision is REJECT)",
    )
    clinical_notes = serializers.CharField(
        min_length=10,
        help_text="Substantive clinical justification (minimum 10 characters)",
    )
    reviewer_user_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Optional UUID identifying the adjudicating clinician (inferred if omitted)",
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        decision = attrs.get("decision")
        category = attrs.get("rejection_reason_category")
        notes = attrs.get("clinical_notes", "").strip()

        if len(notes) < 10:
            raise serializers.ValidationError(
                {"clinical_notes": "Clinical notes must be at least 10 non-whitespace characters."}
            )

        if decision == AdjudicationDecision.REJECT:
            if not category or not str(category).strip():
                raise serializers.ValidationError(
                    {"rejection_reason_category": "Rejection reason category is required when decision is REJECT."}
                )
        elif decision == AdjudicationDecision.APPROVE:
            attrs["rejection_reason_category"] = None

        return attrs


class ManualAdjudicationOutputSerializer(serializers.ModelSerializer):
    """
    Output schema for recorded human clinician adjudication.
    """
    class Meta:
        model = ManualAdjudication
        fields = [
            "id",
            "refill_request_id",
            "reviewer_user_id",
            "decision",
            "rejection_reason_category",
            "clinical_notes",
            "decided_at",
        ]
        read_only_fields = fields


class AdjudicationQueueItemOutputSerializer(serializers.ModelSerializer):
    """
    Summary DTO representing a flagged refill claim in the review queue.
    """
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_national_id = serializers.CharField(source="patient.national_id", read_only=True)
    medication_name = serializers.CharField(source="prescription.medication_name", read_only=True)
    triage_color = serializers.SerializerMethodField()
    anomaly_reason = serializers.SerializerMethodField()

    class Meta:
        model = RefillRequest
        fields = [
            "id",
            "patient_id",
            "patient_name",
            "patient_national_id",
            "prescription_id",
            "medication_name",
            "status",
            "triage_color",
            "anomaly_reason",
            "missed_doses_past_week",
            "has_severe_symptoms",
            "submitted_at",
        ]
        read_only_fields = fields

    def get_triage_color(self, obj: RefillRequest) -> str | None:
        triage = getattr(obj, "triage_record", None)
        return triage.triage_color if triage else None

    def get_anomaly_reason(self, obj: RefillRequest) -> str | None:
        triage = getattr(obj, "triage_record", None)
        return triage.anomaly_reason if triage else None


class AdjudicationClaimDetailOutputSerializer(serializers.Serializer):
    """
    Comprehensive DTO providing full clinical and telemetry context for claim review.
    """
    refill_request_id = serializers.UUIDField(source="id")
    status = serializers.CharField()
    submitted_at = serializers.DateTimeField()
    missed_doses_past_week = serializers.IntegerField()
    has_severe_symptoms = serializers.BooleanField()
    patient = serializers.SerializerMethodField()
    prescription = serializers.SerializerMethodField()
    triage = serializers.SerializerMethodField()
    current_telemetry = serializers.SerializerMethodField()
    prior_cycle_telemetry = serializers.SerializerMethodField()
    adjudication = serializers.SerializerMethodField()

    def get_patient(self, obj: RefillRequest) -> dict[str, Any]:
        p = obj.patient
        return {
            "id": p.id,
            "national_id": p.national_id,
            "full_name": p.full_name,
            "phone_number": p.phone_number,
            "baseline_systolic": p.baseline_systolic,
            "baseline_diastolic": p.baseline_diastolic,
            "baseline_glucose": p.baseline_glucose,
        }

    def get_prescription(self, obj: RefillRequest) -> dict[str, Any]:
        rx = obj.prescription
        return {
            "id": rx.id,
            "medication_name": rx.medication_name,
            "dosage": rx.dosage,
            "refill_interval_days": rx.refill_interval_days,
        }

    def get_triage(self, obj: RefillRequest) -> dict[str, Any] | None:
        triage = getattr(obj, "triage_record", None)
        if not triage:
            return None
        return {
            "triage_color": triage.triage_color,
            "anomaly_reason": triage.anomaly_reason,
            "evaluated_at": triage.evaluated_at,
        }

    def get_current_telemetry(self, obj: RefillRequest) -> dict[str, Any] | None:
        telemetry = intake_telemetry_get_latest_for_refill(obj.id)
        if not telemetry:
            return None
        return {
            "id": telemetry.id,
            "systolic": telemetry.systolic,
            "diastolic": telemetry.diastolic,
            "glucose": telemetry.glucose,
            "processed_at": telemetry.processed_at,
        }

    def get_prior_cycle_telemetry(self, obj: RefillRequest) -> dict[str, Any] | None:
        prior = intake_telemetry_get_previous_for_patient(
            patient_id=obj.patient_id,
            exclude_refill_id=obj.id,
        )
        if not prior:
            return None
        return {
            "id": prior.id,
            "systolic": prior.systolic,
            "diastolic": prior.diastolic,
            "glucose": prior.glucose,
            "processed_at": prior.processed_at,
        }

    def get_adjudication(self, obj: RefillRequest) -> dict[str, Any] | None:
        adjudication = getattr(obj, "manual_adjudication", None)
        if not adjudication:
            return None
        return ManualAdjudicationOutputSerializer(adjudication).data
