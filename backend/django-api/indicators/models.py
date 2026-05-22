from django.db import models

class Indicator(models.Model):
    CATEGORIES = [
        ('SDG4', 'SDG 4 - Quality Education'),
        ('CESA', 'CESA - Continental Education Strategy'),
        ('HEA_KPI', 'HEA Key Performance Indicators'),
        ('INSTITUTIONAL', 'Institutional KPIs'),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORIES)
    formula = models.TextField(help_text="LaTeX or descriptive formula")
    target_value = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=50, default='Percentage')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class IndicatorValue(models.Model):
    indicator = models.ForeignKey(Indicator, on_delete=models.CASCADE, related_name='values')
    institution = models.ForeignKey('institutions.Institution', on_delete=models.CASCADE, null=True, blank=True)
    year = models.IntegerField()
    value = models.FloatField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['indicator', 'institution', 'year']
        ordering = ['-year', 'indicator']
