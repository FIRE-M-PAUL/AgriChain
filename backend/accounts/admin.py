from django.contrib import admin

from .models import FarmerProfile


@admin.register(FarmerProfile)
class FarmerProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "role", "farm_name", "province", "email_verified")
    search_fields = ("full_name", "user__email", "farm_name", "province")
