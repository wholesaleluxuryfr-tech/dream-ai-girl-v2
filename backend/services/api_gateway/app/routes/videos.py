"""
Video generation routes using AnimateDiff service
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import httpx
from datetime import datetime

from ....shared.models.user import User
from ....shared.models.match import Match
from ....shared.database import get_db
from sqlalchemy.orm import Session
from ..dependencies import get_current_user

router = APIRouter()

# Video generation service URL
VIDEO_SERVICE_URL = "http://localhost:8008"

# Token cost for video generation
VIDEO_COST_TOKENS = 15


class VideoGenerationRequest(BaseModel):
    """Request to generate a video"""
    girl_id: str = Field(..., description="ID of the girlfriend")
    context: Optional[str] = Field(None, description="Context from conversation")
    specific_request: Optional[str] = Field(None, description="Specific user request")
    num_frames: int = Field(default=16, ge=8, le=32)
    fps: int = Field(default=8, ge=4, le=16)


class VideoGenerationResponse(BaseModel):
    """Response after requesting video generation"""
    job_id: str
    status: str
    estimated_time: int  # seconds
    message: str


class VideoStatusResponse(BaseModel):
    """Response for video status check"""
    job_id: str
    status: str  # queued, processing, completed, failed
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_time: Optional[float] = None
    duration: Optional[float] = None
    frame_count: Optional[int] = None
    error: Optional[str] = None


class VideoHistoryItem(BaseModel):
    """Video history item"""
    id: int
    girl_id: str
    girl_name: str
    video_url: str
    thumbnail_url: str
    duration: float
    created_at: datetime


def check_token_balance(user: User, cost: int, db: Session) -> bool:
    """Check if user has enough tokens"""
    if user.token_balance >= cost:
        user.token_balance -= cost
        db.commit()
        return True
    return False


def check_elite_tier(user: User) -> bool:
    """Check if user has Elite tier (required for videos)"""
    return user.subscription_tier == "elite"


def get_affection_level(user_id: int, girl_id: str, db: Session) -> int:
    """Get current affection level with this girl"""
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if match:
        return match.affection_level
    return 0


@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a video using AnimateDiff service
    Requires Elite tier subscription
    Costs 15 tokens
    """
    try:
        # Check Elite tier requirement
        if not check_elite_tier(current_user):
            raise HTTPException(
                status_code=403,
                detail="Video generation requires Elite tier subscription"
            )

        # Check token balance
        if not check_token_balance(current_user, VIDEO_COST_TOKENS, db):
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient tokens. Need {VIDEO_COST_TOKENS} tokens."
            )

        # Get affection level
        affection_level = get_affection_level(current_user.id, request.girl_id, db)

        # Calculate NSFW level
        nsfw_level = min(100, affection_level + 10)

        # Generate contextual prompt for video
        # Similar to photos but optimized for motion
        prompt = generate_video_prompt(
            girl_id=request.girl_id,
            affection_level=affection_level,
            nsfw_level=nsfw_level,
            context=request.context,
            user_request=request.specific_request
        )

        # Call video generation service
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{VIDEO_SERVICE_URL}/generate",
                json={
                    "girl_id": request.girl_id,
                    "user_id": current_user.id,
                    "prompt": prompt["prompt"],
                    "negative_prompt": prompt["negative_prompt"],
                    "num_frames": request.num_frames,
                    "num_inference_steps": 30,
                    "guidance_scale": 7.5,
                    "fps": request.fps,
                    "duration_seconds": int(request.num_frames / request.fps),
                    "priority": "urgent"  # Elite users get priority
                }
            )

            if response.status_code != 200:
                # Refund tokens if service fails
                current_user.token_balance += VIDEO_COST_TOKENS
                db.commit()
                raise HTTPException(
                    status_code=500,
                    detail="Video generation service unavailable"
                )

            result = response.json()

            # Estimate time based on frames
            estimated_time = int(request.num_frames / 2)  # ~0.5s per frame

            return VideoGenerationResponse(
                job_id=result["job_id"],
                status=result["status"],
                estimated_time=estimated_time,
                message=f"Video generation started. Check back in {estimated_time} seconds."
            )

    except HTTPException:
        raise
    except Exception as e:
        # Refund tokens on error
        current_user.token_balance += VIDEO_COST_TOKENS
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=VideoStatusResponse)
async def get_video_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check the status of a video generation job
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{VIDEO_SERVICE_URL}/status/{job_id}")

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Job not found")

            result = response.json()

            return VideoStatusResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[VideoHistoryItem])
async def get_video_history(
    girl_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's video generation history
    """
    try:
        from ....shared.models.media import ProfileVideo

        query = db.query(ProfileVideo).filter(
            ProfileVideo.user_id == current_user.id
        )

        if girl_id:
            query = query.filter(ProfileVideo.girl_id == girl_id)

        videos = query.order_by(ProfileVideo.created_at.desc()).limit(limit).all()

        return [
            VideoHistoryItem(
                id=video.id,
                girl_id=video.girl_id,
                girl_name=video.girl_name or "Unknown",
                video_url=video.url,
                thumbnail_url=video.thumbnail_url or video.url,
                duration=video.duration or 2.0,
                created_at=video.created_at
            )
            for video in videos
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{video_id}")
async def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a video from history
    """
    try:
        from ....shared.models.media import ProfileVideo

        video = db.query(ProfileVideo).filter(
            ProfileVideo.id == video_id,
            ProfileVideo.user_id == current_user.id
        ).first()

        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

        db.delete(video)
        db.commit()

        return {"success": True, "message": "Video deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/costs")
async def get_video_costs():
    """
    Get current video generation costs
    """
    return {
        "video": VIDEO_COST_TOKENS,
        "currency": "tokens",
        "requirements": "Elite tier subscription",
        "note": "Videos are 1-5 seconds long with smooth motion"
    }


def generate_video_prompt(
    girl_id: str,
    affection_level: int,
    nsfw_level: int,
    context: Optional[str] = None,
    user_request: Optional[str] = None
) -> Dict[str, str]:
    """
    Generate optimized prompt for video generation
    Videos need motion-focused prompts
    """
    # Base quality tags for video
    quality_tags = [
        "high quality", "smooth motion", "cinematic", "detailed",
        "professional video", "fluid animation", "natural movement"
    ]

    # Motion keywords
    motion_words = [
        "moving", "turning head", "smiling", "winking", "blowing kiss",
        "hair flowing", "gentle movement", "subtle motion", "expressive"
    ]

    # Determine NSFW level
    if nsfw_level < 30:
        action = "smiling and waving"
        clothing = "casual dress"
    elif nsfw_level < 60:
        action = "blowing kiss, playful wink"
        clothing = "revealing outfit"
    elif nsfw_level < 85:
        action = "sensual movement, seductive expression"
        clothing = "lingerie"
    else:
        action = "very seductive movement, explicit expression"
        clothing = "nude or minimal clothing"

    # Construct prompt
    prompt_parts = quality_tags + [
        f"beautiful woman, {clothing}, {action}",
        *motion_words[:3],  # Add some motion keywords
        user_request if user_request else ""
    ]

    prompt = ", ".join([p for p in prompt_parts if p])

    negative_prompt = """
    static, still image, frozen, no movement, rigid, stiff,
    low quality, blurry, distorted, deformed, ugly,
    watermark, text, logo, artifacts, compression,
    bad anatomy, bad motion, jittery, flickering
    """

    return {
        "prompt": prompt,
        "negative_prompt": negative_prompt.strip()
    }
