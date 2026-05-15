"""Reports - PDF Export"""
from django.db import models
from apps.datasets.models import Dataset
import uuid


class Report(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('generating', 'Generating'), ('ready', 'Ready'), ('failed', 'Failed')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='reports')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='reports/%Y/%m/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    include_visualizations = models.BooleanField(default=True)
    include_ai_insights = models.BooleanField(default=True)
    include_ml_suggestions = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
