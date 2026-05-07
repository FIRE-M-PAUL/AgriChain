import uuid
from io import BytesIO

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models


class Product(models.Model):
    class LifecycleStatus(models.TextChoices):
        RECORDED = "recorded", "Recorded"
        VERIFIED = "verified", "Verified"
        IN_TRANSIT = "in_transit", "In Transit"
        DELIVERED = "delivered", "Delivered"
        SOLD = "sold", "Sold"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        FAILED = "failed", "Failed"

    crop_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    description = models.TextField(blank=True)
    farmer_wallet = models.CharField(max_length=120, db_index=True, default="")
    unique_code = models.CharField(max_length=32, unique=True, editable=False)
    qr_code = models.ImageField(upload_to="qrcodes/", blank=True)
    ai_status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    ai_confidence = models.FloatField(default=0)
    ai_summary = models.CharField(max_length=255, blank=True)
    blockchain_status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    blockchain_hash = models.CharField(max_length=120, blank=True)
    blockchain_tx = models.CharField(max_length=120, blank=True)
    scan_count = models.PositiveIntegerField(default=0)
    lifecycle_status = models.CharField(max_length=20, choices=LifecycleStatus.choices, default=LifecycleStatus.RECORDED)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.unique_code:
            self.unique_code = uuid.uuid4().hex[:12].upper()
        super().save(*args, **kwargs)
        if is_new and not self.qr_code:
            product_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/products/{self.unique_code}"
            qr_image = qrcode.make(product_url)
            buffer = BytesIO()
            qr_image.save(buffer, format="PNG")
            self.qr_code.save(
                f"{self.unique_code}.png",
                ContentFile(buffer.getvalue()),
                save=False,
            )
            super().save(update_fields=["qr_code"])

    @property
    def qr_code_url(self):
        if self.qr_code:
            return f"{settings.BACKEND_BASE_URL.rstrip('/')}{settings.MEDIA_URL}{self.qr_code.name}"
        return ""

    def __str__(self):
        return f"{self.crop_name} - {self.unique_code}"


class ProductEvent(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=50)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.unique_code} - {self.event_type}"
