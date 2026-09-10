from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.dashboard.selectors import dashboard_overview_get

class DashboardOverviewAPIView(APIView):
    """
    GET /api/v1/dashboard/overview/
    Returns the full health data and telemetry required by the frontend dashboard.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Dashboard"],
        summary="Retrieve dashboard overview",
        description="Returns comprehensive aggregated patient and refill data.",
    )
    def get(self, request: Request) -> Response:
        data = dashboard_overview_get()
        return Response(data, status=status.HTTP_200_OK)
