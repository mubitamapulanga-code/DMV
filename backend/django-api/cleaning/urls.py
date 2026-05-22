from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CleaningRuleViewSet, NormalizeValueView

router = DefaultRouter()
router.register(r'rules', CleaningRuleViewSet)

urlpatterns = [
    path('normalize/', NormalizeValueView.as_view(), name='normalize-value'),
    path('', include(router.urls)),
]
