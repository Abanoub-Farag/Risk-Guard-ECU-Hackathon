from django.urls import path
from apps.vouchers.api.views import (
    POSVoucherLookupAPIView,
    POSVoucherRedeemAPIView,
    RefillVoucherDetailAPIView,
)

app_name = "vouchers"

urlpatterns = [
    path(
        "vouchers/redeem",
        POSVoucherRedeemAPIView.as_view(),
        name="voucher-redeem",
    ),
    path(
        "vouchers/<str:voucher_code>",
        POSVoucherLookupAPIView.as_view(),
        name="voucher-lookup",
    ),
    path(
        "refill-requests/<uuid:refill_request_id>/voucher",
        RefillVoucherDetailAPIView.as_view(),
        name="refill-voucher-detail",
    ),
]
