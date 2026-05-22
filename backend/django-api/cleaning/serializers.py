from rest_framework import serializers
from .models import CleaningRule


class CleaningRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CleaningRule
        fields = '__all__'
