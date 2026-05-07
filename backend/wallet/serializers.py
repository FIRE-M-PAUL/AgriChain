from rest_framework import serializers

from .models import FarmerVerification, WalletProfile

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FARM_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


class WalletProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletProfile
        fields = [
            "wallet_address",
            "role",
            "verification_level",
            "trust_score",
            "verification_percentage",
            "reputation_rank",
            "buyer_scan_activity",
            "successful_products",
            "is_flagged",
            "joined_at",
        ]


class RoleSelectionSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=WalletProfile.Role.choices)


class FarmerVerificationSerializer(serializers.ModelSerializer):
    farm_image = serializers.ImageField(required=False, allow_null=True)
    farm_image_url = serializers.SerializerMethodField(read_only=True)

    def get_farm_image_url(self, obj):
        request = self.context.get("request")
        url = obj.farm_image_url
        if request and url:
            return request.build_absolute_uri(url)
        return url

    def validate_farm_image(self, value):
        if not value:
            return value

        filename = value.name.lower()
        if not any(filename.endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS):
            raise serializers.ValidationError("Invalid file type. Please upload JPG, JPEG, PNG, or WEBP.")

        if value.size > MAX_FARM_IMAGE_SIZE:
            raise serializers.ValidationError("Image size too large. Maximum allowed size is 5MB.")

        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise serializers.ValidationError("Invalid image content type.")
        return value

    class Meta:
        model = FarmerVerification
        fields = [
            "farm_name",
            "province",
            "district",
            "farm_description",
            "national_id",
            "cooperative_card_id",
            "agricultural_license_id",
            "claimed_crop",
            "farm_image",
            "farm_image_url",
            "crop_image_url",
            "harvest_image_url",
            "ai_confidence_score",
            "ai_authenticity_result",
            "crop_match_status",
            "verification_status",
            "blockchain_verification_hash",
            "verification_timestamp",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "ai_confidence_score",
            "ai_authenticity_result",
            "crop_match_status",
            "verification_status",
            "blockchain_verification_hash",
            "verification_timestamp",
            "created_at",
            "updated_at",
        ]
