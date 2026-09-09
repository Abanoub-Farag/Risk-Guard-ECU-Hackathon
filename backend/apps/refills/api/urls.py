from django.urls import path
from apps.refills.api.views import (
    DeviceScanUploadAPIView,
    RefillRequestDetailAPIView,
    RefillRequestListCreateAPIView,
    RefillRequestSubmitForReviewAPIView,
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
    path(
        "refill-requests/<uuid:refill_id>/scans/",
        DeviceScanUploadAPIView.as_view(),
        name="refill-scan-upload",
    ),
    path(
        "refill-requests/<uuid:refill_id>/submit-for-review/",
        RefillRequestSubmitForReviewAPIView.as_view(),
        name="refill-submit-for-review",
    ),
]
