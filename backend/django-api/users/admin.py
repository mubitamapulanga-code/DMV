from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    fieldsets = UserAdmin.fieldsets + (
        ('HEA Profile', {
            'fields': ('role', 'institution', 'phone_number', 'is_mfa_enabled'),
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('HEA Profile', {
            'fields': ('role', 'institution', 'phone_number'),
        }),
    )
