from django.urls import path
from . import views

urlpatterns = [
    path('', views.DatasetListCreateView.as_view(), name='dataset-list'),
    path('<uuid:pk>/', views.DatasetDetailView.as_view(), name='dataset-detail'),
    path('<uuid:pk>/status/', views.DatasetStatusView.as_view(), name='dataset-status'),
    path('<uuid:pk>/reprocess/', views.DatasetReprocessView.as_view(), name='dataset-reprocess'),
    path('<uuid:pk>/columns/', views.DatasetColumnsView.as_view(), name='dataset-columns'),
    path('<uuid:pk>/query/', views.DatasetQueryView.as_view(), name='dataset-query'),
]
