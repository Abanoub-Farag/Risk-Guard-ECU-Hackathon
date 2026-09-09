from decimal import Decimal
from typing import Any
from django.db import transaction
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.orders.models import Order, OrderItem, OrderStatus


@transaction.atomic
def order_create(
    *,
    user: Any,
    currency: str = "USD",
    items_data: list[dict[str, Any]],
) -> Order:
    """
    Creates an order with line items and recalculates total amount atomically.
    """
    if not items_data:
        raise ApplicationError(
            message="Order must contain at least one item.",
            code="order_empty_items",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    order = Order.objects.create(
        user=user,
        currency=currency,
        status=OrderStatus.PENDING,
        total_amount=Decimal("0.00"),
    )

    total_amount = Decimal("0.00")
    order_items: list[OrderItem] = []

    for item in items_data:
        quantity = int(item["quantity"])
        unit_price = Decimal(str(item["unit_price"]))

        if quantity <= 0:
            raise ApplicationError(
                message="Quantity must be greater than zero.",
                code="invalid_quantity",
            )
        if unit_price <= Decimal("0.00"):
            raise ApplicationError(
                message="Unit price must be positive.",
                code="invalid_price",
            )

        subtotal = quantity * unit_price
        total_amount += subtotal

        order_items.append(
            OrderItem(
                order=order,
                product_name=item["product_name"],
                quantity=quantity,
                unit_price=unit_price,
            )
        )

    OrderItem.objects.bulk_create(order_items)
    order.total_amount = total_amount
    order.save(update_fields=["total_amount", "updated_at"])

    return order


@transaction.atomic
def order_cancel(
    *,
    order: Order,
    reason: str = "",
) -> Order:
    """
    Transitions order to CANCELLED state if valid.
    """
    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise ApplicationError(
            message=f"Cannot cancel an order in '{order.status}' status.",
            code="order_invalid_transition",
            status_code=status.HTTP_409_CONFLICT,
        )

    order.status = OrderStatus.CANCELLED
    order.cancellation_reason = reason
    order.save(update_fields=["status", "cancellation_reason", "updated_at"])

    return order


@transaction.atomic
def order_mark_paid(
    *,
    order: Order,
) -> Order:
    """
    Transitions order from PENDING to PAID.
    """
    if order.status != OrderStatus.PENDING:
        raise ApplicationError(
            message=f"Only PENDING orders can be marked as PAID. Current: {order.status}",
            code="order_not_payable",
            status_code=status.HTTP_409_CONFLICT,
        )

    order.status = OrderStatus.PAID
    order.save(update_fields=["status", "updated_at"])
    return order
