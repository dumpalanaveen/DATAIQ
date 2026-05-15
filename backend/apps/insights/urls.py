from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:dataset_id>/', views.DatasetInsightsView.as_view(), name='dataset-insights'),
    path('<uuid:dataset_id>/regenerate/', views.RegenerateInsightsView.as_view(), name='regen-insights'),
    path('<uuid:dataset_id>/ml/', views.MLRecommendationsView.as_view(), name='ml-recommendations'),
    path('dismiss/<uuid:insight_id>/', views.DismissInsightView.as_view(), name='dismiss-insight'),
]
