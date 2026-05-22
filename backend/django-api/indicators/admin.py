from django.contrib import admin
from .models import Indicator, IndicatorValue


@admin.register(Indicator)
class IndicatorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'unit', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('code', 'name', 'description')
    ordering = ('code',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(IndicatorValue)
class IndicatorValueAdmin(admin.ModelAdmin):
    list_display = ('indicator', 'institution', 'year', 'value', 'created_at')
    list_filter = ('year', 'indicator__category')
    search_fields = ('indicator__name', 'institution__name')
    ordering = ('-year', 'indicator')
