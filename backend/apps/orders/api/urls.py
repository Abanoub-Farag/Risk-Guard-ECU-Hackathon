from django.urls import path
from apps.orders.api.views import (
    OrderCancelAPIView,
    OrderDetailAPIView,
    OrderListCreateAPIView,
)

app_name = "orders"

urlpatterns = [
    path("", OrderListCreateAPIView.as_view(), name="order-list-create"),
    path("<uuid:order_id>/", OrderDetailAPIView.as_view(), name="order-detail"),
    path("<uuid:order_id>/cancel/", OrderCancelAPIView.as_view(), name="order-cancel"),
]
