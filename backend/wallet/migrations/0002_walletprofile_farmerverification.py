from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WalletProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("wallet_address", models.CharField(db_index=True, max_length=120, unique=True)),
                ("role", models.CharField(blank=True, choices=[("farmer", "Farmer"), ("buyer", "Buyer")], max_length=20)),
                ("verification_level", models.IntegerField(choices=[(1, "Wallet Connected"), (2, "Unverified Farmer"), (3, "Verified Farmer")], default=1)),
                ("trust_score", models.PositiveIntegerField(default=0)),
                ("verification_percentage", models.PositiveIntegerField(default=0)),
                ("reputation_rank", models.CharField(default="Seedling", max_length=40)),
                ("buyer_scan_activity", models.PositiveIntegerField(default=0)),
                ("successful_products", models.PositiveIntegerField(default=0)),
                ("is_flagged", models.BooleanField(default=False)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="FarmerVerification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("farm_name", models.CharField(max_length=120)),
                ("province", models.CharField(max_length=80)),
                ("district", models.CharField(max_length=80)),
                ("farm_description", models.TextField(blank=True)),
                ("national_id", models.CharField(max_length=80)),
                ("cooperative_card_id", models.CharField(blank=True, max_length=80)),
                ("agricultural_license_id", models.CharField(blank=True, max_length=80)),
                ("claimed_crop", models.CharField(blank=True, max_length=80)),
                ("farm_image_url", models.URLField(blank=True)),
                ("crop_image_url", models.URLField(blank=True)),
                ("harvest_image_url", models.URLField(blank=True)),
                ("ai_confidence_score", models.FloatField(default=0)),
                ("ai_authenticity_result", models.CharField(blank=True, max_length=120)),
                ("crop_match_status", models.CharField(blank=True, max_length=120)),
                ("verification_status", models.CharField(choices=[("pending", "Pending"), ("ai_reviewed", "AI Reviewed"), ("verified", "Verified"), ("rejected", "Rejected")], default="pending", max_length=20)),
                ("blockchain_verification_hash", models.CharField(blank=True, max_length=120)),
                ("verification_timestamp", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("profile", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="farmer_verification", to="wallet.walletprofile")),
            ],
        ),
    ]
