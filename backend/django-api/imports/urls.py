from django.urls import path
from .views import FileUploadView, ImportHistoryListView, ImportPreviewView

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('preview/', ImportPreviewView.as_view(), name='file-preview'),
    path('history/', ImportHistoryListView.as_view(), name='import-history'),
]
