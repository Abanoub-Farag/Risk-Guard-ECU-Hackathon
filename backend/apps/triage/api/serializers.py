from typing import Any
from rest_framework import serializers
from apps.triage.models import OCRResult, TriageRecord
from apps.triage.selectors import ocr_result_get_latest_for_refill


class ProcessOCRInputSerializer(serializers.Serializer):
    """
    Input schema for triggering OCR metric extraction and triage evaluation.
    Allows optional target scan identifier and optional telemetry simulation parameters.
    """
    scan_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="UUID of a specific uploaded device scan to process",
    )
    systolic = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional simulated/manual systolic reading override",
    )
    diastolic = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional simulated/manual diastolic reading override",
    )
    glucose = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Optional simulated/manual glucose reading override",
    )
    confidence_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=4,
        required=False,
        allow_null=True,
        help_text="Optional simulated confidence score override [0.0000, 1.0000]",
    )
    raw_payload = serializers.DictField(
        required=False,
        allow_null=True,
        help_text="Optional simulated raw OCR engine payload",
    )


class OCRResultOutputSerializer(serializers.ModelSerializer):
    """
    Output schema representing extracted biometric telemetry and OCR confidence.
    """
    class Meta:
        model = OCRResult
        fields = [
            "id",
            "refill_request_id",
            "confidence_score",
            "systolic",
            "diastolic",
            "glucose",
            "raw_payload",
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
    ocr_result = serializers.SerializerMethodField()

    class Meta:
        model = TriageRecord
        fields = [
            "id",
            "refill_request_id",
            "triage_color",
            "anomaly_reason",
            "evaluated_at",
            "refill_request_status",
            "ocr_result",
        ]
        read_only_fields = fields

    def get_ocr_result(self, obj: TriageRecord) -> dict[str, Any] | None:
        # Check if pre-attached on context
        pre_attached = self.context.get("ocr_result")
        if pre_attached is not None and pre_attached.refill_request_id == obj.refill_request_id:
            return OCRResultOutputSerializer(pre_attached).data

        latest_ocr = ocr_result_get_latest_for_refill(obj.refill_request_id)
        if latest_ocr is not None:
            return OCRResultOutputSerializer(latest_ocr).data
        return None
