from django.contrib import admin
from .models import Programme, Student, Enrollment, AcademicStaff


@admin.register(Programme)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'institution', 'level', 'status', 'created_at')
    list_filter = ('level', 'status', 'institution')
    search_fields = ('name', 'code', 'institution__name')
    ordering = ('institution', 'name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'first_name', 'last_name', 'gender', 'institution', 'programme', 'status', 'year_of_entry')
    list_filter = ('status', 'gender', 'institution', 'year_of_entry')
    search_fields = ('student_id', 'first_name', 'last_name', 'email', 'national_id')
    ordering = ('-year_of_entry', 'last_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('institution', 'programme', 'academic_year', 'total_enrolled', 'male_count', 'female_count', 'graduates')
    list_filter = ('academic_year', 'institution')
    search_fields = ('institution__name', 'programme__name')
    ordering = ('-academic_year', 'institution')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AcademicStaff)
class AcademicStaffAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'first_name', 'last_name', 'gender', 'institution',
                    'department', 'rank', 'employment_type', 'status', 'year_appointed')
    list_filter  = ('status', 'gender', 'rank', 'employment_type',
                    'highest_qualification', 'institution')
    search_fields = ('staff_id', 'first_name', 'last_name', 'email',
                     'department', 'specialisation', 'institution__name')
    ordering = ('institution', 'last_name')
    readonly_fields = ('created_at', 'updated_at')
