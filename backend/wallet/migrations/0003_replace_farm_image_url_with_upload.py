from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0002_walletprofile_farmerverification"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="farmerverification",
            name="farm_image_url",
        ),
        migrations.AddField(
            model_name="farmerverification",
            name="farm_image",
            field=models.ImageField(blank=True, null=True, upload_to="farmer_verification/farm_images/"),
        ),
    ]
