from typing import Any
from django.views import View
from rest_framework.permissions import BasePermission
from rest_framework.request import Request


class IsOwnerOrStaff(BasePermission):
    """
    Object-level permission allowing only the owner of an object or staff to access/modify it.
    """
    def has_object_permission(self, request: Request, view: View, obj: Any) -> bool:
        if bool(request.user and request.user.is_staff):
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "customer", None)
        return bool(owner and owner == request.user)
