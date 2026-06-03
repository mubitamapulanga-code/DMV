from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academic', '0003_alter_student_institution'),
    ]

    operations = [
        migrations.AddField(
            model_name='programme',
            name='academic_field',
            field=models.CharField(
                max_length=30,
                null=True,
                blank=True,
                choices=[
                    ('AGRICULTURE', 'Agriculture, Forestry, Fisheries and Veterinary Medicine'),
                    ('ARTS', 'Arts and Humanities'),
                    ('BUSINESS', 'Business, Administration and Law'),
                    ('EDUCATION', 'Education'),
                    ('ENGINEERING', 'Engineering, Manufacturing and Construction'),
                    ('HEALTH', 'Health and Welfare'),
                    ('ICT', 'Information and Communication Technology'),
                    ('NATURAL_SCI', 'Natural Sciences, Mathematics and Statistics'),
                    ('SERVICES', 'Services and Hospitality'),
                    ('SOCIAL_SCI', 'Social Sciences'),
                    ('OTHER', 'Others'),
                ],
            ),
        ),
    ]
