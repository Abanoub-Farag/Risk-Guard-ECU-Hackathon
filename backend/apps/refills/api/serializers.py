from rest_framework import serializers
from apps.refills.models import RefillRequest


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





class RefillRequestOutputSerializer(serializers.ModelSerializer):
    patient_id = serializers.UUIDField(source="patient.id", read_only=True)
    prescription_id = serializers.UUIDField(source="prescription.id", read_only=True)

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
        ]
        read_only_fields = fields
