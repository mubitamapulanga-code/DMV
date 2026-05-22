from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IndicatorViewSet, IndicatorValueViewSet, IndicatorSummaryView

router = DefaultRouter()
router.register(r'values', IndicatorValueViewSet)
router.register(r'', IndicatorViewSet)

urlpatterns = [
    path('summary/', IndicatorSummaryView.as_view(), name='indicator-summary'),
    path('', include(router.urls)),
]
