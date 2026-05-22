from rest_framework import serializers
from .models import Institution, Campus


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = '__all__'


class InstitutionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    province_display = serializers.CharField(source='get_province_display', read_only=True)
    campus_count = serializers.SerializerMethodField()

    class Meta:
        model = Institution
        fields = '__all__'

    def get_campus_count(self, obj):
        return obj.campuses.count()


class InstitutionDetailSerializer(InstitutionSerializer):
    campuses = CampusSerializer(many=True, read_only=True)

    class Meta(InstitutionSerializer.Meta):
        pass
