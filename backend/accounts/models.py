from django.contrib.auth.models import User
from django.db import models


class FarmerProfile(models.Model):
    class Role(models.TextChoices):
        FARMER = "farmer", "Farmer"
        BUYER = "buyer", "Buyer"
        SUPER_ADMIN = "super_admin", "Super Admin"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="farmer_profile")
    full_name = models.CharField(max_length=120)
    phone_number = models.CharField(max_length=20, blank=True)
    farm_name = models.CharField(max_length=120, blank=True)
    province = models.CharField(max_length=120, blank=True)
    wallet_address = models.CharField(max_length=120, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FARMER)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.role})"
