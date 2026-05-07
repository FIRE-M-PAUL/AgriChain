from django.contrib import admin

from .models import Product, ProductEvent


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("crop_name", "quantity", "farmer_wallet", "unique_code", "created_at")
    search_fields = ("crop_name", "unique_code", "farmer_wallet")


@admin.register(ProductEvent)
class ProductEventAdmin(admin.ModelAdmin):
    list_display = ("product", "event_type", "created_at")
    search_fields = ("product__unique_code", "event_type")
