from typing import Any
from django.contrib import admin
from django.http import HttpRequest, JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # OpenAPI Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Authentication Endpoints
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # Modular App APIs
    path("api/v1/", include("config.api_router", namespace="v1")),
]


def custom_404_handler(request: HttpRequest, exception: Any = None) -> JsonResponse:
    return JsonResponse(
        {
            "type": "urn:problem-type:not-found",
            "title": "Resource Not Found",
            "status": 404,
            "detail": f"The requested resource '{request.path}' was not found.",
            "instance": request.path,
            "code": "not_found",
            "errors": None,
        },
        status=404,
    )


handler404 = "config.urls.custom_404_handler"
