from django.urls import path
from .views import DashboardDataView, ExecutiveDashboardView, AnalyticsOverviewView, EnrollmentBreakdownView

urlpatterns = [
    path('dashboard/', DashboardDataView.as_view(), name='dashboard-data'),
    path('executive/', ExecutiveDashboardView.as_view(), name='executive-dashboard'),
    path('overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('enrollment-breakdown/', EnrollmentBreakdownView.as_view(), name='enrollment-breakdown'),
]
