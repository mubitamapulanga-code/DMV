from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    generated_by_username = serializers.CharField(source='generated_by.username', read_only=True)

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('status', 'file', 'file_size_kb', 'error_message', 'created_at', 'updated_at')
