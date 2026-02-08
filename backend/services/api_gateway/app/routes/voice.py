"""
Voice TTS routes using ElevenLabs service
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import httpx
from datetime import datetime

from ....shared.models.user import User
from ....shared.database import get_db
from sqlalchemy.orm import Session
from ..dependencies import get_current_user

router = APIRouter()

# Voice service URL
VOICE_SERVICE_URL = "http://localhost:8009"

# Token cost for voice generation (per message)
VOICE_COST_TOKENS = 3


class VoiceMessageRequest(BaseModel):
    """Request to generate voice message"""
    girl_id: str = Field(..., description="ID of the girlfriend")
    text: str = Field(..., description="Message text", max_length=5000)
    archetype: str = Field(default="default", description="Voice archetype")
    emotion: Optional[str] = Field(None, description="Emotion override")


class VoiceMessageResponse(BaseModel):
    """Response after requesting voice generation"""
    job_id: str
    status: str
    estimated_time: int  # seconds
    message: str


class VoiceStatusResponse(BaseModel):
    """Response for voice status check"""
    job_id: str
    status: str  # queued, processing, completed, failed
    audio_url: Optional[str] = None
    generation_time: Optional[float] = None
    duration: Optional[float] = None
    characters_used: Optional[int] = None
    error: Optional[str] = None


class VoiceProfile(BaseModel):
    """Voice profile information"""
    voice_id: str
    name: str
    description: str


def check_token_balance(user: User, cost: int, db: Session) -> bool:
    """Check if user has enough tokens"""
    if user.token_balance >= cost:
        user.token_balance -= cost
        db.commit()
        return True
    return False


def check_premium_tier(user: User) -> bool:
    """Check if user has Premium or Elite tier (required for voice)"""
    return user.subscription_tier in ["premium", "elite"]


@router.post("/generate", response_model=VoiceMessageResponse)
async def generate_voice_message(
    request: VoiceMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate voice message using ElevenLabs TTS
    Requires Premium or Elite tier subscription
    Costs 3 tokens per message
    """
    try:
        # Check Premium/Elite tier requirement
        if not check_premium_tier(current_user):
            raise HTTPException(
                status_code=403,
                detail="Voice messages require Premium or Elite tier subscription"
            )

        # Check token balance
        if not check_token_balance(current_user, VOICE_COST_TOKENS, db):
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient tokens. Need {VOICE_COST_TOKENS} tokens."
            )

        # Call voice generation service
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{VOICE_SERVICE_URL}/generate",
                json={
                    "girl_id": request.girl_id,
                    "user_id": current_user.id,
                    "text": request.text,
                    "archetype": request.archetype,
                    "emotion": request.emotion,
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "priority": "high" if current_user.subscription_tier == "elite" else "normal"
                }
            )

            if response.status_code != 200:
                # Refund tokens if service fails
                current_user.token_balance += VOICE_COST_TOKENS
                db.commit()
                raise HTTPException(
                    status_code=500,
                    detail="Voice generation service unavailable"
                )

            result = response.json()

            # Estimate time (ElevenLabs is usually fast, ~1-2s)
            estimated_time = 2

            return VoiceMessageResponse(
                job_id=result["job_id"],
                status=result["status"],
                estimated_time=estimated_time,
                message=f"Voice generation started. Check back in {estimated_time} seconds."
            )

    except HTTPException:
        raise
    except Exception as e:
        # Refund tokens on error
        current_user.token_balance += VOICE_COST_TOKENS
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=VoiceStatusResponse)
async def get_voice_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check the status of a voice generation job
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{VOICE_SERVICE_URL}/status/{job_id}")

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Job not found")

            result = response.json()

            return VoiceStatusResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profiles", response_model=List[VoiceProfile])
async def list_voice_profiles(
    current_user: User = Depends(get_current_user)
):
    """
    List available voice profiles
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{VOICE_SERVICE_URL}/voices")

            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch voice profiles")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/costs")
async def get_voice_costs():
    """
    Get current voice generation costs
    """
    return {
        "voice_message": VOICE_COST_TOKENS,
        "currency": "tokens",
        "requirements": "Premium or Elite tier subscription",
        "note": "Each text message converted to voice costs 3 tokens"
    }


@router.post("/enable")
async def enable_voice_for_girl(
    girl_id: str,
    archetype: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enable voice for a specific girl with chosen archetype
    """
    try:
        # This would store the voice preference in database
        # For now, just return success

        return {
            "success": True,
            "message": f"Voice enabled for {girl_id} with {archetype} archetype",
            "archetype": archetype
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disable")
async def disable_voice_for_girl(
    girl_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable voice for a specific girl
    """
    try:
        # This would remove the voice preference from database

        return {
            "success": True,
            "message": f"Voice disabled for {girl_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
