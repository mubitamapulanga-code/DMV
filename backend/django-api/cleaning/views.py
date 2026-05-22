from rest_framework import viewsets, views, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import CleaningRule
from .serializers import CleaningRuleSerializer
from .utils import normalize_value


class CleaningRuleViewSet(viewsets.ModelViewSet):
    queryset = CleaningRule.objects.all()
    serializer_class = CleaningRuleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'pattern', 'replacement']
    ordering_fields = ['category', 'pattern', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


class NormalizeValueView(views.APIView):
    """Test a value against the cleaning rules."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        value = request.data.get('value')
        category = request.data.get('category')

        if not value or not category:
            return Response(
                {'error': 'Both "value" and "category" are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized = normalize_value(value, category)
        return Response({
            'original': value,
            'normalized': normalized,
            'changed': value != normalized,
        })
