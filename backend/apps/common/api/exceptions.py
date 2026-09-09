from typing import Any
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from apps.common.exceptions import ApplicationError


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """
    Standardized RFC 7807 compliant exception handler for DRF.
    """
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            exc = exceptions.ValidationError(detail=exc.message_dict)
        elif hasattr(exc, "messages"):
            exc = exceptions.ValidationError(detail=exc.messages)
        else:
            exc = exceptions.ValidationError(detail=str(exc))
    elif isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()
    elif isinstance(exc, ApplicationError):
        request = context.get("request")
        path = request.path if request else ""
        return Response(
            {
                "type": f"urn:problem-type:{exc.code}",
                "title": "Business Rule Violation",
                "status": exc.status_code,
                "detail": exc.message,
                "instance": path,
                "code": exc.code,
                "errors": None,
            },
            status=exc.status_code,
        )

    response = exception_handler(exc, context)

    if response is None:
        return None

    request = context.get("request")
    path = request.path if request else ""

    status_code = response.status_code
    title = response.status_text if hasattr(response, "status_text") else "An error occurred"
    detail = "Request failed validation or execution."
    code = "api_error"
    errors = None

    if isinstance(response.data, dict):
        if "detail" in response.data:
            detail = str(response.data.get("detail"))
            code = getattr(exc, "default_code", "error")
            errors = {k: v for k, v in response.data.items() if k != "detail"} or None
        else:
            detail = "Validation failed for one or more fields."
            code = "validation_error"
            errors = response.data
    elif isinstance(response.data, list):
        detail = "Validation error in request payload."
        code = "validation_error"
        errors = {"non_field_errors": response.data}

    response.data = {
        "type": f"urn:problem-type:{code}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": path,
        "code": code,
        "errors": errors,
    }

    return response
