from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, LogoutView, UserProfileView, PasswordChangeView,
    UserListCreateView, UserDetailView, AdminPasswordResetView, UserStatsView,
)

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', UserProfileView.as_view(), name='user-profile'),
    path('me/change-password/', PasswordChangeView.as_view(), name='change-password'),

    # User management (admin)
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/stats/', UserStatsView.as_view(), name='user-stats'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/reset-password/', AdminPasswordResetView.as_view(), name='admin-reset-password'),
]
