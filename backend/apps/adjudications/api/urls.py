from django.urls import path
from apps.adjudications.api.views import (
    AdjudicateRefillAPIView,
    AdjudicationQueueDetailAPIView,
    AdjudicationQueueListAPIView,
)

app_name = "adjudications"

urlpatterns = [
    path(
        "adjudications/queue",
        AdjudicationQueueListAPIView.as_view(),
        name="queue-list",
    ),
    path(
        "adjudications/queue/<uuid:refill_request_id>",
        AdjudicationQueueDetailAPIView.as_view(),
        name="queue-detail",
    ),
    path(
        "refill-requests/<uuid:refill_id>/adjudicate",
        AdjudicateRefillAPIView.as_view(),
        name="refill-adjudicate",
    ),
]
