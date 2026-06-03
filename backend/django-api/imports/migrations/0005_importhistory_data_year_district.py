from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('imports', '0004_add_flagged_records'),
    ]

    operations = [
        migrations.AddField(
            model_name='importhistory',
            name='data_year',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='Academic year the data belongs to',
            ),
        ),
        migrations.AddField(
            model_name='importhistory',
            name='district',
            field=models.CharField(
                max_length=100, null=True, blank=True,
                help_text='District the data belongs to',
            ),
        ),
    ]
