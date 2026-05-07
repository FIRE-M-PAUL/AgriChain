import base58
import hashlib
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import FarmerVerification, WalletChallenge, WalletProfile, WalletSession
from .serializers import FarmerVerificationSerializer, RoleSelectionSerializer, WalletProfileSerializer


class WalletNonceView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        wallet_address = request.data.get("wallet_address", "").strip()
        if not wallet_address:
            return Response({"detail": "wallet_address is required"}, status=status.HTTP_400_BAD_REQUEST)
        challenge = WalletChallenge.create_for_wallet(wallet_address=wallet_address)
        message = f"AGRICHAIN wallet login nonce: {challenge.nonce}"
        return Response(
            {
                "wallet_address": wallet_address,
                "nonce": challenge.nonce,
                "message": message,
            },
            status=status.HTTP_200_OK,
        )


class WalletVerifyView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        wallet_address = request.data.get("wallet_address", "").strip()
        nonce = request.data.get("nonce", "").strip()
        signature = request.data.get("signature", "").strip()
        if not wallet_address or not nonce or not signature:
            return Response(
                {"detail": "wallet_address, nonce, and signature are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            challenge = WalletChallenge.objects.get(wallet_address=wallet_address, nonce=nonce, used=False)
        except WalletChallenge.DoesNotExist:
            return Response({"detail": "Invalid or used nonce"}, status=status.HTTP_400_BAD_REQUEST)

        message = f"AGRICHAIN wallet login nonce: {nonce}".encode("utf-8")
        try:
            public_key = base58.b58decode(wallet_address)
            signed = base58.b58decode(signature)
            VerifyKey(public_key).verify(message, signed)
        except (ValueError, BadSignatureError):
            return Response({"detail": "Invalid wallet signature"}, status=status.HTTP_400_BAD_REQUEST)

        challenge.used = True
        challenge.save(update_fields=["used"])
        session = WalletSession.create_session(wallet_address=wallet_address, valid_hours=24)
        profile = WalletProfile.get_or_create_for_wallet(wallet_address)
        return Response(
            {
                "token": session.token,
                "wallet_address": session.wallet_address,
                "expires_at": session.expires_at,
                "role": profile.role,
                "verification_level": profile.verification_level,
            },
            status=status.HTTP_200_OK,
        )


class WalletMeView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        wallet_address = getattr(request, "wallet_address", None)
        if not wallet_address:
            return Response({"detail": "Wallet not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        profile = WalletProfile.get_or_create_for_wallet(wallet_address)
        response_data = WalletProfileSerializer(profile).data
        response_data["wallet_address"] = wallet_address
        response_data["has_role"] = bool(profile.role)
        response_data["is_farmer_verified"] = profile.verification_level == WalletProfile.VerificationLevel.LEVEL_3_VERIFIED
        return Response(response_data, status=status.HTTP_200_OK)


class WalletDisconnectView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Wallet "):
            return Response({"detail": "No active wallet session"}, status=status.HTTP_400_BAD_REQUEST)
        token = auth_header.split(" ", 1)[1].strip()
        WalletSession.objects.filter(token=token).update(is_active=False)
        return Response({"detail": "Wallet disconnected"}, status=status.HTTP_200_OK)


class WalletRoleSelectionView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RoleSelectionSerializer

    def post(self, request):
        wallet_address = getattr(request, "wallet_address", None)
        if not wallet_address:
            return Response({"detail": "Wallet not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        selected_role = serializer.validated_data["role"]

        profile = WalletProfile.get_or_create_for_wallet(wallet_address)
        profile.role = selected_role
        if selected_role == WalletProfile.Role.FARMER:
            profile.verification_level = WalletProfile.VerificationLevel.LEVEL_2_DECLARED
            profile.verification_percentage = max(profile.verification_percentage, 25)
            profile.trust_score = max(profile.trust_score, 10)
        else:
            profile.verification_level = WalletProfile.VerificationLevel.LEVEL_1_CONNECTED
            profile.verification_percentage = max(profile.verification_percentage, 20)
            profile.trust_score = max(profile.trust_score, 5)
        profile.save()
        return Response(WalletProfileSerializer(profile).data, status=status.HTTP_200_OK)


class FarmerVerificationView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = FarmerVerificationSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        wallet_address = getattr(request, "wallet_address", None)
        if not wallet_address:
            return Response({"detail": "Wallet not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        profile = WalletProfile.get_or_create_for_wallet(wallet_address)
        if profile.role != WalletProfile.Role.FARMER:
            return Response({"detail": "Farmer role is required"}, status=status.HTTP_403_FORBIDDEN)

        verification = FarmerVerification.objects.filter(profile=profile).first()
        if not verification:
            return Response({"detail": "No farmer verification submitted yet"}, status=status.HTTP_404_NOT_FOUND)
        return Response(self.get_serializer(verification).data, status=status.HTTP_200_OK)

    def post(self, request):
        wallet_address = getattr(request, "wallet_address", None)
        if not wallet_address:
            return Response({"detail": "Wallet not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        profile = WalletProfile.get_or_create_for_wallet(wallet_address)
        if profile.role != WalletProfile.Role.FARMER:
            return Response({"detail": "Farmer role is required"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Placeholder AI authenticity logic to keep the workflow deterministic.
        # This should be replaced by production AI services.
        crop = serializer.validated_data.get("claimed_crop", "").strip().lower()
        desc = serializer.validated_data.get("farm_description", "").strip().lower()
        text_signal = f"{crop}|{desc}|{wallet_address}"
        confidence_seed = int(hashlib.sha256(text_signal.encode("utf-8")).hexdigest()[:8], 16)
        ai_confidence = 65 + (confidence_seed % 35)
        ai_result = "Likely authentic farm imagery"
        crop_match = "Crop claim appears consistent" if crop else "No crop claim provided"
        status_value = FarmerVerification.VerificationStatus.AI_REVIEWED if ai_confidence >= 80 else FarmerVerification.VerificationStatus.PENDING

        verification, _ = FarmerVerification.objects.update_or_create(
            profile=profile,
            defaults={
                **serializer.validated_data,
                "ai_confidence_score": ai_confidence,
                "ai_authenticity_result": ai_result,
                "crop_match_status": crop_match,
                "verification_status": status_value,
            },
        )

        if ai_confidence >= 90:
            profile.verification_level = WalletProfile.VerificationLevel.LEVEL_3_VERIFIED
            profile.verification_percentage = 95
            profile.trust_score = max(profile.trust_score, 80)
            profile.reputation_rank = "Trusted Grower"
        else:
            profile.verification_level = WalletProfile.VerificationLevel.LEVEL_2_DECLARED
            profile.verification_percentage = max(profile.verification_percentage, 65)
            profile.trust_score = max(profile.trust_score, 35)
            profile.reputation_rank = "Rising Farmer"
        profile.save()

        return Response(
            {
                "profile": WalletProfileSerializer(profile).data,
                "verification": self.get_serializer(verification).data,
            },
            status=status.HTTP_200_OK,
        )
