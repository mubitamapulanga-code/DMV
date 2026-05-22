from django.contrib import admin
from .models import CleaningRule


@admin.register(CleaningRule)
class CleaningRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'pattern', 'replacement', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'pattern', 'replacement')
    ordering = ('category', 'pattern')
    readonly_fields = ('created_at', 'updated_at')
