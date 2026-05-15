from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:dataset_id>/generate/', views.GenerateReportView.as_view(), name='generate-report'),
    path('<uuid:report_id>/status/', views.ReportStatusView.as_view(), name='report-status'),
    path('<uuid:report_id>/download/', views.DownloadReportView.as_view(), name='download-report'),
]
