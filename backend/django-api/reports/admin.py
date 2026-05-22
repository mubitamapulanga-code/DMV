from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'report_type', 'format', 'status', 'generated_by', 'created_at')
    list_filter = ('report_type', 'status', 'format')
    search_fields = ('title',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'status', 'file', 'file_size_kb', 'error_message')
