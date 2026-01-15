"""
URL configuration for base project.
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from core.views import AssetListView, AssetDetailView, GenerateAssetView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/assets/', AssetListView.as_view(), name='asset-list'),
    path('api/assets/generate/', GenerateAssetView.as_view(), name='asset-generate'),
    path('api/assets/<uuid:asset_id>/', AssetDetailView.as_view(), name='asset-detail'),
]

# Serve media files in development
if settings.DEBUG:

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
