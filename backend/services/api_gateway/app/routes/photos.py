"""
Photo generation routes using local SDXL service
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import httpx
from datetime import datetime
import asyncio

from ....shared.models.user import User
from ....shared.models.match import Match
from ....shared.database import get_db
from sqlalchemy.orm import Session
from ..dependencies import get_current_user

router = APIRouter()

# Image generation service URL
IMAGE_SERVICE_URL = "http://localhost:8007"

# Token cost for photo generation
PHOTO_COST_TOKENS = 5


class PhotoGenerationRequest(BaseModel):
    """Request to generate a photo"""
    girl_id: str = Field(..., description="ID of the girlfriend")
    context: Optional[str] = Field(None, description="Context from conversation")
    specific_request: Optional[str] = Field(None, description="Specific user request")
    high_quality: bool = Field(default=False, description="Use high quality (refiner)")


class PhotoGenerationResponse(BaseModel):
    """Response after requesting photo generation"""
    job_id: str
    status: str
    estimated_time: int  # seconds
    message: str


class PhotoStatusResponse(BaseModel):
    """Response for photo status check"""
    job_id: str
    status: str  # queued, processing, completed, failed
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_time: Optional[float] = None
    error: Optional[str] = None


class PhotoHistoryItem(BaseModel):
    """Photo history item"""
    id: int
    girl_id: str
    girl_name: str
    image_url: str
    thumbnail_url: str
    created_at: datetime


def check_token_balance(user: User, cost: int, db: Session) -> bool:
    """Check if user has enough tokens"""
    if user.token_balance >= cost:
        user.token_balance -= cost
        db.commit()
        return True
    return False


def get_girl_appearance(girl_id: str, db: Session) -> dict:
    """Get girl's appearance attributes from database"""
    # This would query the girls or custom_girls table
    # For now, returning a default
    # TODO: Implement actual database query
    return {
        "ethnicity": "caucasian",
        "age": 25,
        "body_type": "athletic",
        "breast_size": "medium",
        "hair_color": "blonde",
        "hair_length": "long",
        "eye_color": "blue"
    }


def get_affection_level(user_id: int, girl_id: str, db: Session) -> int:
    """Get current affection level with this girl"""
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if match:
        return match.affection_level
    return 0


@router.post("/generate", response_model=PhotoGenerationResponse)
async def generate_photo(
    request: PhotoGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a photo using local SDXL service
    Costs 5 tokens
    """
    try:
        # Check token balance
        if not check_token_balance(current_user, PHOTO_COST_TOKENS, db):
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient tokens. Need {PHOTO_COST_TOKENS} tokens."
            )

        # Get girl appearance
        appearance = get_girl_appearance(request.girl_id, db)

        # Get affection level
        affection_level = get_affection_level(current_user.id, request.girl_id, db)

        # Calculate NSFW level based on affection
        nsfw_level = min(100, affection_level + 10)

        # Generate contextual prompt
        from ....services.image_generation_service.main import (
            generate_contextual_prompt,
            GirlAppearance
        )

        girl_appearance = GirlAppearance(**appearance)
        prompt_data = generate_contextual_prompt(
            girl=girl_appearance,
            affection_level=affection_level,
            nsfw_level=nsfw_level,
            context=request.context,
            user_request=request.specific_request
        )

        # Call image generation service
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{IMAGE_SERVICE_URL}/generate",
                json={
                    "girl_id": request.girl_id,
                    "user_id": current_user.id,
                    "prompt": prompt_data["prompt"],
                    "negative_prompt": prompt_data["negative_prompt"],
                    "affection_level": affection_level,
                    "nsfw_level": nsfw_level,
                    "num_inference_steps": 40 if request.high_quality else 30,
                    "guidance_scale": 7.5,
                    "high_quality": request.high_quality,
                    "priority": "high" if current_user.subscription_tier == "elite" else "normal"
                }
            )

            if response.status_code != 200:
                # Refund tokens if service fails
                current_user.token_balance += PHOTO_COST_TOKENS
                db.commit()
                raise HTTPException(
                    status_code=500,
                    detail="Image generation service unavailable"
                )

            result = response.json()

            # Estimate time based on quality
            estimated_time = 3 if request.high_quality else 2

            return PhotoGenerationResponse(
                job_id=result["job_id"],
                status=result["status"],
                estimated_time=estimated_time,
                message=f"Photo generation started. Check back in {estimated_time} seconds."
            )

    except HTTPException:
        raise
    except Exception as e:
        # Refund tokens on error
        current_user.token_balance += PHOTO_COST_TOKENS
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=PhotoStatusResponse)
async def get_photo_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check the status of a photo generation job
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{IMAGE_SERVICE_URL}/status/{job_id}")

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Job not found")

            result = response.json()

            return PhotoStatusResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[PhotoHistoryItem])
async def get_photo_history(
    girl_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's photo generation history
    """
    try:
        from ....shared.models.media import ProfilePhoto

        query = db.query(ProfilePhoto).filter(
            ProfilePhoto.user_id == current_user.id
        )

        if girl_id:
            query = query.filter(ProfilePhoto.girl_id == girl_id)

        photos = query.order_by(ProfilePhoto.created_at.desc()).limit(limit).all()

        return [
            PhotoHistoryItem(
                id=photo.id,
                girl_id=photo.girl_id,
                girl_name=photo.girl_name or "Unknown",
                image_url=photo.url,
                thumbnail_url=photo.thumbnail_url or photo.url,
                created_at=photo.created_at
            )
            for photo in photos
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a photo from history
    """
    try:
        from ....shared.models.media import ProfilePhoto

        photo = db.query(ProfilePhoto).filter(
            ProfilePhoto.id == photo_id,
            ProfilePhoto.user_id == current_user.id
        ).first()

        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")

        db.delete(photo)
        db.commit()

        return {"success": True, "message": "Photo deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/costs")
async def get_photo_costs():
    """
    Get current photo generation costs
    """
    return {
        "standard_photo": PHOTO_COST_TOKENS,
        "high_quality_photo": PHOTO_COST_TOKENS,
        "currency": "tokens",
        "note": "High quality photos use refiner for better results but take longer"
    }
