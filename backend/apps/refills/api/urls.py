from django.urls import path
from apps.refills.api.views import (
    RefillRequestDetailAPIView,
    RefillRequestListCreateAPIView,
)

app_name = "refills"

urlpatterns = [
    path(
        "refill-requests/",
        RefillRequestListCreateAPIView.as_view(),
        name="refill-list-create",
    ),
    path(
        "refill-requests/<uuid:refill_id>/",
        RefillRequestDetailAPIView.as_view(),
        name="refill-detail",
    ),
]
