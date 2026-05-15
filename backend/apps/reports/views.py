"""Reports Views"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from .models import Report
from apps.datasets.models import Dataset


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'


class GenerateReportView(APIView):
    def post(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, pk=dataset_id, user=request.user)
        if dataset.status != 'ready':
            return Response({'error': 'Dataset not ready'}, status=400)
        
        report = Report.objects.create(
            dataset=dataset,
            title=f"Analysis Report: {dataset.name}",
            include_visualizations=request.data.get('include_visualizations', True),
            include_ai_insights=request.data.get('include_ai_insights', True),
            include_ml_suggestions=request.data.get('include_ml_suggestions', True),
        )
        
        from .tasks import generate_report_task
        generate_report_task.delay(str(report.id))
        
        return Response(ReportSerializer(report).data, status=201)


class ReportStatusView(APIView):
    def get(self, request, report_id):
        report = get_object_or_404(Report, pk=report_id, dataset__user=request.user)
        return Response(ReportSerializer(report).data)


class DownloadReportView(APIView):
    def get(self, request, report_id):
        report = get_object_or_404(Report, pk=report_id, dataset__user=request.user)
        
        if report.status != 'ready' or not report.file:
            return Response({'error': 'Report not ready'}, status=400)
        
        return FileResponse(
            report.file.open('rb'),
            as_attachment=True,
            filename=f"dataiq_report_{report.dataset.name}.pdf"
        )
