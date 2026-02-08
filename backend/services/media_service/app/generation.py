"""
Image generation using Promptchan API
Extracted and adapted from original monolith
"""

import requests
import logging
import sys
import os
from typing import Dict, Optional, Tuple

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Pose detection keywords (NSFW)
POSE_KEYWORDS = {
    'pipe': 'POV Deepthroat', 'suce': 'POV Deepthroat', 'suck': 'POV Deepthroat', 'blowjob': 'POV Deepthroat',
    'deepthroat': 'POV Deepthroat', 'gorge': 'POV Deepthroat', 'avale': 'Pipe en POV', 'lick': 'Licking Dick',
    'seins': 'Prise de sein en POV', 'poitrine': 'Prise de sein en POV', 'nichons': 'Prise de sein en POV',
    'tits': 'Prise de sein en POV', 'boobs': 'Prise de sein en POV', 'titfuck': 'Prise de sein en POV',
    'cul': 'Looking Back', 'fesses': 'Attrape le cul', 'ass': 'Looking Back', 'butt': 'Attrape le cul',
    'chatte': 'Masturbation Féminine', 'pussy': 'Masturbation Féminine', 'mouillée': 'Masturbation Féminine',
    'levrette': 'POV en levrette', 'doggystyle': 'Doggystyle Front Angle', 'derriere': 'POV en levrette',
    'cowgirl': 'POV Cowgirl', 'chevauche': 'POV Cowgirl', 'ride': 'POV Cowgirl', 'monte': 'POV Cowgirl',
    'missionnaire': 'Missionnaire en POV', 'missionary': 'Missionnaire en POV',
    'branle': 'Branlette', 'handjob': 'Branlette', 'bite': 'Branlette', 'dick': 'Branlette',
    'facial': 'Ejaculation', 'visage': 'Ejaculation', 'sperme': 'Sperme sur le cul', 'cum': 'Ejaculation',
    'masturbe': 'Masturbation Féminine', 'doigts': 'Masturbation Féminine', 'finger': 'Masturbation Féminine',
    'pieds': 'Footjob', 'feet': 'Footjob', 'footjob': 'Footjob',
    'nue': 'Default', 'naked': 'Default', 'nude': 'Default', 'deshabille': 'Default',
    'corps': 'Marche Arrêt', 'body': 'Marche Arrêt', 'montre': 'Hand on Hip',
    'selfie': 'Mirror Selfie', 'miroir': 'Mirror Selfie',
    'anal': 'POV en levrette', 'sodomie': 'POV en levrette'
}

# Expression keywords
EXPRESSION_KEYWORDS = {
    'orgasme': "Visage d'orgasme", 'jouis': "Visage d'orgasme", 'cum': "Visage d'orgasme",
    'excitée': "Visage d'orgasme", 'horny': 'Tirer la langue', 'chaude': 'Tirer la langue',
    'douleur': 'Ouch', 'mal': 'Ouch', 'fort': 'Ouch', 'hard': 'Ouch'
}


def detect_pose_and_expression(description: str, affection: int) -> Tuple[str, str, str]:
    """
    Detect appropriate pose, expression and style based on description and affection.

    Returns: (pose, expression, style)
    """
    desc_lower = description.lower() if description else ''

    # Detect pose
    pose = 'Default'
    for keyword, detected_pose in POSE_KEYWORDS.items():
        if keyword in desc_lower:
            pose = detected_pose
            break

    # Detect expression
    expression = 'Smiling'
    for keyword, detected_expr in EXPRESSION_KEYWORDS.items():
        if keyword in desc_lower:
            expression = detected_expr
            break

    # Detect if explicit content
    explicit_keywords = ['pipe', 'suce', 'baise', 'levrette', 'cowgirl', 'branle', 'facial', 'sperme', 'anal', 'doggystyle']
    is_explicit = any(k in desc_lower for k in explicit_keywords)

    # Choose style based on affection and explicitness
    style = 'Hardcore XL' if is_explicit and affection >= 50 else 'Photo XL+ v2'

    # Override expression for explicit content
    if is_explicit and expression == 'Smiling':
        expression = "Visage d'orgasme"

    return pose, expression, style


