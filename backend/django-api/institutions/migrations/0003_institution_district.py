from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('institutions', '0002_institution_email_institution_established_year_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='institution',
            name='district',
            field=models.CharField(max_length=100, null=True, blank=True),
        ),
    ]
