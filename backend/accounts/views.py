from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .serializers import RegisterSerializer, FarmerProfileSerializer
from .models import FarmerProfile


class FarmerTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise self.fail("no_active_account")
        attrs["username"] = user.username
        attrs["password"] = password
        return super().validate(attrs)


class FarmerTokenObtainPairView(TokenObtainPairView):
    serializer_class = FarmerTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FarmerProfileSerializer

    def get(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WalletUpdateView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        wallet_address = request.data.get("wallet_address", "").strip()
        if not wallet_address:
            return Response({"detail": "wallet_address is required"}, status=status.HTTP_400_BAD_REQUEST)
        profile, _ = FarmerProfile.objects.get_or_create(
            user=request.user,
            defaults={"full_name": request.user.get_full_name() or request.user.username},
        )
        profile.wallet_address = wallet_address
        profile.save(update_fields=["wallet_address"])
        return Response({"detail": "Wallet address updated"}, status=status.HTTP_200_OK)
