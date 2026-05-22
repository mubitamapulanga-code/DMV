from django.db import models
from django.conf import settings


class Programme(models.Model):
    LEVELS = [
        ('CERTIFICATE', 'Certificate'),
        ('DIPLOMA', 'Diploma'),
        ('BACHELOR', "Bachelor's Degree"),
        ('POSTGRAD_DIPLOMA', 'Postgraduate Diploma'),
        ('MASTERS', "Master's Degree"),
        ('PHD', 'Doctorate (PhD)'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('DISCONTINUED', 'Discontinued'),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    institution = models.ForeignKey(
        'institutions.Institution',
        on_delete=models.CASCADE,
        related_name='programmes'
    )
    level = models.CharField(max_length=30, choices=LEVELS)
    duration_years = models.FloatField(default=3.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    accreditation_number = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} – {self.name} ({self.institution.name})"

    class Meta:
        ordering = ['institution', 'name']


class Student(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]

    STATUS_CHOICES = [
        ('ENROLLED', 'Enrolled'),
        ('GRADUATED', 'Graduated'),
        ('DEFERRED', 'Deferred'),
        ('WITHDRAWN', 'Withdrawn'),
        ('SUSPENDED', 'Suspended'),
    ]

    student_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    province_of_origin = models.CharField(max_length=50, null=True, blank=True)
    institution = models.ForeignKey(
        'institutions.Institution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='students'
    )
    programme = models.ForeignKey(
        Programme,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ENROLLED')
    year_of_entry = models.IntegerField()
    year_of_completion = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student_id} – {self.first_name} {self.last_name}"

    class Meta:
        ordering = ['-year_of_entry', 'last_name']


class Enrollment(models.Model):
    """Aggregate enrollment record per institution/programme/year."""
    institution = models.ForeignKey(
        'institutions.Institution',
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    programme = models.ForeignKey(
        Programme,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollments'
    )
    academic_year = models.IntegerField()
    total_enrolled = models.IntegerField(default=0)
    male_count = models.IntegerField(default=0)
    female_count = models.IntegerField(default=0)
    graduates = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['institution', 'programme', 'academic_year']
        ordering = ['-academic_year', 'institution']

    def __str__(self):
        return f"{self.institution.name} – {self.academic_year} ({self.total_enrolled} enrolled)"
