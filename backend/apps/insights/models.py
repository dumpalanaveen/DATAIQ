"""Insights Models"""
from django.db import models
from apps.datasets.models import Dataset
import uuid


class DatasetInsight(models.Model):
    CATEGORY_CHOICES = [
        ('overview', 'Overview'),
        ('quality', 'Data Quality'),
        ('patterns', 'Patterns'),
        ('anomalies', 'Anomalies'),
        ('recommendations', 'Recommendations'),
        ('ml_suggestions', 'ML Suggestions'),
        ('feature_engineering', 'Feature Engineering'),
        ('business_insights', 'Business Insights'),
    ]
    
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='insights')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=300)
    content = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    confidence = models.FloatField(default=0.8)
    display_order = models.IntegerField(default=0)
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dataset_insights'
        ordering = ['display_order', '-created_at']
    
    def __str__(self):
        return f"{self.category}: {self.title[:50]}"


class MLRecommendation(models.Model):
    TASK_TYPES = [
        ('classification', 'Classification'),
        ('regression', 'Regression'),
        ('clustering', 'Clustering'),
        ('anomaly_detection', 'Anomaly Detection'),
        ('time_series', 'Time Series Forecasting'),
        ('nlp', 'Natural Language Processing'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='ml_recommendations')
    task_type = models.CharField(max_length=30, choices=TASK_TYPES)
    model_name = models.CharField(max_length=100)
    description = models.TextField()
    confidence_score = models.FloatField(default=0.7)
    reasoning = models.TextField()
    suggested_target = models.CharField(max_length=255, blank=True)
    suggested_features = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ml_recommendations'
        ordering = ['-confidence_score']
