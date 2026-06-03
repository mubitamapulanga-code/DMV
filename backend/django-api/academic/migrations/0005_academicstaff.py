from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academic', '0004_programme_academic_field'),
        ('institutions', '0003_institution_district'),
    ]

    operations = [
        migrations.CreateModel(
            name='AcademicStaff',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('staff_id',   models.CharField(max_length=50, unique=True)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name',  models.CharField(max_length=100)),
                ('gender',     models.CharField(max_length=1, choices=[('M','Male'),('F','Female'),('O','Other')])),
                ('date_of_birth', models.DateField(null=True, blank=True)),
                ('national_id',   models.CharField(max_length=50, null=True, blank=True)),
                ('email',         models.EmailField(null=True, blank=True)),
                ('phone',         models.CharField(max_length=20, null=True, blank=True)),
                ('institution', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='academic_staff',
                    to='institutions.institution',
                )),
                ('department',  models.CharField(max_length=255, null=True, blank=True)),
                ('rank', models.CharField(max_length=30, choices=[
                    ('PROFESSOR',           'Professor'),
                    ('ASSOCIATE_PROFESSOR', 'Associate Professor'),
                    ('ASSISTANT_PROFESSOR', 'Assistant Professor'),
                    ('SENIOR_LECTURER',     'Senior Lecturer'),
                    ('LECTURER',            'Lecturer'),
                    ('JUNIOR_LECTURER',     'Junior Lecturer'),
                    ('TUTORIAL_FELLOW',     'Tutorial Fellow'),
                    ('TEACHING_ASSISTANT',  'Teaching Assistant'),
                    ('RESEARCHER',          'Researcher'),
                    ('OTHER',               'Other'),
                ])),
                ('employment_type', models.CharField(
                    max_length=20, default='FULL_TIME',
                    choices=[
                        ('FULL_TIME', 'Full-time'),
                        ('PART_TIME', 'Part-time'),
                        ('CONTRACT',  'Contract'),
                        ('ADJUNCT',   'Adjunct'),
                        ('VISITING',  'Visiting'),
                    ],
                )),
                ('status', models.CharField(
                    max_length=20, default='ACTIVE',
                    choices=[
                        ('ACTIVE',   'Active'),
                        ('INACTIVE', 'Inactive'),
                        ('ON_LEAVE', 'On Leave'),
                        ('RETIRED',  'Retired'),
                    ],
                )),
                ('year_appointed', models.IntegerField(null=True, blank=True)),
                ('highest_qualification', models.CharField(
                    max_length=30, null=True, blank=True,
                    choices=[
                        ('PHD',              'Doctorate (PhD)'),
                        ('MASTERS',          "Master's Degree"),
                        ('POSTGRAD_DIPLOMA', 'Postgraduate Diploma'),
                        ('BACHELOR',         "Bachelor's Degree"),
                        ('OTHER',            'Other'),
                    ],
                )),
                ('specialisation', models.CharField(max_length=255, null=True, blank=True)),
                ('academic_field', models.CharField(
                    max_length=30, null=True, blank=True,
                    choices=[
                        ('AGRICULTURE', 'Agriculture, Forestry, Fisheries and Veterinary Medicine'),
                        ('ARTS',        'Arts and Humanities'),
                        ('BUSINESS',    'Business, Administration and Law'),
                        ('EDUCATION',   'Education'),
                        ('ENGINEERING', 'Engineering, Manufacturing and Construction'),
                        ('HEALTH',      'Health and Welfare'),
                        ('ICT',         'Information and Communication Technology'),
                        ('NATURAL_SCI', 'Natural Sciences, Mathematics and Statistics'),
                        ('SERVICES',    'Services and Hospitality'),
                        ('SOCIAL_SCI',  'Social Sciences'),
                        ('OTHER',       'Others'),
                    ],
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name':        'Academic Staff',
                'verbose_name_plural': 'Academic Staff',
                'ordering':            ['institution', 'last_name'],
            },
        ),
    ]
