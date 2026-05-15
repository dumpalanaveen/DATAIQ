"""Insights Views"""
from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import DatasetInsight, MLRecommendation
from apps.datasets.models import Dataset


class InsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetInsight
        fields = '__all__'


class MLRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLRecommendation
        fields = '__all__'


class DatasetInsightsView(generics.ListAPIView):
    serializer_class = InsightSerializer
    
    def get_queryset(self):
        dataset = get_object_or_404(
            Dataset,
            pk=self.kwargs['dataset_id'],
            user=self.request.user
        )
        return DatasetInsight.objects.filter(
            dataset=dataset,
            is_dismissed=False
        ).order_by('display_order')


class DismissInsightView(APIView):
    def post(self, request, insight_id):
        insight = get_object_or_404(
            DatasetInsight,
            pk=insight_id,
            dataset__user=request.user
        )
        insight.is_dismissed = True
        insight.save()
        return Response({'message': 'Insight dismissed'})


class RegenerateInsightsView(APIView):
    def post(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, pk=dataset_id, user=request.user)
        if dataset.status != 'ready':
            return Response({'error': 'Dataset not ready'}, status=400)
        
        from apps.analysis.tasks import generate_ai_insights_task
        generate_ai_insights_task.delay(str(dataset_id))
        return Response({'message': 'Insight regeneration started'})


class MLRecommendationsView(generics.ListAPIView):
    serializer_class = MLRecommendationSerializer
    
    def get_queryset(self):
        dataset = get_object_or_404(
            Dataset,
            pk=self.kwargs['dataset_id'],
            user=self.request.user
        )
        return MLRecommendation.objects.filter(dataset=dataset)
