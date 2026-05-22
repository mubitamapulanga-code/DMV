from rest_framework import serializers
from .models import ImportHistory

class ImportHistorySerializer(serializers.ModelSerializer):
    flagged_count = serializers.SerializerMethodField()

    class Meta:
        model = ImportHistory
        fields = '__all__'

    def get_flagged_count(self, obj):
        return len(obj.flagged_records) if obj.flagged_records else 0
