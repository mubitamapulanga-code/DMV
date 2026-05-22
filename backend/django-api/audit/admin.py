from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'resource_type', 'resource_id', 'ip_address')
    list_filter = ('action', 'resource_type', 'timestamp')
    search_fields = ('user__username', 'description', 'resource_type', 'resource_id')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp', 'user', 'action', 'resource_type', 'resource_id',
                       'description', 'ip_address', 'user_agent', 'metadata')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
