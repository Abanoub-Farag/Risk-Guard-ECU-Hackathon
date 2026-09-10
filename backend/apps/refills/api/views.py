import uuid
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.refills.api.serializers import (
    RefillRequestCreateInputSerializer,
    RefillRequestOutputSerializer,
)
from apps.refills.selectors import refill_request_get_by_id
from apps.refills.services import (
    refill_request_create,
)


class RefillRequestListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Refills"],
        summary="Create monthly refill intake request",
        description="Initiates a monthly refill request. Enforces 25-day early refill guardrail.",
        request=RefillRequestCreateInputSerializer,
        responses={201: RefillRequestOutputSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = RefillRequestCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        refill_request = refill_request_create(
            patient_id=data["patient_id"],
            prescription_id=data["prescription_id"],
            missed_doses_past_week=data.get("missed_doses_past_week", 0),
            has_severe_symptoms=data.get("has_severe_symptoms", False),
        )
        return Response(RefillRequestOutputSerializer(refill_request).data, status=status.HTTP_201_CREATED)


class RefillRequestDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Refills"],
        summary="Retrieve refill request status and attached scans",
        description="Returns intake status, patient adherence details, and ingested device screen captures.",
        responses={200: RefillRequestOutputSerializer},
    )
    def get(self, request: Request, refill_id: uuid.UUID) -> Response:
        refill_request = refill_request_get_by_id(refill_id=refill_id)
        if not refill_request:
            raise NotFound("Refill request not found.")
        return Response(RefillRequestOutputSerializer(refill_request).data, status=status.HTTP_200_OK)






