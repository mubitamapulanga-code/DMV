from django.contrib import admin
from .models import Institution, Campus


class CampusInline(admin.TabularInline):
    model = Campus
    extra = 0
    fields = ('name', 'province', 'is_main_campus', 'address')


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'type', 'province', 'is_active', 'established_year', 'created_at')
    list_filter = ('type', 'province', 'is_active')
    search_fields = ('name', 'code', 'registration_number')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CampusInline]


@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution', 'province', 'is_main_campus')
    list_filter = ('province', 'is_main_campus')
    search_fields = ('name', 'institution__name')
