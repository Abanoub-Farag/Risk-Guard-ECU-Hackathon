from rest_framework import serializers
from apps.orders.models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)


class OrderCreateInputSerializer(serializers.Serializer):
    currency = serializers.CharField(max_length=3, default="USD")
    items = OrderItemInputSerializer(many=True, allow_empty=False)


class OrderCancelInputSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, default="")


class OrderItemOutputSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_name",
            "quantity",
            "unit_price",
            "subtotal",
            "created_at",
        ]
        read_only_fields = fields


class OrderOutputSerializer(serializers.ModelSerializer):
    items = OrderItemOutputSerializer(many=True, read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user_id",
            "status",
            "total_amount",
            "currency",
            "cancellation_reason",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = fields
