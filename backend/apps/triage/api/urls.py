from django.urls import path
from apps.triage.api.views import ProcessOCRAPIView, TriageDetailAPIView

app_name = "triage"

urlpatterns = [
    path(
        "refill-requests/<uuid:refill_id>/process-ocr",
        ProcessOCRAPIView.as_view(),
        name="process-ocr",
    ),
    path(
        "refill-requests/<uuid:refill_id>/triage",
        TriageDetailAPIView.as_view(),
        name="triage-detail",
    ),
]
