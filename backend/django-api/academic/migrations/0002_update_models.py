from django.db import migrations, models
import django.db.models.deletion


def populate_student_ids(apps, schema_editor):
    Student = apps.get_model('academic', 'Student')
    for student in Student.objects.all():
        student.student_id = f"STU-{student.id:06d}"
        student.save(update_fields=['student_id'])


def clear_enrollment_duplicates(apps, schema_editor):
    """Remove duplicate enrollments before applying unique_together constraint."""
    Enrollment = apps.get_model('academic', 'Enrollment')
    seen = set()
    for enrollment in Enrollment.objects.order_by('id'):
        key = (enrollment.institution_id, enrollment.programme_id, enrollment.academic_year)
        if key in seen:
            enrollment.delete()
        else:
            seen.add(key)


class Migration(migrations.Migration):

    dependencies = [
        ('academic', '0001_initial'),
        ('institutions', '0001_initial'),
    ]

    operations = [
        # ── Enrollment: remove unique_together first (references 'student') ──
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together=set(),
        ),

        # ── Enrollment: remove old fields ─────────────────────────────────────
        migrations.RemoveField(model_name='enrollment', name='student'),
        migrations.RemoveField(model_name='enrollment', name='year_of_study'),
        migrations.RemoveField(model_name='enrollment', name='status'),

        # ── Enrollment: update programme FK to nullable ───────────────────────
        migrations.AlterField(
            model_name='enrollment',
            name='programme',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='enrollments',
                to='academic.programme',
            ),
        ),

        # ── Enrollment: add new aggregate fields ──────────────────────────────
        migrations.AddField(
            model_name='enrollment',
            name='total_enrolled',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='enrollment',
            name='male_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='enrollment',
            name='female_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='enrollment',
            name='graduates',
            field=models.IntegerField(default=0),
        ),

        # ── Enrollment: new unique_together ───────────────────────────────────
        migrations.RunPython(clear_enrollment_duplicates, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together={('institution', 'programme', 'academic_year')},
        ),
        migrations.AlterModelOptions(
            name='enrollment',
            options={'ordering': ['-academic_year', 'institution']},
        ),

        # ── Programme: drop old fields ────────────────────────────────────────
        migrations.RemoveField(model_name='programme', name='nqf_level'),
        migrations.RemoveField(model_name='programme', name='is_active'),
        migrations.AlterField(
            model_name='programme',
            name='code',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AddField(
            model_name='programme',
            name='level',
            field=models.CharField(
                choices=[
                    ('CERTIFICATE', 'Certificate'),
                    ('DIPLOMA', 'Diploma'),
                    ('BACHELOR', "Bachelor's Degree"),
                    ('POSTGRAD_DIPLOMA', 'Postgraduate Diploma'),
                    ('MASTERS', "Master's Degree"),
                    ('PHD', 'Doctorate (PhD)'),
                ],
                default='BACHELOR',
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='programme',
            name='duration_years',
            field=models.FloatField(default=3.0),
        ),
        migrations.AddField(
            model_name='programme',
            name='status',
            field=models.CharField(
                choices=[
                    ('ACTIVE', 'Active'),
                    ('SUSPENDED', 'Suspended'),
                    ('DISCONTINUED', 'Discontinued'),
                ],
                default='ACTIVE',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='programme',
            name='accreditation_number',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='programme',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name='programme',
            options={'ordering': ['institution', 'name']},
        ),

        # ── Student: drop old fields ──────────────────────────────────────────
        migrations.RemoveField(model_name='student', name='nrc_number'),
        migrations.AlterField(
            model_name='student',
            name='date_of_birth',
            field=models.DateField(blank=True, null=True),
        ),

        # Add student_id as nullable first, populate, then make unique
        migrations.AddField(
            model_name='student',
            name='student_id',
            field=models.CharField(max_length=50, null=True, blank=True),
        ),
        migrations.RunPython(populate_student_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='student',
            name='student_id',
            field=models.CharField(max_length=50, unique=True),
        ),

        migrations.AddField(
            model_name='student',
            name='institution',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='students',
                to='institutions.institution',
            ),
        ),
        migrations.AddField(
            model_name='student',
            name='programme',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='students',
                to='academic.programme',
            ),
        ),
        migrations.AddField(
            model_name='student',
            name='status',
            field=models.CharField(
                choices=[
                    ('ENROLLED', 'Enrolled'),
                    ('GRADUATED', 'Graduated'),
                    ('DEFERRED', 'Deferred'),
                    ('WITHDRAWN', 'Withdrawn'),
                    ('SUSPENDED', 'Suspended'),
                ],
                default='ENROLLED',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='student',
            name='year_of_entry',
            field=models.IntegerField(default=2024),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='student',
            name='year_of_completion',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='student',
            name='national_id',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='student',
            name='email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='student',
            name='phone',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='student',
            name='province_of_origin',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterModelOptions(
            name='student',
            options={'ordering': ['-year_of_entry', 'last_name']},
        ),
    ]
