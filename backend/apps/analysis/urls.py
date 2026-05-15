from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:dataset_id>/profile/', views.DatasetProfileView.as_view(), name='dataset-profile'),
    path('<uuid:dataset_id>/visualizations/', views.DatasetVisualizationsView.as_view(), name='dataset-vizs'),
    path('<uuid:dataset_id>/jobs/', views.AnalysisJobsView.as_view(), name='analysis-jobs'),
    path('<uuid:dataset_id>/nl-query/', views.NLQueryView.as_view(), name='nl-query'),
    path('viz/<uuid:viz_id>/pin/', views.VisualizationPinView.as_view(), name='viz-pin'),
]
