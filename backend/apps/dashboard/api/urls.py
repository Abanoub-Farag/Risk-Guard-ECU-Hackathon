from django.urls import path
from apps.dashboard.api.views import DashboardOverviewAPIView

app_name = "dashboard"

urlpatterns = [
    path("dashboard/overview/", DashboardOverviewAPIView.as_view(), name="overview"),
]
