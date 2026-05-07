from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("crop_name", models.CharField(max_length=255)),
                ("quantity", models.PositiveIntegerField()),
                ("unique_code", models.CharField(editable=False, max_length=32, unique=True)),
                ("qr_code", models.ImageField(blank=True, upload_to="qrcodes/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("farmer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
