import os
from google import genai
from google.genai import types
from django.conf import settings
from PIL import Image
import io
import uuid
from .models import ARAsset
from django.core.files.base import ContentFile

def generate_ai_asset(prompt, anchor_type):
    """
    Generates an asset image using Google Gemini (Imagen 3) and saves it to the database.
    
    Args:
        prompt (str): Description.
        anchor_type (str): 'FACE', 'HAND_PALM', etc.
        
    Returns:
        ARAsset: The created asset object or None.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found.")
        return None

    try:
        client = genai.Client(api_key=api_key)
        
        enhanced_prompt = (
            f"A high quality, isolated design of {prompt}. "
            f"Front facing view, centered. "
            f"Solid white background for easy extraction. "
            f"No human skin, just the object/accessory. "
            f"High resolution, detailed."
        )
        
        # Check model availability - fallback logic could be added
        response = client.models.generate_images(
            model='gemini-3-pro-image-preview',
            prompt=enhanced_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                safety_filter_level="block_only_high",
                person_generation="allow_adult"
            )
        )
        
        if not response.generated_images:
            return None
            
        image_data = response.generated_images[0]
        
        # The new SDK might return bytes directly or an object
        img_bytes = image_data.image.image_bytes
        image = Image.open(io.BytesIO(img_bytes))
        
        # Simple transparency processing
        image = image.convert("RGBA")
        datas = image.getdata()
        
        new_data = []
        for item in datas:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        image.putdata(new_data)
        
        # Save
        asset_name = f"AI: {prompt[:20]}..."
        filename = f"{uuid.uuid4()}.png"
        
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='PNG')
        
        asset = ARAsset(
            name=asset_name,
            asset_type='2D_IMAGE',
            anchor=anchor_type
        )
        
        asset.file.save(filename, ContentFile(output_buffer.getvalue()), save=True)
        
        return asset

    except Exception as e:
        print(f"Error generating asset: {e}")
        return None
