from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportViewSet, ReportTemplatesView,
    UnmatchedProgrammeStudentsView, ImportFlaggedDetailView,
    ReportDataView, EnrollmentMatrixView,
)

router = DefaultRouter()
router.register(r'', ReportViewSet)

urlpatterns = [
    path('templates/',            ReportTemplatesView.as_view(),            name='report-templates'),
    path('data/',                 ReportDataView.as_view(),                  name='report-data'),
    path('enrollment-matrix/',    EnrollmentMatrixView.as_view(),           name='enrollment-matrix'),
    path('unmatched-programmes/', UnmatchedProgrammeStudentsView.as_view(), name='unmatched-programmes'),
    path('import-flagged/<int:pk>/', ImportFlaggedDetailView.as_view(),     name='import-flagged-detail'),
    path('', include(router.urls)),
]
