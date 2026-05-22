from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'HEA DMV API',
        'version': 'v1',
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # Health check
    path('api/v1/health/', health_check, name='health-check'),

    # Auth & User management
    path('api/v1/auth/', include('users.urls')),

    # Core data
    path('api/v1/institutions/', include('institutions.urls')),
    path('api/v1/indicators/', include('indicators.urls')),
    path('api/v1/academic/', include('academic.urls')),

    # Data pipeline
    path('api/v1/imports/', include('imports.urls')),
    path('api/v1/cleaning/', include('cleaning.urls')),

    # Analytics & Reporting
    path('api/v1/analytics/', include('analytics.urls')),
    path('api/v1/reports/', include('reports.urls')),

    # Governance
    path('api/v1/audit/', include('audit.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
