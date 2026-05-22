from rest_framework import viewsets, views, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Count, Sum, Avg
from .models import Institution, Campus
from .serializers import InstitutionSerializer, InstitutionDetailSerializer, CampusSerializer


class InstitutionViewSet(viewsets.ModelViewSet):
    queryset = Institution.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'province', 'is_active']
    search_fields = ['name', 'code', 'registration_number']
    ordering_fields = ['name', 'created_at', 'established_year']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InstitutionDetailSerializer
        return InstitutionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=['delete'], url_path='clear_all', permission_classes=[permissions.IsAdminUser])
    def clear_all(self, request):
        """Delete all institutions (cascades to related data)."""
        count, _ = Institution.objects.all().delete()
        return Response({'message': f'Successfully deleted {count} institutions.'})

    @action(detail=True, methods=['get'], url_path='performance')
    def performance(self, request, pk=None):
        """Return performance metrics for a specific institution."""
        institution = self.get_object()
        from indicators.models import Indicator, IndicatorValue

        year = int(request.query_params.get('year', 2024))

        enrollment_ind = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        graduation_ind = Indicator.objects.filter(code='GRADUATION_RATE').first()

        students = 0
        grad_rate = 0.0

        if enrollment_ind:
            agg = IndicatorValue.objects.filter(
                indicator=enrollment_ind, institution=institution, year=year
            ).aggregate(Sum('value'))
            students = agg['value__sum'] or 0

        if graduation_ind:
            agg = IndicatorValue.objects.filter(
                indicator=graduation_ind, institution=institution, year=year
            ).aggregate(Avg('value'))
            grad_rate = round(agg['value__avg'] or 0, 1)

        # Year-over-year enrollment trend
        trend = []
        if enrollment_ind:
            for y in range(year - 4, year + 1):
                agg = IndicatorValue.objects.filter(
                    indicator=enrollment_ind, institution=institution, year=y
                ).aggregate(Sum('value'))
                trend.append({'year': y, 'students': agg['value__sum'] or 0})

        return Response({
            'institution': InstitutionSerializer(institution).data,
            'year': year,
            'total_students': students,
            'graduation_rate': grad_rate,
            'programme_count': institution.programmes.filter(status='ACTIVE').count(),
            'campus_count': institution.campuses.count(),
            'enrollment_trend': trend,
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Aggregate stats across all institutions."""
        total = Institution.objects.count()
        active = Institution.objects.filter(is_active=True).count()
        by_type = list(Institution.objects.values('type').annotate(count=Count('id')))
        by_province = list(Institution.objects.values('province').annotate(count=Count('id')))
        return Response({
            'total': total,
            'active': active,
            'by_type': by_type,
            'by_province': by_province,
        })


class CampusViewSet(viewsets.ModelViewSet):
    queryset = Campus.objects.select_related('institution').all()
    serializer_class = CampusSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institution', 'province', 'is_main_campus']
    search_fields = ['name', 'institution__name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
