import uuid
from uuid import UUID
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.common.api.pagination import StandardLimitOffsetPagination
from apps.adjudications.api.serializers import (
    AdjudicationClaimDetailOutputSerializer,
    AdjudicationDecisionInputSerializer,
    AdjudicationQueueItemOutputSerializer,
    ManualAdjudicationOutputSerializer,
)
from apps.adjudications.selectors import (
    adjudication_claim_detail,
    adjudication_queue_list,
)
from apps.adjudications.services import adjudication_submit


class AdjudicationQueueListAPIView(APIView):
    """
    GET /api/v1/adjudications/queue
    Exposes the prioritized clinician review queue for claims in NEEDS_REVIEW.
    Sorts RED urgency over YELLOW, ordered FIFO by submitted_at.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Adjudications"],
        summary="List exception review queue",
        description="Retrieves a paginated list of refill requests requiring clinician review, sorted by urgency.",
        parameters=[
            OpenApiParameter(
                name="triage_color",
                description="Filter by triage color: 'RED' or 'YELLOW'",
                required=False,
                type=str,
            ),
        ],
        responses={200: AdjudicationQueueItemOutputSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        triage_color = request.query_params.get("triage_color")
        queryset = adjudication_queue_list(triage_color=triage_color)

        paginator = StandardLimitOffsetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = AdjudicationQueueItemOutputSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AdjudicationQueueItemOutputSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdjudicationQueueDetailAPIView(APIView):
    """
    GET /api/v1/adjudications/queue/{refill_request_id}
    Retrieves comprehensive claim details including patient baseline anchors,
    current biometrics, prior cycle OCR results, and device scan storage URIs.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Adjudications"],
        summary="Retrieve claim details for review",
        description="Fetches full clinical context, telemetry, prior history, and triage flags for an intake request.",
        responses={
            200: AdjudicationClaimDetailOutputSerializer,
            404: None,
        },
    )
    def get(self, request: Request, refill_request_id: UUID) -> Response:
        claim = adjudication_claim_detail(refill_request_id=refill_request_id)
        serializer = AdjudicationClaimDetailOutputSerializer(claim)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdjudicateRefillAPIView(APIView):
    """
    POST /api/v1/refill-requests/{id}/adjudicate
    Submits a human clinician review decision (APPROVE or REJECT) with required justification.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refills"

    @extend_schema(
        tags=["Adjudications"],
        summary="Submit human clinician adjudication",
        description="Records an authoritative medical determination. Strictly controls terminal REJECTED status.",
        request=AdjudicationDecisionInputSerializer,
        responses={
            201: ManualAdjudicationOutputSerializer,
            400: None,
            404: None,
            409: None,
        },
    )
    def post(self, request: Request, refill_id: UUID) -> Response:
        serializer = AdjudicationDecisionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        # Determine reviewer UUID from input or authenticated session
        reviewer_id = validated.get("reviewer_user_id")
        if not reviewer_id:
            user_uuid = getattr(request.user, "uuid", None)
            if user_uuid:
                reviewer_id = UUID(str(user_uuid))
            else:
                # Deterministic UUID from user PK
                reviewer_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(request.user.id))

        adjudication = adjudication_submit(
            refill_request_id=refill_id,
            reviewer_user_id=reviewer_id,
            decision=validated["decision"],
            clinical_notes=validated["clinical_notes"],
            rejection_reason_category=validated.get("rejection_reason_category"),
        )

        output_serializer = ManualAdjudicationOutputSerializer(adjudication)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
