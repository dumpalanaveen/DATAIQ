from django.contrib import admin
from .models import AnalysisJob, DataProfile, Visualization

@admin.register(AnalysisJob)
class AnalysisJobAdmin(admin.ModelAdmin):
    list_display = ('dataset', 'status', 'progress', 'started_at', 'completed_at')
    list_filter = ('status',)

@admin.register(DataProfile)
class DataProfileAdmin(admin.ModelAdmin):
    list_display = ('dataset', 'total_rows', 'total_columns', 'data_quality_score', 'missing_percentage')

@admin.register(Visualization)
class VisualizationAdmin(admin.ModelAdmin):
    list_display = ('title', 'dataset', 'viz_type', 'is_auto_generated', 'is_pinned')
    list_filter = ('viz_type', 'is_auto_generated')
