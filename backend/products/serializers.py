from rest_framework import serializers

from .models import Product, ProductEvent


class ProductEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductEvent
        fields = ["id", "event_type", "description", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(source="unique_code", read_only=True)
    qr_code_url = serializers.CharField(read_only=True)
    farmer_wallet = serializers.CharField(read_only=True)
    events = ProductEventSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "crop_name",
            "quantity",
            "description",
            "product_id",
            "unique_code",
            "qr_code",
            "qr_code_url",
            "farmer_wallet",
            "ai_status",
            "ai_confidence",
            "ai_summary",
            "blockchain_status",
            "blockchain_hash",
            "blockchain_tx",
            "scan_count",
            "lifecycle_status",
            "created_at",
            "events",
        ]
        read_only_fields = [
            "id",
            "unique_code",
            "qr_code",
            "created_at",
            "farmer_wallet",
            "ai_status",
            "ai_confidence",
            "ai_summary",
            "blockchain_status",
            "blockchain_hash",
            "blockchain_tx",
            "scan_count",
        ]
