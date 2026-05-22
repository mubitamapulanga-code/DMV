from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('HEA_ADMIN', 'HEA Admin'),
        ('DATA_MANAGER', 'Data Manager'),
        ('ANALYST', 'Analyst'),
        ('QA_OFFICER', 'QA Officer'),
        ('MINISTRY_USER', 'Ministry User'),
        ('HEI_USER', 'HEI User'),
        ('PUBLIC_USER', 'Public User'),
    ]

    role = models.CharField(max_length=20, choices=ROLES, default='PUBLIC_USER')
    institution = models.ForeignKey('institutions.Institution', on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    is_mfa_enabled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
