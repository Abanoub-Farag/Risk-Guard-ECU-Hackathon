from rest_framework import serializers
from apps.vouchers.models import PharmacyVoucher


class POSVoucherRedeemInputSerializer(serializers.Serializer):
    """
    Validates POS dispensing verification payload submitted by pharmacy branches.
    """
    voucher_code = serializers.CharField(
        max_length=16,
        min_length=16,
        help_text="16-character alphanumeric redemption voucher code",
    )
    national_id = serializers.CharField(
        max_length=14,
        min_length=14,
        help_text="14-digit Egyptian National ID presented by the patient",
    )
    dispensing_pharmacy_id = serializers.CharField(
        max_length=100,
        help_text="Identifier of the dispensing pharmacy branch",
    )


class PharmacyVoucherOutputSerializer(serializers.ModelSerializer):
    """
    Output DTO for patient-facing voucher details.
    """
    medication_name = serializers.CharField(
        source="refill_request.prescription.medication_name",
        read_only=True,
    )
    dosage = serializers.CharField(
        source="refill_request.prescription.dosage",
        read_only=True,
    )
    patient_name = serializers.CharField(
        source="refill_request.patient.full_name",
        read_only=True,
    )

    class Meta:
        model = PharmacyVoucher
        fields = [
            "id",
            "refill_request_id",
            "voucher_code",
            "status",
            "expires_at",
            "dispensed_at",
            "dispensing_pharmacy_id",
            "medication_name",
            "dosage",
            "patient_name",
        ]
        read_only_fields = fields


class POSVoucherPreDispenseDetailOutputSerializer(serializers.Serializer):
    """
    Sanitized pre-dispensing verification lookup schema for pharmacy POS terminals.
    Omits full National ID to prevent PII exposure, displaying masked anchors instead.
    """
    voucher_code = serializers.CharField()
    status = serializers.CharField()
    expires_at = serializers.DateTimeField()
    dispensed_at = serializers.DateTimeField(allow_null=True)
    dispensing_pharmacy_id = serializers.CharField(allow_null=True)
    medication_name = serializers.CharField(source="refill_request.prescription.medication_name")
    dosage = serializers.CharField(source="refill_request.prescription.dosage")
    patient_name = serializers.CharField(source="refill_request.patient.full_name")
    masked_national_id = serializers.SerializerMethodField()

    def get_masked_national_id(self, obj: PharmacyVoucher) -> str:
        nid = obj.refill_request.patient.national_id
        if len(nid) >= 8:
            return f"{nid[:6]}******{nid[-2:]}"
        return "******"


class POSRedemptionConfirmationOutputSerializer(serializers.Serializer):
    """
    Confirmation receipt returned upon successful Point-of-Sale medication dispensing.
    """
    id = serializers.UUIDField()
    refill_request_id = serializers.UUIDField()
    voucher_code = serializers.CharField()
    status = serializers.CharField()
    expires_at = serializers.DateTimeField()
    dispensed_at = serializers.DateTimeField()
    dispensing_pharmacy_id = serializers.CharField()
    medication_name = serializers.CharField(source="refill_request.prescription.medication_name")
    dosage = serializers.CharField(source="refill_request.prescription.dosage")
    patient_name = serializers.CharField(source="refill_request.patient.full_name")
