from django.db import models

class CleaningRule(models.Model):
    CATEGORY_CHOICES = [
        ('INSTITUTION', 'Institution'),
        ('PROGRAMME', 'Programme'),
        ('QUALIFICATION', 'Qualification'),
        ('PROVINCE', 'Province'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    pattern = models.CharField(max_length=255, help_text="The value to look for (e.g., 'UNZA')")
    replacement = models.CharField(max_length=255, help_text="The normalized value (e.g., 'University of Zambia')")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.category}] {self.pattern} -> {self.replacement}"

    class Meta:
        ordering = ['category', 'pattern']
