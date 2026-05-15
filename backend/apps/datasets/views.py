"""Dataset Views"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Dataset, DatasetColumn
from .serializers import (
    DatasetListSerializer, DatasetDetailSerializer,
    DatasetUploadSerializer, DatasetColumnSerializer
)
from apps.analysis.tasks import process_dataset_task


class DatasetListCreateView(generics.ListCreateAPIView):
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['created_at', 'name', 'file_size', 'row_count']
    ordering = ['-created_at']

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DatasetUploadSerializer
        return DatasetListSerializer

    def perform_create(self, serializer):
        dataset = serializer.save()
        # Trigger async processing
        process_dataset_task.delay(str(dataset.id))
        # Update user stats
        self.request.user.datasets_uploaded += 1
        self.request.user.save(update_fields=['datasets_uploaded'])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        dataset = serializer.instance
        return Response(
            DatasetListSerializer(dataset).data,
            status=status.HTTP_201_CREATED
        )


class DatasetDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            from .serializers import DatasetUploadSerializer
            return DatasetUploadSerializer
        return DatasetDetailSerializer


class DatasetStatusView(APIView):
    def get(self, request, pk):
        dataset = get_object_or_404(Dataset, pk=pk, user=request.user)
        return Response({
            'id': str(dataset.id),
            'status': dataset.status,
            'error_message': dataset.error_message,
            'row_count': dataset.row_count,
            'column_count': dataset.column_count,
            'processed_at': dataset.processed_at,
        })


class DatasetReprocessView(APIView):
    def post(self, request, pk):
        dataset = get_object_or_404(Dataset, pk=pk, user=request.user)
        dataset.status = 'processing'
        dataset.error_message = ''
        dataset.save()
        process_dataset_task.delay(str(dataset.id))
        return Response({'message': 'Reprocessing started'})


class DatasetColumnsView(generics.ListAPIView):
    serializer_class = DatasetColumnSerializer

    def get_queryset(self):
        dataset = get_object_or_404(Dataset, pk=self.kwargs['pk'], user=self.request.user)
        return DatasetColumn.objects.filter(dataset=dataset)


class DatasetQueryView(APIView):
    """Run DuckDB SQL queries on dataset"""
    def post(self, request, pk):
        dataset = get_object_or_404(Dataset, pk=pk, user=request.user)
        query = request.data.get('query', '').strip()
        
        if not query:
            return Response({'error': 'Query is required'}, status=400)
        
        # Prevent dangerous queries
        dangerous = ['drop ', 'delete ', 'truncate ', 'insert ', 'update ', 'alter ', 'create ']
        if any(q in query.lower() for q in dangerous):
            return Response({'error': 'Only SELECT queries are allowed'}, status=400)
        
        try:
            import duckdb
            import pandas as pd
            
            df = _load_dataset_df(dataset)
            conn = duckdb.connect(':memory:')
            conn.register('dataset', df)
            
            result = conn.execute(query).fetchdf()
            
            return Response({
                'columns': list(result.columns),
                'data': result.head(1000).to_dict('records'),
                'total_rows': len(result),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)


def _load_dataset_df(dataset):
    """Load dataset file into pandas DataFrame"""
    import pandas as pd
    file_path = dataset.file.path
    
    loaders = {
        'csv': pd.read_csv,
        'json': pd.read_json,
        'parquet': pd.read_parquet,
        'excel': pd.read_excel,
    }
    
    loader = loaders.get(dataset.file_type, pd.read_csv)
    return loader(file_path)
