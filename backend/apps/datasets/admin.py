from django.contrib import admin
from .models import Dataset, DatasetColumn, DataPreview

@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'file_type', 'status', 'row_count', 'column_count', 'created_at')
    list_filter = ('status', 'file_type')
    search_fields = ('name', 'user__email')
    readonly_fields = ('id', 'created_at', 'updated_at', 'processed_at')
    ordering = ('-created_at',)

@admin.register(DatasetColumn)
class DatasetColumnAdmin(admin.ModelAdmin):
    list_display = ('name', 'dataset', 'dtype', 'null_percentage', 'unique_count')
    list_filter = ('dtype',)
    search_fields = ('name', 'dataset__name')
