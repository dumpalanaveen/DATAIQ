"""Dataset Serializers"""
from rest_framework import serializers
from .models import Dataset, DatasetColumn, DataPreview


class DatasetColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetColumn
        fields = '__all__'
        read_only_fields = ('id', 'dataset')


class DataPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataPreview
        fields = ('data', 'row_count', 'created_at')


class DatasetListSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.ReadOnlyField()
    
    class Meta:
        model = Dataset
        fields = (
            'id', 'name', 'description', 'file_type', 'file_size', 'file_size_mb',
            'status', 'row_count', 'column_count', 'tags', 'created_at', 'updated_at'
        )


class DatasetDetailSerializer(serializers.ModelSerializer):
    columns = DatasetColumnSerializer(many=True, read_only=True)
    preview = DataPreviewSerializer(read_only=True)
    file_size_mb = serializers.ReadOnlyField()
    
    class Meta:
        model = Dataset
        fields = (
            'id', 'name', 'description', 'file', 'file_type', 'file_size', 'file_size_mb',
            'original_filename', 'status', 'error_message', 'row_count', 'column_count',
            'columns_info', 'tags', 'is_public', 'created_at', 'updated_at', 'processed_at',
            'columns', 'preview'
        )
        read_only_fields = (
            'id', 'file_type', 'file_size', 'original_filename', 'status', 'error_message',
            'row_count', 'column_count', 'columns_info', 'created_at', 'updated_at', 'processed_at'
        )


class DatasetUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('name', 'description', 'file', 'tags', 'is_public')
    
    def validate_file(self, value):
        allowed_extensions = ['csv', 'xlsx', 'xls', 'json', 'parquet']
        ext = value.name.split('.')[-1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError("File size exceeds 100MB limit.")
        
        return value
    
    def create(self, validated_data):
        file = validated_data['file']
        ext = file.name.split('.')[-1].lower()
        
        file_type_map = {
            'csv': 'csv',
            'xlsx': 'excel', 'xls': 'excel',
            'json': 'json',
            'parquet': 'parquet',
        }
        
        validated_data['file_type'] = file_type_map.get(ext, 'csv')
        validated_data['original_filename'] = file.name
        validated_data['file_size'] = file.size
        validated_data['status'] = 'uploaded'
        validated_data['user'] = self.context['request'].user
        
        if not validated_data.get('name'):
            validated_data['name'] = file.name.rsplit('.', 1)[0]
        
        return super().create(validated_data)
