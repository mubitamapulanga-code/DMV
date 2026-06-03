from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Programme, Student, Enrollment, AcademicStaff
from .serializers import (
    ProgrammeSerializer, StudentSerializer,
    EnrollmentSerializer, AcademicStaffSerializer,
)


class ProgrammeViewSet(viewsets.ModelViewSet):
    queryset = Programme.objects.select_related('institution').all()
    serializer_class = ProgrammeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['institution', 'level', 'status']
    search_fields = ['name', 'code', 'institution__name']
    ordering_fields = ['name', 'level', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['delete'], url_path='clear_all', permission_classes=[permissions.IsAdminUser])
    def clear_all(self, request):
        """Delete all programmes (cascades to related data)."""
        count, _ = Programme.objects.all().delete()
        return Response({'message': f'Successfully deleted {count} programmes.'})


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('institution', 'programme').all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['institution', 'programme', 'status', 'gender', 'year_of_entry']
    search_fields = ['student_id', 'first_name', 'last_name', 'email', 'national_id']
    ordering_fields = ['last_name', 'year_of_entry', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['delete'], url_path='clear_all', permission_classes=[permissions.IsAdminUser])
    def clear_all(self, request):
        """Delete all students."""
        count, _ = Student.objects.all().delete()
        return Response({'message': f'Successfully deleted {count} students.'})


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related('institution', 'programme').all()
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['institution', 'programme', 'academic_year']
    ordering_fields = ['academic_year', 'total_enrolled']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['delete'], url_path='clear_all', permission_classes=[permissions.IsAdminUser])
    def clear_all(self, request):
        """Delete all enrollments."""
        count, _ = Enrollment.objects.all().delete()
        return Response({'message': f'Successfully deleted {count} enrollments.'})


class AcademicStaffViewSet(viewsets.ModelViewSet):
    queryset = AcademicStaff.objects.select_related('institution').all()
    serializer_class = AcademicStaffSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'institution', 'gender', 'rank', 'employment_type',
        'status', 'highest_qualification', 'academic_field', 'year_appointed',
    ]
    search_fields    = ['staff_id', 'first_name', 'last_name', 'email',
                        'department', 'specialisation', 'institution__name']
    ordering_fields  = ['last_name', 'rank', 'year_appointed', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['delete'], url_path='clear_all',
            permission_classes=[permissions.IsAdminUser])
    def clear_all(self, request):
        """Delete all academic staff records."""
        count, _ = AcademicStaff.objects.all().delete()
        return Response({'message': f'Successfully deleted {count} academic staff records.'})

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Return aggregate counts grouped by rank, gender, employment type and institution type."""
        from django.db.models import Count
        from institutions.models import Institution

        qs = AcademicStaff.objects.all()
        institution_id = request.query_params.get('institution')
        if institution_id:
            qs = qs.filter(institution_id=institution_id)

        total = qs.count()
        by_gender = list(qs.values('gender').annotate(count=Count('id')).order_by('gender'))
        by_rank   = list(qs.values('rank').annotate(count=Count('id')).order_by('-count'))
        by_employment = list(qs.values('employment_type').annotate(count=Count('id')).order_by('-count'))
        by_qualification = list(qs.values('highest_qualification').annotate(count=Count('id')).order_by('-count'))
        by_institution_type = list(
            qs.values('institution__type').annotate(count=Count('id')).order_by('-count')
        )
        by_field = list(
            qs.exclude(academic_field='').exclude(academic_field__isnull=True)
            .values('academic_field').annotate(count=Count('id')).order_by('-count')
        )

        return Response({
            'total':               total,
            'by_gender':           by_gender,
            'by_rank':             by_rank,
            'by_employment_type':  by_employment,
            'by_qualification':    by_qualification,
            'by_institution_type': by_institution_type,
            'by_academic_field':   by_field,
        })
