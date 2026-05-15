from django.contrib import admin
from .models import DatasetInsight, MLRecommendation

@admin.register(DatasetInsight)
class DatasetInsightAdmin(admin.ModelAdmin):
    list_display = ('title', 'dataset', 'category', 'severity', 'confidence', 'is_dismissed')
    list_filter = ('category', 'severity', 'is_dismissed')

@admin.register(MLRecommendation)
class MLRecommendationAdmin(admin.ModelAdmin):
    list_display = ('model_name', 'dataset', 'task_type', 'confidence_score')
