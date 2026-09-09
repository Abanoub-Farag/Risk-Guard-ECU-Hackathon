from django.urls import include, path

app_name = "api"

urlpatterns = [
    path("orders/", include("apps.orders.api.urls", namespace="orders")),
]
