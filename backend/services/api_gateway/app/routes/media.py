"""Media routes - photos and videos generation"""

from fastapi import APIRouter, HTTPException, status, Request, Query
from pydantic import BaseModel
from typing import Optional
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


class GeneratePhotoRequest(BaseModel):
    girl_id: str
    context: Optional[str] = None  # selfie, bathroom, bedroom, outdoors, etc
    nsfw_level: int = 50  # 0-100
    custom_prompt: Optional[str] = None


class GenerateVideoRequest(BaseModel):
    girl_id: str
    source_image_url: Optional[str] = None
    prompt: Optional[str] = None


async def call_media_service(endpoint: str, method: str = "GET", data: dict = None):
    """Helper to call media service"""
    url = f"{settings.MEDIA_SERVICE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=60.0) as client:  # Longer timeout for generation
        try:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                response = await client.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json() if response.text else {"error": "Service error"}
                )

            return response.json()

        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Media generation timeout - this can take 30-60 seconds"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Media service unavailable: {str(e)}"
            )


@router.post("/generate-photo")
async def generate_photo(photo: GeneratePhotoRequest, request: Request):
    """
    Generate a photo of girlfriend using AI.

    **Cost**: 5 tokens

    - **girl_id**: Girlfriend ID
    - **context**: Photo context (selfie, bathroom, bedroom, etc.)
    - **nsfw_level**: NSFW level 0-100 (0=clothed, 100=explicit)
    - **custom_prompt**: Optional custom prompt for advanced users

    Generation time: ~2-10 seconds
    """
    user_id = request.state.user_id
    data = {"user_id": user_id, **photo.model_dump()}
    return await call_media_service("/generate-photo", method="POST", data=data)


@router.post("/generate-video")
async def generate_video(video: GenerateVideoRequest, request: Request):
    """
    Generate a video of girlfriend using AI (image-to-video).

    **Cost**: 15 tokens
    **Premium only**

    - **girl_id**: Girlfriend ID
    - **source_image_url**: Source image to animate
    - **prompt**: Optional motion prompt

    Generation time: ~30-60 seconds
    """
    user_id = request.state.user_id
    subscription_tier = request.state.subscription_tier

    if subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Video generation is only available for Premium and Elite subscribers"
        )

    data = {"user_id": user_id, **video.model_dump()}
    return await call_media_service("/generate-video", method="POST", data=data)


@router.get("/photos/{girl_id}")
async def get_received_photos(girl_id: str, request: Request, limit: int = Query(50, ge=1, le=200)):
    """
    Get all photos received from a girlfriend.

    - **girl_id**: Girlfriend ID
    - **limit**: Number of photos to return
    """
    user_id = request.state.user_id
    return await call_media_service(f"/photos?user_id={user_id}&girl_id={girl_id}&limit={limit}")


@router.get("/videos/{girl_id}")
async def get_generated_videos(girl_id: str, request: Request, limit: int = Query(20, ge=1, le=100)):
    """
    Get all videos generated for a girlfriend.

    - **girl_id**: Girlfriend ID
    - **limit**: Number of videos to return
    """
    user_id = request.state.user_id
    return await call_media_service(f"/videos?user_id={user_id}&girl_id={girl_id}&limit={limit}")


@router.get("/task/{task_id}")
async def get_generation_status(task_id: str):
    """
    Check status of media generation task.

    - **task_id**: Task ID returned from generate-photo or generate-video

    Status can be: pending, processing, completed, failed
    """
    return await call_media_service(f"/task/{task_id}")
