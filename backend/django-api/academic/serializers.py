from rest_framework import serializers
from .models import Programme, Student, Enrollment


class ProgrammeSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)

    class Meta:
        model = Programme
        fields = '__all__'


class StudentSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    programme_name = serializers.CharField(source='programme.name', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'


class EnrollmentSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    programme_name = serializers.CharField(source='programme.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'
