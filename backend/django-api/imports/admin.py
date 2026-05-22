from django.contrib import admin
from .models import ImportHistory


@admin.register(ImportHistory)
class ImportHistoryAdmin(admin.ModelAdmin):
    list_display = ('filename', 'status', 'total_records', 'processed_records', 'created_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('filename',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
