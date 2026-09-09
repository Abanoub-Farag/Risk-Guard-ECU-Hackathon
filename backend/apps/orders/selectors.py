import uuid
from typing import Any
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from apps.orders.models import Order

User = get_user_model()


def order_list_for_user(
    *,
    user: Any,
    filters: dict[str, Any] | None = None,
) -> QuerySet[Order]:
    """
    Returns an optimized queryset of orders belonging to a user with prefetched items
    to avoid N+1 query overhead.
    """
    filters = filters or {}
    queryset = (
        Order.objects.filter(user=user)
        .select_related("user")
        .prefetch_related("items")
    )

    if status := filters.get("status"):
        queryset = queryset.filter(status=status)

    if currency := filters.get("currency"):
        queryset = queryset.filter(currency=currency)

    return queryset


def order_get_by_id(
    *,
    order_id: uuid.UUID | str,
    user: Any | None = None,
) -> Order | None:
    """
    Retrieves a single order by UUID with preloaded related items.
    """
    queryset = Order.objects.select_related("user").prefetch_related("items")
    if user is not None and not getattr(user, "is_staff", False):
        queryset = queryset.filter(user=user)

    try:
        return queryset.get(id=order_id)
    except Order.DoesNotExist:
        return None
