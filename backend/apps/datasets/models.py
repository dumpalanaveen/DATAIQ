"""Dataset Models"""
from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Dataset(models.Model):
    STATUS_CHOICES = [
        ('uploading', 'Uploading'),
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('error', 'Error'),
    ]
    
    FILE_TYPE_CHOICES = [
        ('csv', 'CSV'),
        ('excel', 'Excel'),
        ('json', 'JSON'),
        ('parquet', 'Parquet'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='datasets/%Y/%m/')
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_size = models.BigIntegerField(null=True, blank=True)  # bytes
    original_filename = models.CharField(max_length=255)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    error_message = models.TextField(blank=True)
    
    # Schema Info
    row_count = models.IntegerField(null=True, blank=True)
    column_count = models.IntegerField(null=True, blank=True)
    columns_info = models.JSONField(default=dict)  # {col: {dtype, non_null, unique, ...}}
    
    # Metadata
    tags = models.JSONField(default=list)
    is_public = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'datasets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.email})"
    
    @property
    def file_size_mb(self):
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0


class DatasetColumn(models.Model):
    DTYPE_CHOICES = [
        ('numeric', 'Numeric'),
        ('categorical', 'Categorical'),
        ('datetime', 'DateTime'),
        ('boolean', 'Boolean'),
        ('text', 'Text'),
        ('unknown', 'Unknown'),
    ]
    
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255)
    dtype = models.CharField(max_length=20, choices=DTYPE_CHOICES)
    pandas_dtype = models.CharField(max_length=50)
    
    # Stats
    non_null_count = models.IntegerField(default=0)
    null_count = models.IntegerField(default=0)
    null_percentage = models.FloatField(default=0)
    unique_count = models.IntegerField(default=0)
    
    # Numeric stats
    mean = models.FloatField(null=True, blank=True)
    std = models.FloatField(null=True, blank=True)
    min_val = models.FloatField(null=True, blank=True)
    max_val = models.FloatField(null=True, blank=True)
    q25 = models.FloatField(null=True, blank=True)
    q50 = models.FloatField(null=True, blank=True)
    q75 = models.FloatField(null=True, blank=True)
    
    # Categorical stats
    top_values = models.JSONField(default=list)  # [{value, count, pct}]
    
    # Outlier info
    outlier_count = models.IntegerField(default=0)
    outlier_percentage = models.FloatField(default=0)
    
    position = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'dataset_columns'
        ordering = ['position']
        unique_together = [('dataset', 'name')]

    def __str__(self):
        return f"{self.dataset.name}.{self.name}"


class DataPreview(models.Model):
    """Stores first N rows for quick preview"""
    dataset = models.OneToOneField(Dataset, on_delete=models.CASCADE, related_name='preview')
    data = models.JSONField(default=list)  # List of row dicts
    row_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'data_previews'
