import uuid
from django.db import models


class ARAsset(models.Model):
    ASSET_TYPES = [
        ('2D_IMAGE', '2D Image'),
        ('3D_MODEL', '3D Model'),
    ]
    
    ANCHOR_POINTS = [
        ('FACE', 'Face Center'),
        ('HAND_WRIST', 'Hand Wrist'),
        ('HAND_PALM', 'Hand Palm'),
        ('HAND_INDEX_TIP', 'Index Finger Tip'),
        # Add more as needed
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPES, default='2D_IMAGE')
    file = models.FileField(upload_to='assets/')
    
    # Anchoring and Transform
    anchor = models.CharField(max_length=20, choices=ANCHOR_POINTS, default='FACE')
    scale = models.FloatField(default=1.0)
    
    # Store simple JSON for offsets {x:0, y:0, z:0}
    position_offset = models.JSONField(default=dict) 
    rotation_offset = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_asset_type_display()})"

