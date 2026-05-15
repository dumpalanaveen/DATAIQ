"""Analysis Models"""
from django.db import models
from apps.datasets.models import Dataset
import uuid


class AnalysisJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='analysis_jobs')
    celery_task_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)  # 0-100
    error_message = models.TextField(blank=True)
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analysis_jobs'
        ordering = ['-created_at']


class DataProfile(models.Model):
    """Full data profile for a dataset"""
    dataset = models.OneToOneField(Dataset, on_delete=models.CASCADE, related_name='profile')
    
    # Overview
    total_rows = models.IntegerField(default=0)
    total_columns = models.IntegerField(default=0)
    total_missing = models.IntegerField(default=0)
    missing_percentage = models.FloatField(default=0)
    total_duplicates = models.IntegerField(default=0)
    duplicate_percentage = models.FloatField(default=0)
    memory_usage_mb = models.FloatField(default=0)
    
    # Column type breakdown
    numeric_columns = models.IntegerField(default=0)
    categorical_columns = models.IntegerField(default=0)
    datetime_columns = models.IntegerField(default=0)
    boolean_columns = models.IntegerField(default=0)
    text_columns = models.IntegerField(default=0)
    
    # Quality score (0-100)
    data_quality_score = models.FloatField(default=0)
    
    # Correlation matrix (JSON)
    correlation_matrix = models.JSONField(default=dict)
    
    # Missing value heatmap data
    missing_pattern = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'data_profiles'


class Visualization(models.Model):
    VIZ_TYPES = [
        ('histogram', 'Histogram'),
        ('bar', 'Bar Chart'),
        ('scatter', 'Scatter Plot'),
        ('line', 'Line Chart'),
        ('box', 'Box Plot'),
        ('heatmap', 'Heatmap'),
        ('pie', 'Pie Chart'),
        ('violin', 'Violin Plot'),
        ('correlation', 'Correlation Matrix'),
        ('distribution', 'Distribution'),
        ('missing', 'Missing Values'),
        ('outlier', 'Outlier Plot'),
        ('pairplot', 'Pair Plot'),
        ('timeseries', 'Time Series'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='visualizations')
    viz_type = models.CharField(max_length=30, choices=VIZ_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Plotly JSON spec
    plotly_config = models.JSONField(default=dict)
    
    # Column(s) used
    x_column = models.CharField(max_length=255, blank=True)
    y_column = models.CharField(max_length=255, blank=True)
    color_column = models.CharField(max_length=255, blank=True)
    
    is_auto_generated = models.BooleanField(default=True)
    is_pinned = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'visualizations'
        ordering = ['display_order', '-created_at']