def build_prompt_by_affection(girl_appearance: str, description: str, affection: int) -> str:
    """
    Build full prompt based on affection level.

    Affection determines clothing and explicitness.
    """
    mood_prompt = ""

    if affection < 30:
        # Clothed, elegant
        mood_prompt = "wearing elegant classy dress, beautiful, soft lighting"
    elif affection < 50:
        # Sexy but not nude
        mood_prompt = "wearing tight sexy dress, showing legs, cleavage, seductive look"
    elif affection < 75:
        # Lingerie
        mood_prompt = "wearing sexy lingerie, lace bra, bedroom setting, seductive pose, intimate"
    else:
        # Nude/topless
        mood_prompt = "nude, topless, naked, bedroom, seductive intimate pose, sensual lighting"

    full_prompt = f"{girl_appearance}, {mood_prompt}"

    # Add custom description if provided
    if description:
        full_prompt += f", {description}"

    return full_prompt


async def generate_image_promptchan(
    girl_appearance: str,
    girl_age: int,
    description: str,
    affection: int,
    custom_prompt: Optional[str] = None
) -> Optional[str]:
    """
    Generate image using Promptchan API.

    Args:
        girl_appearance: Physical description of girlfriend
        girl_age: Age for age slider
        description: Context/scenario for photo
        affection: Current affection level (0-100)
        custom_prompt: Optional custom prompt override

    Returns:
        Image URL if successful, None otherwise
    """
    if not settings.PROMPTCHAN_KEY:
        logger.error("Promptchan API key not configured")
        return None

    try:
        # Detect pose and expression
        pose, expression, style = detect_pose_and_expression(description, affection)

        # Build prompt
        if custom_prompt:
            full_prompt = custom_prompt
        else:
            full_prompt = build_prompt_by_affection(girl_appearance, description, affection)

        # Negative prompt to avoid common issues
        negative_prompt = (
            "extra limbs, missing limbs, wonky fingers, mismatched boobs, extra boobs, "
            "asymmetrical boobs, extra fingers, too many thumbs, random dicks, free floating dicks, "
            "extra pussies, deformed face, ugly, blurry"
        )

        logger.info(f"Generating image: pose={pose}, expression={expression}, style={style}, affection={affection}")

        # Call Promptchan API
        response = requests.post(
            'https://prod.aicloudnetservices.com/api/external/create',
            headers={
                'Content-Type': 'application/json',
                'x-api-key': settings.PROMPTCHAN_KEY
            },
            json={
                "style": style,
                "pose": pose,
                "prompt": full_prompt,
                "quality": "Ultra",
                "expression": expression,
                "age_slider": girl_age,
                "creativity": 50,
                "restore_faces": True,
                "seed": -1,  # Random seed for variety
                "negative_prompt": negative_prompt
            },
            timeout=45  # Promptchan can take 30-40 seconds
        )

        logger.info(f"Promptchan API response: {response.status_code}")

        if response.ok:
            result = response.json()
            image_url = result.get('image', result.get('image_url', ''))

            if image_url:
                logger.info(f"Image generated successfully: {len(image_url)} chars URL")
                return image_url
            else:
                logger.error(f"No image URL in Promptchan response: {result.keys()}")
                return None
        else:
            logger.error(f"Promptchan API error: {response.status_code} - {response.text[:200]}")
            return None

    except requests.Timeout:
        logger.error("Promptchan API timeout (>45s)")
        return None
    except Exception as e:
        logger.error(f"Image generation failed: {e}", exc_info=True)
        return None


def compress_image(image_url: str, max_width: int = 1024) -> bytes:
    """
    Download and compress image for faster loading.

    Returns compressed image bytes.
    """
    try:
        from PIL import Image
        from io import BytesIO

        # Download image
        response = requests.get(image_url, timeout=10)
        if not response.ok:
            raise Exception(f"Failed to download image: {response.status_code}")

        # Open with Pillow
        img = Image.open(BytesIO(response.content))

        # Resize if too large
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # Convert to RGB if needed
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Compress to JPEG
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        output.seek(0)

        logger.info(f"Image compressed: {len(response.content)} → {len(output.getvalue())} bytes")

        return output.getvalue()

    except Exception as e:
        logger.error(f"Image compression failed: {e}", exc_info=True)
        # Return original if compression fails
        response = requests.get(image_url, timeout=10)
        return response.content if response.ok else b''
