"""DataIQ URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/datasets/', include('apps.datasets.urls')),
    path('api/analysis/', include('apps.analysis.urls')),
    path('api/insights/', include('apps.insights.urls')),
    path('api/reports/', include('apps.reports.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "DataIQ Admin"
admin.site.site_title = "DataIQ"
admin.site.index_title = "Platform Administration"
