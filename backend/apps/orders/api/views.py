import uuid
from typing import Any
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.common.api.permissions import IsOwnerOrStaff
from apps.orders.api.serializers import (
    OrderCancelInputSerializer,
    OrderCreateInputSerializer,
    OrderOutputSerializer,
)
from apps.orders.selectors import order_get_by_id, order_list_for_user
from apps.orders.services import order_cancel, order_create


class OrderListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    @extend_schema(
        tags=["Orders"],
        summary="List user orders",
        description="Retrieve paginated orders for the authenticated user.",
        parameters=[
            OpenApiParameter(name="status", description="Filter by OrderStatus", required=False, type=str),
            OpenApiParameter(name="currency", description="Filter by currency code", required=False, type=str),
        ],
        responses={200: OrderOutputSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        filters: dict[str, Any] = {}
        if status_param := request.query_params.get("status"):
            filters["status"] = status_param
        if currency_param := request.query_params.get("currency"):
            filters["currency"] = currency_param

        orders = order_list_for_user(user=request.user, filters=filters)
        serializer = OrderOutputSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Orders"],
        summary="Create a new order",
        description="Atomically creates an order with items and calculates total amount.",
        request=OrderCreateInputSerializer,
        responses={201: OrderOutputSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = OrderCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        order = order_create(
            user=request.user,
            currency=validated_data["currency"],
            items_data=validated_data["items"],
        )
        return Response(OrderOutputSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    @extend_schema(
        tags=["Orders"],
        summary="Retrieve order details",
        responses={200: OrderOutputSerializer},
    )
    def get(self, request: Request, order_id: uuid.UUID) -> Response:
        order = order_get_by_id(order_id=order_id, user=request.user)
        if not order:
            raise NotFound("Order not found.")
        self.check_object_permissions(request, order)
        return Response(OrderOutputSerializer(order).data, status=status.HTTP_200_OK)


class OrderCancelAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    @extend_schema(
        tags=["Orders"],
        summary="Cancel an order",
        request=OrderCancelInputSerializer,
        responses={200: OrderOutputSerializer},
    )
    def post(self, request: Request, order_id: uuid.UUID) -> Response:
        order = order_get_by_id(order_id=order_id, user=request.user)
        if not order:
            raise NotFound("Order not found.")
        self.check_object_permissions(request, order)

        serializer = OrderCancelInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_order = order_cancel(
            order=order,
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(OrderOutputSerializer(updated_order).data, status=status.HTTP_200_OK)
