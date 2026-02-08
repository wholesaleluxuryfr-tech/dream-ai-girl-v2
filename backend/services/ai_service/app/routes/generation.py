"""Media generation routes - images and videos"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging
import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db
from shared.models.match import Match
from shared.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


class GeneratePhotoRequest(BaseModel):
    user_id: int
    girl_id: str
    context: Optional[str] = "selfie"
    nsfw_level: int = 50
    custom_prompt: Optional[str] = None


class GeneratePhotoResponse(BaseModel):
    task_id: str
    status: str  # "queued", "processing", "completed", "failed"
    photo_url: Optional[str] = None
    estimated_time: int  # seconds
    tokens_deducted: int


class GenerateVideoRequest(BaseModel):
    user_id: int
    girl_id: str
    source_image_url: Optional[str] = None
    prompt: Optional[str] = None


class GenerateVideoResponse(BaseModel):
    task_id: str
    status: str
    video_url: Optional[str] = None
    estimated_time: int
    tokens_deducted: int


@router.post("/photo", response_model=GeneratePhotoResponse)
async def generate_photo(request: GeneratePhotoRequest, db: Session = Depends(get_db)):
    """
    Generate AI photo of girlfriend.

    **Cost**: 5 tokens
    **Time**: ~2-10 seconds (depending on queue)

    Generates NSFW photo based on context and affection level.
    """
    logger.info(f"Photo generation request: user={request.user_id}, girl={request.girl_id}, nsfw={request.nsfw_level}")

    # Check user has enough tokens
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token_cost = settings.TOKEN_COST_PHOTO
    if user.tokens < token_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient tokens. You need {token_cost} tokens but have {user.tokens}"
        )

    # Check match exists (affection affects photo content)
    match = db.query(Match).filter(
        Match.user_id == request.user_id,
        Match.girl_id == request.girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Deduct tokens
    user.tokens -= token_cost
    db.commit()

    # Generate task ID
    task_id = str(uuid.uuid4())

    # TODO: Queue photo generation task with Celery
    # For now, return mock response
    logger.info(f"Photo generation queued: task_id={task_id}")

    # Mock: return placeholder
    # In production, this would:
    # 1. Queue Celery task
    # 2. Generate prompt based on girl profile + context + NSFW level
    # 3. Call Stable Diffusion XL or Promptchan API
    # 4. Upload to CDN
    # 5. Store in database

    return GeneratePhotoResponse(
        task_id=task_id,
        status="queued",
        photo_url=None,  # Will be set when completed
        estimated_time=5,  # 5 seconds average
        tokens_deducted=token_cost
    )


@router.post("/video", response_model=GenerateVideoResponse)
async def generate_video(request: GenerateVideoRequest, db: Session = Depends(get_db)):
    """
    Generate AI video of girlfriend (image-to-video).

    **Cost**: 15 tokens
    **Time**: ~30-60 seconds
    **Requires**: Premium or Elite subscription

    Generates animated video from image using AnimateDiff.
    """
    logger.info(f"Video generation request: user={request.user_id}, girl={request.girl_id}")

    # Check user subscription
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Video generation requires Premium or Elite subscription"
        )

    # Check tokens
    token_cost = settings.TOKEN_COST_VIDEO
    if user.tokens < token_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient tokens. You need {token_cost} tokens but have {user.tokens}"
        )

    # Check match exists
    match = db.query(Match).filter(
        Match.user_id == request.user_id,
        Match.girl_id == request.girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Deduct tokens
    user.tokens -= token_cost
    db.commit()

    # Generate task ID
    task_id = str(uuid.uuid4())

    logger.info(f"Video generation queued: task_id={task_id}")

    # TODO: Queue video generation with Celery
    # Would use AnimateDiff or A2E API

    return GenerateVideoResponse(
        task_id=task_id,
        status="queued",
        video_url=None,
        estimated_time=45,  # 45 seconds average
        tokens_deducted=token_cost
    )


@router.get("/status/{task_id}")
async def get_generation_status(task_id: str):
    """
    Check status of photo/video generation task.

    Returns current status and URL when completed.
    """
    # TODO: Check Celery task status or database
    # For now, return mock

    return {
        "task_id": task_id,
        "status": "processing",
        "progress": 45,  # percentage
        "estimated_remaining": 3  # seconds
    }
