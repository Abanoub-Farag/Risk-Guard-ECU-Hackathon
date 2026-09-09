from uuid import UUID
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.vouchers.api.serializers import (
    PharmacyVoucherOutputSerializer,
    POSRedemptionConfirmationOutputSerializer,
    POSVoucherPreDispenseDetailOutputSerializer,
    POSVoucherRedeemInputSerializer,
)
from apps.vouchers.selectors import (
    voucher_get_by_code,
    voucher_get_by_refill_id,
)
from apps.vouchers.services import voucher_redeem_pos


class POSVoucherRedeemAPIView(APIView):
    """
    POST /api/v1/vouchers/redeem
    Point-of-sale endpoint for pharmacy branches to validate patient identity,
    verify 96-hour TTL, and execute authoritative medication dispensing.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Vouchers"],
        summary="Redeem e-prescription voucher at POS",
        description="Validates Egyptian National ID match, checks 96-hour TTL, and records dispensing.",
        request=POSVoucherRedeemInputSerializer,
        responses={
            200: POSRedemptionConfirmationOutputSerializer,
            400: None,
            403: None,
            404: None,
            409: None,
            410: None,
        },
    )
    def post(self, request: Request) -> Response:
        serializer = POSVoucherRedeemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        voucher = voucher_redeem_pos(
            voucher_code=validated["voucher_code"],
            national_id=validated["national_id"],
            dispensing_pharmacy_id=validated["dispensing_pharmacy_id"],
        )

        output_serializer = POSRedemptionConfirmationOutputSerializer(voucher)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class POSVoucherLookupAPIView(APIView):
    """
    GET /api/v1/vouchers/{voucher_code}
    Provides pre-dispense metadata verification for pharmacy POS terminals,
    including sanitized/masked National ID, medication dosage, and active validity window.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Vouchers"],
        summary="Look up voucher for pre-dispense check",
        description="Retrieves medication and patient clearance status using sanitized masked identity.",
        responses={
            200: POSVoucherPreDispenseDetailOutputSerializer,
            404: None,
        },
    )
    def get(self, request: Request, voucher_code: str) -> Response:
        voucher = voucher_get_by_code(voucher_code=voucher_code)
        serializer = POSVoucherPreDispenseDetailOutputSerializer(voucher)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RefillVoucherDetailAPIView(APIView):
    """
    GET /api/v1/refill-requests/{refill_request_id}/voucher
    Retrieves the digital e-prescription voucher issued for a patient refill intake request.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Vouchers"],
        summary="Retrieve voucher for refill request",
        description="Fetches issued digital voucher details for a patient prescription intake profile.",
        responses={
            200: PharmacyVoucherOutputSerializer,
            404: None,
        },
    )
    def get(self, request: Request, refill_request_id: UUID) -> Response:
        voucher = voucher_get_by_refill_id(refill_request_id=refill_request_id)
        serializer = PharmacyVoucherOutputSerializer(voucher)
        return Response(serializer.data, status=status.HTTP_200_OK)
