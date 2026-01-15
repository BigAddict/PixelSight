import json
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import ARAsset
from .utils import generate_ai_asset


@method_decorator(csrf_exempt, name='dispatch')
class AssetListView(View):
    """List all assets or create a new asset"""
    
    def get(self, request):
        assets = ARAsset.objects.all().order_by('-created_at')
        data = []
        for asset in assets:
            data.append({
                'id': str(asset.id),
                'name': asset.name,
                'asset_type': asset.asset_type,
                'anchor': asset.anchor,
                'file_url': request.build_absolute_uri(asset.file.url) if asset.file else '',
                'scale': asset.scale,
                'position_offset': asset.position_offset,
                'rotation_offset': asset.rotation_offset,
                'created_at': asset.created_at.isoformat()
            })
        return JsonResponse({'assets': data})
    
    def post(self, request):
        try:
            name = request.POST.get('name')
            asset_type = request.POST.get('asset_type', '2D_IMAGE')
            anchor = request.POST.get('anchor', 'FACE')
            file = request.FILES.get('file')

            if not all([name, file]):
                return JsonResponse({'error': 'Name and file are required'}, status=400)
            
            asset = ARAsset.objects.create(
                name=name,
                asset_type=asset_type,
                anchor=anchor,
                file=file
            )

            return JsonResponse({
                'id': str(asset.id),
                'name': asset.name,
                'asset_type': asset.asset_type,
                'anchor': asset.anchor,
                'file_url': request.build_absolute_uri(asset.file.url),
                'created_at': asset.created_at.isoformat()
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class GenerateAssetView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            prompt = data.get('prompt')
            anchor = data.get('anchor', 'FACE')
            
            if not prompt:
                return JsonResponse({'error': 'Prompt is required'}, status=400)
                
            asset = generate_ai_asset(prompt, anchor)
            
            if not asset:
                return JsonResponse({'error': 'Failed to generate asset.'}, status=500)
                
            return JsonResponse({
                'id': str(asset.id),
                'name': asset.name,
                'asset_type': asset.asset_type,
                'anchor': asset.anchor,
                'file_url': request.build_absolute_uri(asset.file.url),
                'created_at': asset.created_at.isoformat()
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class AssetDetailView(View):
    """Get, update, or delete a specific mask"""
    
    def get(self, request, asset_id):
        try:
            asset = ARAsset.objects.get(id=asset_id)
            return JsonResponse({
                'id': str(asset.id),
                'name': asset.name,
                'asset_type': asset.asset_type,
                'anchor': asset.anchor,
                'file_url': request.build_absolute_uri(asset.file.url),
                'created_at': asset.created_at.isoformat()
            })
        except ARAsset.DoesNotExist:
            return JsonResponse({'error': 'Asset not found'}, status=404)
    
    def delete(self, request, asset_id):
        try:
            asset = ARAsset.objects.get(id=asset_id)
            # Optional: delete file cleanup
            asset.delete()
            return JsonResponse({'message': 'Asset deleted'})
        except ARAsset.DoesNotExist:
            return JsonResponse({'error': 'Asset not found'}, status=404)
