from django.contrib.auth.models import User
from rest_framework import serializers

from .models import FarmerProfile


class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True)
    farm_name = serializers.CharField(write_only=True)
    province = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["full_name", "email", "phone_number", "farm_name", "province", "password"]

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "").strip()
        phone_number = validated_data.pop("phone_number", "").strip()
        farm_name = validated_data.pop("farm_name", "").strip()
        province = validated_data.pop("province", "").strip()
        first_name, last_name = (full_name.split(" ", 1) + [""])[:2]
        email = validated_data["email"].strip().lower()
        username = email
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=validated_data["password"],
        )
        FarmerProfile.objects.create(
            user=user,
            full_name=full_name or username,
            phone_number=phone_number,
            farm_name=farm_name,
            province=province,
            role=FarmerProfile.Role.FARMER,
        )
        return user


class FarmerProfileSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source="farmer_profile.phone_number", read_only=True)
    farm_name = serializers.CharField(source="farmer_profile.farm_name", read_only=True)
    province = serializers.CharField(source="farmer_profile.province", read_only=True)
    role = serializers.CharField(source="farmer_profile.role", read_only=True)
    wallet_address = serializers.CharField(source="farmer_profile.wallet_address", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone_number",
            "farm_name",
            "province",
            "role",
            "wallet_address",
        ]

    def get_full_name(self, obj):
        if hasattr(obj, "farmer_profile") and obj.farmer_profile.full_name:
            return obj.farmer_profile.full_name
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
