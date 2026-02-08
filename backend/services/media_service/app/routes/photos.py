"""Photo generation routes"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import logging
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.utils.database import get_db
from shared.models.media import ReceivedPhoto
from shared.models.match import Match
from ..generation import generate_image_promptchan

logger = logging.getLogger(__name__)
router = APIRouter()


class GeneratePhotoRequest(BaseModel):
    user_id: int
    girl_id: str
    context: Optional[str] = "selfie"
    nsfw_level: int = 50
    custom_prompt: Optional[str] = None


@router.post("/generate")
async def generate_photo(request: GeneratePhotoRequest, db: Session = Depends(get_db)):
    """Generate AI photo using Promptchan API"""

    match = db.query(Match).filter(Match.user_id == request.user_id, Match.girl_id == request.girl_id).first()
    if not match:
        raise HTTPException(404, "Match not found")

    # Girl profile (simplified)
    girl_appearance = f"{request.girl_id}, beautiful woman, realistic photo"
    girl_age = 23

    # Generate with Promptchan
    image_url = await generate_image_promptchan(
        girl_appearance=girl_appearance,
        girl_age=girl_age,
        description=request.context or "",
        affection=match.affection,
        custom_prompt=request.custom_prompt
    )

    if not image_url:
        raise HTTPException(503, "Image generation failed")

    # Save to DB
    photo = ReceivedPhoto(user_id=request.user_id, girl_id=request.girl_id, photo_url=image_url, context=request.context, is_nsfw=request.nsfw_level > 50)
    db.add(photo)
    match.photos_received += 1
    db.commit()

    logger.info(f"Photo generated for user {request.user_id}: {image_url[:50]}...")

    return {"photo_url": image_url, "task_id": str(uuid.uuid4()), "status": "completed"}


@router.get("/")
async def get_photos(user_id: int = Query(...), girl_id: str = Query(...), limit: int = 50, db: Session = Depends(get_db)):
    """Get photos received from girlfriend"""
    photos = db.query(ReceivedPhoto).filter(ReceivedPhoto.user_id == user_id, ReceivedPhoto.girl_id == girl_id).order_by(ReceivedPhoto.received_at.desc()).limit(limit).all()
    return {"photos": [{"id": p.id, "url": p.photo_url, "context": p.context, "received_at": p.received_at.isoformat()} for p in photos], "total": len(photos)}
