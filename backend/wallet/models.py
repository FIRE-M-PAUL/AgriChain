import secrets

from django.db import models
from django.utils import timezone


class WalletChallenge(models.Model):
    wallet_address = models.CharField(max_length=120, db_index=True)
    nonce = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    @classmethod
    def create_for_wallet(cls, wallet_address):
        return cls.objects.create(
            wallet_address=wallet_address,
            nonce=secrets.token_hex(16),
        )


class WalletSession(models.Model):
    wallet_address = models.CharField(max_length=120, db_index=True)
    token = models.CharField(max_length=80, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    @classmethod
    def create_session(cls, wallet_address, valid_hours=24):
        return cls.objects.create(
            wallet_address=wallet_address,
            token=secrets.token_urlsafe(40),
            expires_at=timezone.now() + timezone.timedelta(hours=valid_hours),
        )


class WalletProfile(models.Model):
    class Role(models.TextChoices):
        FARMER = "farmer", "Farmer"
        BUYER = "buyer", "Buyer"

    class VerificationLevel(models.IntegerChoices):
        LEVEL_1_CONNECTED = 1, "Wallet Connected"
        LEVEL_2_DECLARED = 2, "Unverified Farmer"
        LEVEL_3_VERIFIED = 3, "Verified Farmer"

    wallet_address = models.CharField(max_length=120, unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, blank=True)
    verification_level = models.IntegerField(
        choices=VerificationLevel.choices,
        default=VerificationLevel.LEVEL_1_CONNECTED,
    )
    trust_score = models.PositiveIntegerField(default=0)
    verification_percentage = models.PositiveIntegerField(default=0)
    reputation_rank = models.CharField(max_length=40, default="Seedling")
    buyer_scan_activity = models.PositiveIntegerField(default=0)
    successful_products = models.PositiveIntegerField(default=0)
    is_flagged = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_or_create_for_wallet(cls, wallet_address):
        profile, _ = cls.objects.get_or_create(wallet_address=wallet_address)
        return profile


class FarmerVerification(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        AI_REVIEWED = "ai_reviewed", "AI Reviewed"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    profile = models.OneToOneField(WalletProfile, on_delete=models.CASCADE, related_name="farmer_verification")
    farm_name = models.CharField(max_length=120)
    province = models.CharField(max_length=80)
    district = models.CharField(max_length=80)
    farm_description = models.TextField(blank=True)
    national_id = models.CharField(max_length=80)
    cooperative_card_id = models.CharField(max_length=80, blank=True)
    agricultural_license_id = models.CharField(max_length=80, blank=True)
    claimed_crop = models.CharField(max_length=80, blank=True)
    farm_image = models.ImageField(upload_to="farmer_verification/farm_images/", blank=True, null=True)
    crop_image_url = models.URLField(blank=True)
    harvest_image_url = models.URLField(blank=True)
    ai_confidence_score = models.FloatField(default=0)
    ai_authenticity_result = models.CharField(max_length=120, blank=True)
    crop_match_status = models.CharField(max_length=120, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    blockchain_verification_hash = models.CharField(max_length=120, blank=True)
    verification_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def farm_image_url(self):
        if self.farm_image:
            return self.farm_image.url
        return ""
