from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Programme, Student, Enrollment
from .serializers import ProgrammeSerializer, StudentSerializer, EnrollmentSerializer


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
