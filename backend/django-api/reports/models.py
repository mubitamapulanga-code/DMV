from django.db import models
from django.conf import settings


class Report(models.Model):
    REPORT_TYPES = [
        ('ENROLLMENT', 'Enrollment Report'),
        ('GRADUATION', 'Graduation Report'),
        ('INSTITUTION', 'Institution Report'),
        ('PROGRAMME', 'Programme Report'),
        ('INDICATOR', 'Indicator Report'),
        ('EXECUTIVE', 'Executive Summary'),
        ('COMPLIANCE', 'Compliance Report'),
        ('CUSTOM', 'Custom Report'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('GENERATING', 'Generating'),
        ('READY', 'Ready'),
        ('FAILED', 'Failed'),
    ]

    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('XLSX', 'Excel'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
    ]

    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=30, choices=REPORT_TYPES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='PDF')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    parameters = models.JSONField(default=dict, blank=True, help_text="Filters/params used to generate this report")
    file = models.FileField(upload_to='reports/%Y/%m/', null=True, blank=True)
    file_size_kb = models.FloatField(null=True, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reports'
    )
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.report_type}) – {self.status}"
