from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InstitutionViewSet, CampusViewSet

router = DefaultRouter()
router.register(r'campuses', CampusViewSet)
router.register(r'', InstitutionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
