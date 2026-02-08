"""Stories routes - Instagram-like stories feature"""

from fastapi import APIRouter, HTTPException, status, Request
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


async def call_media_service(endpoint: str, method: str = "GET", data: dict = None):
    """Helper to call media service"""
    url = f"{settings.MEDIA_SERVICE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=10.0) as client:
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

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Service unavailable: {str(e)}"
            )


@router.get("/")
async def get_active_stories(request: Request):
    """
    Get all active stories from matched girlfriends.

    Returns stories that are not expired (< 24h old).
    """
    user_id = request.state.user_id
    return await call_media_service(f"/stories?user_id={user_id}")


@router.get("/{girl_id}")
async def get_girl_stories(girl_id: str, request: Request):
    """
    Get all active stories from a specific girlfriend.

    - **girl_id**: Girlfriend ID
    """
    user_id = request.state.user_id
    return await call_media_service(f"/stories/{girl_id}?user_id={user_id}")


@router.post("/{story_id}/view")
async def mark_story_viewed(story_id: int, request: Request):
    """
    Mark a story as viewed.

    - **story_id**: Story ID

    Increments view count.
    """
    user_id = request.state.user_id
    data = {"user_id": user_id, "story_id": story_id}
    return await call_media_service("/stories/view", method="POST", data=data)
