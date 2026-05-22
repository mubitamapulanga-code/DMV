from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgrammeViewSet, StudentViewSet, EnrollmentViewSet

router = DefaultRouter()
router.register(r'programmes', ProgrammeViewSet)
router.register(r'students', StudentViewSet)
router.register(r'enrollments', EnrollmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
