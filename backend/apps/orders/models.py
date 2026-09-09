from decimal import Decimal
from django.conf import settings
from django.db import models
from apps.common.models import BaseModel


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class Order(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    currency = models.CharField(
        max_length=3,
        default="USD",
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
    )

    class Meta(BaseModel.Meta):
        db_table = "orders"
        indexes = [
            models.Index(fields=["user", "status"], name="idx_order_user_status"),
            models.Index(fields=["created_at", "status"], name="idx_order_created_status"),
        ]

    def __str__(self) -> str:
        return f"Order {self.id} ({self.status}) - {self.user}"


class OrderItem(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_name = models.CharField(
        max_length=255,
    )
    quantity = models.PositiveIntegerField(
        default=1,
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    class Meta(BaseModel.Meta):
        db_table = "order_items"
        indexes = [
            models.Index(fields=["order", "product_name"], name="idx_item_order_product"),
        ]

    @property
    def subtotal(self) -> Decimal:
        return self.quantity * self.unit_price

    def __str__(self) -> str:
        return f"{self.product_name} x{self.quantity} for Order {self.order_id}"
