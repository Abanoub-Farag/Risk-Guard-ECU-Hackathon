from rest_framework import serializers
from apps.refills.models import DeviceScan, DeviceType, RefillRequest


class RefillRequestCreateInputSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField(
        help_text="UUID of the registering patient",
    )
    prescription_id = serializers.UUIDField(
        help_text="UUID of the active prescription to be refilled",
    )
    missed_doses_past_week = serializers.IntegerField(
        min_value=0,
        default=0,
        required=False,
        help_text="Self-reported missed medication doses over the prior week (>= 0)",
    )
    has_severe_symptoms = serializers.BooleanField(
        default=False,
        required=False,
        help_text="Flag indicating sudden or severe adverse clinical symptoms",
    )


class DeviceScanCreateInputSerializer(serializers.Serializer):
    device_type = serializers.ChoiceField(
        choices=DeviceType.choices,
        help_text="Type of biometric device screen captured ('BLOOD_PRESSURE' or 'GLUCOMETER')",
    )
    file = serializers.FileField(
        help_text="Device screen capture image file (JPEG or PNG, up to 10MB)",
    )


class DeviceScanOutputSerializer(serializers.ModelSerializer):
    refill_request_id = serializers.UUIDField(source="refill_request.id", read_only=True)

    class Meta:
        model = DeviceScan
        fields = [
            "id",
            "refill_request_id",
            "device_type",
            "image_storage_uri",
            "captured_at",
            "created_at",
        ]
        read_only_fields = fields


class RefillRequestOutputSerializer(serializers.ModelSerializer):
    patient_id = serializers.UUIDField(source="patient.id", read_only=True)
    prescription_id = serializers.UUIDField(source="prescription.id", read_only=True)
    scans = DeviceScanOutputSerializer(many=True, read_only=True)

    class Meta:
        model = RefillRequest
        fields = [
            "id",
            "patient_id",
            "prescription_id",
            "status",
            "missed_doses_past_week",
            "has_severe_symptoms",
            "submitted_at",
            "created_at",
            "updated_at",
            "scans",
        ]
        read_only_fields = fields
