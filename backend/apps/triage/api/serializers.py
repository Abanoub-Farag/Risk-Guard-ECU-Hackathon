from typing import Any
from rest_framework import serializers
from apps.triage.models import IntakeTelemetry, TriageRecord
from apps.triage.selectors import intake_telemetry_get_latest_for_refill


class ProcessIntakeInputSerializer(serializers.Serializer):
    """
    Input schema for submitting manual biometric telemetry and triggering triage evaluation.
    """
    systolic = serializers.IntegerField(
        required=True,
        help_text="Manual systolic reading override",
    )
    diastolic = serializers.IntegerField(
        required=True,
        help_text="Manual diastolic reading override",
    )
    glucose = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Manual glucose reading override",
    )


class IntakeTelemetryOutputSerializer(serializers.ModelSerializer):
    """
    Output schema representing submitted biometric telemetry.
    """
    class Meta:
        model = IntakeTelemetry
        fields = [
            "id",
            "refill_request_id",
            "systolic",
            "diastolic",
            "glucose",
            "processed_at",
        ]
        read_only_fields = fields


class TriageRecordOutputSerializer(serializers.ModelSerializer):
    """
    Output schema for clinical triage determination and routing results.
    """
    refill_request_status = serializers.CharField(
        source="refill_request.status",
        read_only=True,
    )
    telemetry = serializers.SerializerMethodField()

    class Meta:
        model = TriageRecord
        fields = [
            "id",
            "refill_request_id",
            "triage_color",
            "anomaly_reason",
            "evaluated_at",
            "refill_request_status",
            "telemetry",
        ]
        read_only_fields = fields

    def get_telemetry(self, obj: TriageRecord) -> dict[str, Any] | None:
        # Check if pre-attached on context
        pre_attached = self.context.get("telemetry")
        if pre_attached is not None and pre_attached.refill_request_id == obj.refill_request_id:
            return IntakeTelemetryOutputSerializer(pre_attached).data

        latest_telemetry = intake_telemetry_get_latest_for_refill(obj.refill_request_id)
        if latest_telemetry is not None:
            return IntakeTelemetryOutputSerializer(latest_telemetry).data
        return None
