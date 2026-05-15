"""Analysis Views"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, serializers
from django.shortcuts import get_object_or_404
from .models import DataProfile, Visualization, AnalysisJob
from apps.datasets.models import Dataset


class DataProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataProfile
        exclude = ['id']


class VisualizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visualization
        fields = '__all__'


class AnalysisJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisJob
        fields = '__all__'


class DatasetProfileView(APIView):
    def get(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, pk=dataset_id, user=request.user)
        try:
            profile = DataProfile.objects.get(dataset=dataset)
            return Response(DataProfileSerializer(profile).data)
        except DataProfile.DoesNotExist:
            return Response({'error': 'Profile not yet generated'}, status=404)


class DatasetVisualizationsView(APIView):
    def get(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, pk=dataset_id, user=request.user)
        vizs = Visualization.objects.filter(dataset=dataset)
        return Response(VisualizationSerializer(vizs, many=True).data)
    
    def post(self, request, dataset_id):
        """Create custom visualization"""
        dataset = get_object_or_404(Dataset, pk=dataset_id, user=request.user)
        serializer = VisualizationSerializer(data={**request.data, 'dataset': dataset.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(dataset=dataset, is_auto_generated=False)
        return Response(serializer.data, status=201)


class VisualizationPinView(APIView):
    def post(self, request, viz_id):
        viz = get_object_or_404(Visualization, pk=viz_id, dataset__user=request.user)
        viz.is_pinned = not viz.is_pinned
        viz.save(update_fields=['is_pinned'])
        return Response({'pinned': viz.is_pinned})


class AnalysisJobsView(generics.ListAPIView):
    serializer_class = AnalysisJobSerializer
    
    def get_queryset(self):
        dataset_id = self.kwargs.get('dataset_id')
        return AnalysisJob.objects.filter(dataset__id=dataset_id, dataset__user=self.request.user)


class NLQueryView(APIView):
    """Natural language query processing"""
    def post(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, pk=dataset_id, user=request.user)
        question = request.data.get('question', '').strip()
        
        if not question:
            return Response({'error': 'Question is required'}, status=400)
        
        from apps.insights.engine import AIInsightEngine
        engine = AIInsightEngine()
        
        try:
            result = engine.answer_question(dataset, question)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
