"""REST API routes for chat message history"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import List
import logging
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db, get_redis, cache_key
from shared.models.chat import ChatMessage, ChatMessageResponse, MessageSender
from shared.models.match import Match

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


@router.get("/rooms")
async def get_chat_rooms(user_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Get all chat rooms for user.

    Returns list of matches with last message and unread count.
    """
    logger.info(f"Getting chat rooms for user {user_id}")

    # Get all matches
    matches = db.query(Match).filter(Match.user_id == user_id).all()

    rooms = []
    for match in matches:
        # Get last message
        last_message = db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id,
            ChatMessage.girl_id == match.girl_id
        ).order_by(ChatMessage.timestamp.desc()).first()

        # Count unread messages (from girl, not read)
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id,
            ChatMessage.girl_id == match.girl_id,
            ChatMessage.sender == MessageSender.GIRL,
            ChatMessage.status != 'read'
        ).count()

        rooms.append({
            'girl_id': match.girl_id,
            'girl_name': match.girl_id.capitalize(),  # TODO: Get from profile
            'affection': match.affection,
            'last_message': ChatMessageResponse.model_validate(last_message) if last_message else None,
            'unread_count': unread_count,
            'last_interaction': match.last_interaction_at.isoformat()
        })

    # Sort by last interaction (most recent first)
    rooms.sort(key=lambda x: x['last_interaction'], reverse=True)

    return {'rooms': rooms, 'total': len(rooms)}


@router.get("/messages")
async def get_messages(
    user_id: int = Query(...),
    girl_id: str = Query(...),
    limit: int = Query(100, ge=10, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get chat message history between user and girlfriend.

    Returns messages sorted by timestamp (newest first for pagination).
    Client should reverse for display.
    """
    logger.info(f"Getting messages for user {user_id} with {girl_id}, limit={limit}, offset={offset}")

    # Check match exists
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Try cache for first page
    if offset == 0:
        cache = get_redis()
        cache_key_str = cache_key("recent_messages", user_id, girl_id)
        # Note: We store IDs in cache, not full objects
        # For now, skip cache and just query DB

    # Get messages from DB
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.girl_id == girl_id
    ).order_by(
        ChatMessage.timestamp.desc()
    ).offset(offset).limit(limit).all()

    logger.info(f"Retrieved {len(messages)} messages")

    return {
        'messages': [ChatMessageResponse.model_validate(msg) for msg in messages],
        'total': len(messages),
        'has_more': len(messages) == limit
    }


@router.post("/send")
async def send_message_rest(
    user_id: int,
    girl_id: str,
    content: str,
    media_type: str = None,
    media_url: str = None,
    db: Session = Depends(get_db)
):
    """
    Send message via REST API (for clients without WebSocket support).

    Prefer using WebSocket for real-time experience.
    """
    logger.info(f"REST: Send message from user {user_id} to {girl_id}")

    # Check match exists
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Save message
    from datetime import datetime
    message = ChatMessage(
        user_id=user_id,
        girl_id=girl_id,
        sender=MessageSender.USER,
        content=content,
        media_type=media_type,
        media_url=media_url,
        timestamp=datetime.utcnow()
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    logger.info(f"Message saved via REST: ID {message.id}")

    # For REST, we don't trigger AI response immediately
    # Client should poll or connect via WebSocket for response

    return {
        'message': ChatMessageResponse.model_validate(message),
        'note': 'Use WebSocket for instant AI response'
    }


@router.post("/mark-read")
async def mark_messages_read(
    user_id: int,
    girl_id: str,
    db: Session = Depends(get_db)
):
    """
    Mark all unread messages from girlfriend as read.
    """
    logger.info(f"Marking messages read for user {user_id} with {girl_id}")

    # Update all unread messages to READ
    updated = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.girl_id == girl_id,
        ChatMessage.sender == MessageSender.GIRL,
        ChatMessage.status != 'read'
    ).update({'status': 'read'}, synchronize_session=False)

    db.commit()

    logger.info(f"Marked {updated} messages as read")

    return {
        'message': 'Messages marked as read',
        'count': updated
    }
