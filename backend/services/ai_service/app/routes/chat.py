"""Chat AI routes - generate girlfriend responses"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db
from shared.models.chat import ChatMessage
from shared.models.match import Match

from ..conversation import (
    generate_ai_response,
    detect_photo_request,
    should_send_photo_spontaneously,
    calculate_affection_change
)

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# Girlfriend profiles (simplified - in production these would be in DB)
GIRL_PROFILES = {
    "emma": {
        "name": "Emma",
        "age": 23,
        "job": "étudiante en droit",
        "location": "Paris",
        "personality": "romantique et passionnée",
        "likes": "lire, voyager, les restaurants",
        "dislikes": "les mecs relous",
        "archetype": "romantique"
    },
    "chloe": {
        "name": "Chloé",
        "age": 21,
        "job": "vendeuse",
        "location": "Lyon",
        "personality": "coquine et spontanée",
        "likes": "sortir, danser, s'amuser",
        "dislikes": "l'ennui",
        "archetype": "perverse"
    }
}


class ChatRequest(BaseModel):
    user_id: int
    girl_id: str
    message: str


class ChatResponse(BaseModel):
    response: str
    affection_change: int
    new_affection: int
    suggests_photo: bool = False
    photo_context: Optional[str] = None


@router.post("/respond", response_model=ChatResponse)
async def generate_response(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Generate AI girlfriend response to user message.

    - Updates affection based on message content
    - May suggest sending a photo
    - Returns AI-generated response

    This is the CORE endpoint of the entire application.
    """
    logger.info(f"Generating response for user {request.user_id} with {request.girl_id}")

    # Get match (to get affection level)
    match = db.query(Match).filter(
        Match.user_id == request.user_id,
        Match.girl_id == request.girl_id
    ).first()

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found - user must match with girlfriend first"
        )

    # Get girl profile
    girl_profile = GIRL_PROFILES.get(request.girl_id)
    if not girl_profile:
        # Fallback for custom girls or unknown girls
        girl_profile = {
            "name": request.girl_id.capitalize(),
            "age": 23,
            "job": "étudiante",
            "location": "France",
            "personality": "charmante",
            "likes": "toi",
            "dislikes": "rien",
            "archetype": "romantique"
        }

    # Get recent message history (last 10 messages)
    recent_messages_db = db.query(ChatMessage).filter(
        ChatMessage.user_id == request.user_id,
        ChatMessage.girl_id == request.girl_id
    ).order_by(ChatMessage.timestamp.desc()).limit(10).all()

    recent_messages = [
        {
            "sender": "girl" if msg.sender == "girl" else "user",
            "content": msg.content
        }
        for msg in reversed(recent_messages_db)  # Reverse to get chronological order
    ]

    # TODO: Get memory context from vector DB (for now, empty)
    memory_context = ""

    # Calculate affection change
    affection_change = calculate_affection_change(request.message, match.affection)
    new_affection = max(0, min(100, match.affection + affection_change))

    # Build conversation metadata for advanced prompts
    from datetime import datetime, timedelta

    # Count messages since last photo
    last_photo_messages_ago = 999  # Default: no recent photo
    messages_since_photo = 0
    for msg in recent_messages_db:
        if msg.media_url:  # Found a photo
            last_photo_messages_ago = messages_since_photo
            break
        messages_since_photo += 1

    # Calculate time since user's last message
    user_last_message = next((msg for msg in recent_messages_db if msg.sender != "girl"), None)
    time_since_last_message_hours = 0.0
    if user_last_message:
        time_diff = datetime.utcnow() - user_last_message.timestamp
        time_since_last_message_hours = time_diff.total_seconds() / 3600

    conversation_metadata = {
        "length": match.messages_count,
        "last_photo_messages_ago": last_photo_messages_ago,
        "time_since_last_message_hours": time_since_last_message_hours,
    }

    # Generate AI response (with metadata for advanced prompts + memory system)
    ai_response = await generate_ai_response(
        girl_profile=girl_profile,
        user_message=request.message,
        affection=new_affection,
        recent_messages=recent_messages,
        memory_context=memory_context,
        conversation_metadata=conversation_metadata,
        user_id=request.user_id,
        girl_id=request.girl_id
    )

    # Check if should suggest photo
    suggests_photo = False
    photo_context = None

    # User explicitly requested photo
    if detect_photo_request(request.message):
        suggests_photo = True
        photo_context = "requested"
        logger.info(f"Photo requested by user in message")

    # Spontaneous photo at high affection
    elif should_send_photo_spontaneously(new_affection, match.messages_count):
        suggests_photo = True
        photo_context = "spontaneous"
        logger.info(f"Girlfriend sends spontaneous photo (affection: {new_affection})")

    # Update match affection
    match.affection = new_affection
    match.messages_count += 1
    db.commit()

    logger.info(f"Response generated. Affection: {match.affection} ({affection_change:+d}), Suggests photo: {suggests_photo}")

    return ChatResponse(
        response=ai_response,
        affection_change=affection_change,
        new_affection=new_affection,
        suggests_photo=suggests_photo,
        photo_context=photo_context
    )


@router.get("/test")
async def test_ai():
    """Test endpoint to verify OpenRouter API is working"""
    from ..conversation import openrouter_client

    if not openrouter_client:
        return {
            "status": "error",
            "message": "OpenRouter client not initialized - check API key"
        }

    try:
        response = await openrouter_client.chat.completions.create(
            model=settings.OPENROUTER_MODEL,
            messages=[{"role": "user", "content": "Dis 'Salut' en français"}],
            max_tokens=10
        )

        return {
            "status": "success",
            "model": settings.OPENROUTER_MODEL,
            "response": response.choices[0].message.content
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
