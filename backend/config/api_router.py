from django.urls import include, path

app_name = "api"

urlpatterns = [
    path("", include("apps.patients.api.urls", namespace="patients")),
    path("", include("apps.refills.api.urls", namespace="refills")),
]
