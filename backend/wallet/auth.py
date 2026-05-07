from django.utils import timezone
from rest_framework import authentication, exceptions, permissions

from .models import WalletProfile, WalletSession


class WalletTokenAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Wallet "):
            return None
        token = auth_header.split(" ", 1)[1].strip()
        try:
            session = WalletSession.objects.get(token=token, is_active=True)
        except WalletSession.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Invalid wallet session token") from exc
        if session.expires_at <= timezone.now():
            raise exceptions.AuthenticationFailed("Wallet session expired")
        request.wallet_address = session.wallet_address
        request.wallet_profile = WalletProfile.get_or_create_for_wallet(session.wallet_address)
        return (None, session)


class IsWalletAuthenticated(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(getattr(request, "wallet_address", None))


class IsFarmerRole(permissions.BasePermission):
    message = "Only farmer wallets can perform this action."

    def has_permission(self, request, view):
        profile = getattr(request, "wallet_profile", None)
        if not profile:
            wallet = getattr(request, "wallet_address", None)
            if not wallet:
                return False
            profile = WalletProfile.get_or_create_for_wallet(wallet)
        return profile.role == WalletProfile.Role.FARMER
