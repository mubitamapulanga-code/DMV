from rest_framework import serializers
from .models import Programme, Student, Enrollment, AcademicStaff


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


class AcademicStaffSerializer(serializers.ModelSerializer):
    institution_name   = serializers.CharField(source='institution.name',   read_only=True)
    institution_type   = serializers.CharField(source='institution.type',   read_only=True)
    institution_province = serializers.CharField(source='institution.province', read_only=True)
    rank_display            = serializers.CharField(source='get_rank_display',            read_only=True)
    employment_type_display = serializers.CharField(source='get_employment_type_display', read_only=True)
    status_display          = serializers.CharField(source='get_status_display',          read_only=True)
    qualification_display   = serializers.CharField(source='get_highest_qualification_display', read_only=True)
    gender_display          = serializers.CharField(source='get_gender_display',          read_only=True)

    class Meta:
        model  = AcademicStaff
        fields = '__all__'
