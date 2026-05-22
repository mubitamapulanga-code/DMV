from rest_framework import viewsets, views, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Avg, Count
from .models import Indicator, IndicatorValue
from .serializers import IndicatorSerializer, IndicatorValueSerializer


class IndicatorViewSet(viewsets.ModelViewSet):
    queryset = Indicator.objects.all()
    serializer_class = IndicatorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['code', 'name', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='values')
    def values(self, request, pk=None):
        """Return all values for a specific indicator."""
        indicator = self.get_object()
        year = request.query_params.get('year')
        institution_id = request.query_params.get('institution')

        qs = IndicatorValue.objects.filter(indicator=indicator).select_related('institution')
        if year:
            qs = qs.filter(year=year)
        if institution_id:
            qs = qs.filter(institution_id=institution_id)

        serializer = IndicatorValueSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='trend')
    def trend(self, request, pk=None):
        """Return year-over-year trend for an indicator."""
        indicator = self.get_object()
        institution_id = request.query_params.get('institution')

        qs = IndicatorValue.objects.filter(indicator=indicator)
        if institution_id:
            qs = qs.filter(institution_id=institution_id)

        trend_data = (
            qs.values('year')
            .annotate(total=Sum('value'), avg=Avg('value'), count=Count('id'))
            .order_by('year')
        )
        return Response(list(trend_data))


class IndicatorValueViewSet(viewsets.ModelViewSet):
    queryset = IndicatorValue.objects.select_related('indicator', 'institution').all()
    serializer_class = IndicatorValueSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['indicator', 'institution', 'year']
    ordering_fields = ['year', 'value']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['delete'], url_path='clear_all', permission_classes=[permissions.IsAdminUser])
    def clear_all(self, request):
        """Delete all indicator values."""
        count, _ = IndicatorValue.objects.all().delete()
        return Response({'message': f'Successfully deleted {count} indicator values.'})


class IndicatorSummaryView(views.APIView):
    """Aggregated indicator summary for the dashboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', 2024))
        category = request.query_params.get('category')

        qs = Indicator.objects.filter(is_active=True)
        if category:
            qs = qs.filter(category=category)

        summary = []
        for ind in qs:
            values_qs = IndicatorValue.objects.filter(indicator=ind, year=year)
            agg = values_qs.aggregate(total=Sum('value'), avg=Avg('value'), count=Count('id'))
            summary.append({
                'id': ind.id,
                'code': ind.code,
                'name': ind.name,
                'category': ind.category,
                'unit': ind.unit,
                'target_value': ind.target_value,
                'year': year,
                'total': agg['total'],
                'average': round(agg['avg'] or 0, 2),
                'institution_count': agg['count'],
            })

        return Response(summary)
