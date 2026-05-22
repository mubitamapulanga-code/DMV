from django.db import models


class Institution(models.Model):
    TYPES = [
        ('PUBLIC', 'Public University'),
        ('PRIVATE', 'Private University'),
        ('COLLEGE', 'College'),
        ('TECHNICAL', 'Technical/Vocational'),
    ]

    PROVINCES = [
        ('LUSAKA', 'Lusaka'),
        ('COPPERBELT', 'Copperbelt'),
        ('CENTRAL', 'Central'),
        ('SOUTHERN', 'Southern'),
        ('EASTERN', 'Eastern'),
        ('WESTERN', 'Western'),
        ('NORTHERN', 'Northern'),
        ('NORTH_WESTERN', 'North Western'),
        ('LUAPULA', 'Luapula'),
        ('MUCHINGA', 'Muchinga'),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=20, choices=TYPES)
    province = models.CharField(max_length=50, choices=PROVINCES)
    registration_number = models.CharField(max_length=100, unique=True)
    address = models.TextField(null=True, blank=True)
    website = models.URLField(null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=30, null=True, blank=True)
    established_year = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Campus(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='campuses')
    name = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    province = models.CharField(max_length=50, choices=Institution.PROVINCES, null=True, blank=True)
    is_main_campus = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.institution.name} – {self.name}"

    class Meta:
        ordering = ['institution', 'name']
        verbose_name_plural = 'Campuses'
