from django.urls import path
from apps.triage.api.views import ProcessIntakeAPIView, TriageDetailAPIView

app_name = "triage"

urlpatterns = [
    path(
        "refill-requests/<uuid:refill_id>/process-intake/",
        ProcessIntakeAPIView.as_view(),
        name="process_intake",
    ),
    path(
        "refill-requests/<uuid:refill_id>/triage",
        TriageDetailAPIView.as_view(),
        name="triage-detail",
    ),
]
