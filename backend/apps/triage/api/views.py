from uuid import UUID
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.common.exceptions import ApplicationError
from apps.refills.selectors import refill_request_get_by_id
from apps.triage.api.serializers import (
    ProcessOCRInputSerializer,
    TriageRecordOutputSerializer,
)
from apps.triage.selectors import triage_record_get_by_refill_id
from apps.triage.services import TriageEvaluationService


class ProcessOCRAPIView(APIView):
    """
    POST /api/v1/refill-requests/{refill_id}/process-ocr
    Triggers biometric telemetry extraction from device screen capture scans
    and executes the automated clinical triage rule engine.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Triage"],
        summary="Process device scan OCR & evaluate triage",
        description="Extracts biometric metrics from an uploaded device screen capture and determines triage routing.",
        request=ProcessOCRInputSerializer,
        responses={
            201: TriageRecordOutputSerializer,
            400: None,
            404: None,
            409: None,
        },
    )
    def post(self, request: Request, refill_id: UUID) -> Response:
        refill_request = refill_request_get_by_id(refill_id=refill_id)
        if refill_request is None:
            raise ApplicationError(
                message=f"Refill request '{refill_id}' not found.",
                code="refill_request_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProcessOCRInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        scan_id = validated.get("scan_id")
        override_telemetry = {}
        for key in ["systolic", "diastolic", "glucose", "confidence_score", "raw_payload"]:
            if key in validated and validated[key] is not None:
                override_telemetry[key] = validated[key]

        triage_record, ocr_result = TriageEvaluationService.process_ocr_and_evaluate(
            refill_request=refill_request,
            scan_id=scan_id,
            override_telemetry=override_telemetry if override_telemetry else None,
        )

        output_serializer = TriageRecordOutputSerializer(
            triage_record,
            context={"ocr_result": ocr_result},
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class TriageDetailAPIView(APIView):
    """
    GET /api/v1/refill-requests/{refill_id}/triage
    Retrieves the clinical triage determination record and raw biometric OCR extraction telemetry.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Triage"],
        summary="Retrieve triage record & extraction results",
        description="Fetches the automated triage determination record, rule anomaly reasons, and raw telemetry.",
        responses={
            200: TriageRecordOutputSerializer,
            404: None,
        },
    )
    def get(self, request: Request, refill_id: UUID) -> Response:
        refill_request = refill_request_get_by_id(refill_id=refill_id)
        if refill_request is None:
            raise ApplicationError(
                message=f"Refill request '{refill_id}' not found.",
                code="refill_request_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        triage_record = triage_record_get_by_refill_id(refill_id)
        output_serializer = TriageRecordOutputSerializer(triage_record)
        return Response(output_serializer.data, status=status.HTTP_200_OK)
