from django.urls import path

from .views import (
    FarmerVerificationView,
    WalletDisconnectView,
    WalletMeView,
    WalletNonceView,
    WalletRoleSelectionView,
    WalletVerifyView,
)

urlpatterns = [
    path("nonce/", WalletNonceView.as_view(), name="wallet_nonce"),
    path("verify/", WalletVerifyView.as_view(), name="wallet_verify"),
    path("me/", WalletMeView.as_view(), name="wallet_me"),
    path("disconnect/", WalletDisconnectView.as_view(), name="wallet_disconnect"),
    path("role/", WalletRoleSelectionView.as_view(), name="wallet_role_selection"),
    path("farmer-verification/", FarmerVerificationView.as_view(), name="wallet_farmer_verification"),
]
