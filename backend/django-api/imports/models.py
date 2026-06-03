from django.db import models
from django.conf import settings


class ImportHistory(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    IMPORT_TYPE_CHOICES = [
        ('AUTO', 'Auto-detect'),
        ('INSTITUTIONS', 'Institutions'),
        ('STUDENTS', 'Students'),
        ('PROGRAMMES', 'Programmes'),
        ('ENROLLMENTS', 'Enrollments'),
        ('INDICATORS', 'Indicator Data'),
        ('STAFF', 'Academic Staff'),
    ]

    file = models.FileField(upload_to='imports/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    import_type = models.CharField(max_length=20, choices=IMPORT_TYPE_CHOICES, default='AUTO')
    # Metadata supplied by the user at upload time
    data_year = models.IntegerField(null=True, blank=True, help_text='Academic year the data belongs to')
    district = models.CharField(max_length=100, null=True, blank=True, help_text='District the data belongs to')
    total_records = models.IntegerField(default=0)
    processed_records = models.IntegerField(default=0)
    failed_records = models.IntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    # Structured list of rows that could not be fully matched (e.g. unknown programme)
    flagged_records = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='imports'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.filename} – {self.status}"

    class Meta:
        ordering = ['-created_at']
