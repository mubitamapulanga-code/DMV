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
    ]

    file = models.FileField(upload_to='imports/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    import_type = models.CharField(max_length=20, choices=IMPORT_TYPE_CHOICES, default='AUTO')
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
