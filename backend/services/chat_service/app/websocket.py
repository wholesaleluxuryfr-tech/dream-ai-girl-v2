"""
WebSocket handlers using Socket.IO
Handles real-time chat events: connect, disconnect, send message, typing, read receipts
"""

import socketio
import logging
import httpx
import sys
import os
from datetime import datetime
from sqlalchemy.orm import Session

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import SessionLocal, get_redis, cache_key
from shared.models.chat import ChatMessage, MessageSender, MessageStatus
from shared.models.match import Match

logger = logging.getLogger(__name__)
settings = get_settings()

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)


# Connected users tracking (user_id -> session_id)
connected_users = {}


@sio.event
async def connect(sid, environ, auth):
    """
    Handle client connection.

    Client should send auth with user_id.
    """
    logger.info(f"Client connecting: {sid}")

    # Extract user_id from auth
    if not auth or 'user_id' not in auth:
        logger.warning(f"Connection rejected: no user_id in auth")
        return False

    user_id = auth['user_id']
    connected_users[user_id] = sid

    logger.info(f"User {user_id} connected with session {sid}")

    # Notify user is online
    await sio.emit('user_online', {'user_id': user_id}, room=sid)

    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnect"""
    # Find user_id for this session
    user_id = None
    for uid, session_id in connected_users.items():
        if session_id == sid:
            user_id = uid
            break

    if user_id:
        del connected_users[user_id]
        logger.info(f"User {user_id} disconnected")
    else:
        logger.info(f"Unknown session {sid} disconnected")


@sio.event
async def send_message(sid, data):
    """
    Handle user sending message to girlfriend.

    Data format:
    {
        "user_id": 123,
        "girl_id": "emma",
        "content": "Salut Emma!",
        "media_type": null,
        "media_url": null
    }

    Flow:
    1. Save user message to DB
    2. Call AI service to generate response
    3. Save AI response to DB
    4. Emit both messages to client
    """
    logger.info(f"Message received from {sid}: {data}")

    try:
        user_id = data.get('user_id')
        girl_id = data.get('girl_id')
        content = data.get('content')
        media_type = data.get('media_type')
        media_url = data.get('media_url')

        if not user_id or not girl_id or not content:
            await sio.emit('error', {'message': 'Missing required fields'}, room=sid)
            return

        db = SessionLocal()

        try:
            # Save user message
            user_message = ChatMessage(
                user_id=user_id,
                girl_id=girl_id,
                sender=MessageSender.USER,
                content=content,
                media_type=media_type,
                media_url=media_url,
                timestamp=datetime.utcnow(),
                status=MessageStatus.SENT
            )

            db.add(user_message)
            db.commit()
            db.refresh(user_message)

            logger.info(f"User message saved: ID {user_message.id}")

            # Emit user message to client (delivery confirmation)
            await sio.emit('message_sent', {
                'message_id': user_message.id,
                'timestamp': user_message.timestamp.isoformat(),
                'status': 'sent'
            }, room=sid)

            # Update message count in match
            match = db.query(Match).filter(
                Match.user_id == user_id,
                Match.girl_id == girl_id
            ).first()

            if match:
                match.messages_count += 1
                match.last_interaction_at = datetime.utcnow()
                db.commit()

            # Emit typing indicator (girlfriend is typing)
            await sio.emit('typing', {
                'girl_id': girl_id,
                'is_typing': True
            }, room=sid)

            # Call AI service to generate response
            async with httpx.AsyncClient(timeout=30.0) as client:
                ai_response = await client.post(
                    f"{settings.AI_SERVICE_URL}/chat/respond",
                    json={
                        'user_id': user_id,
                        'girl_id': girl_id,
                        'message': content
                    }
                )

                if ai_response.status_code != 200:
                    logger.error(f"AI service error: {ai_response.status_code}")
                    raise Exception("AI service unavailable")

                ai_data = ai_response.json()
                ai_message_text = ai_data['response']
                affection_change = ai_data['affection_change']
                new_affection = ai_data['new_affection']
                suggests_photo = ai_data.get('suggests_photo', False)

            # Stop typing indicator
            await sio.emit('typing', {
                'girl_id': girl_id,
                'is_typing': False
            }, room=sid)

            # Save AI response
            ai_message = ChatMessage(
                user_id=user_id,
                girl_id=girl_id,
                sender=MessageSender.GIRL,
                content=ai_message_text,
                timestamp=datetime.utcnow(),
                status=MessageStatus.DELIVERED
            )

            db.add(ai_message)

            # Update match affection
            if match:
                match.affection = new_affection
                match.messages_count += 1

            db.commit()
            db.refresh(ai_message)

            logger.info(f"AI response saved: ID {ai_message.id}, Affection: {new_affection} ({affection_change:+d})")

            # Emit AI response to client
            await sio.emit('message_received', {
                'message': {
                    'id': ai_message.id,
                    'girl_id': girl_id,
                    'content': ai_message_text,
                    'timestamp': ai_message.timestamp.isoformat(),
                    'status': 'delivered'
                },
                'affection': new_affection,
                'affection_change': affection_change,
                'suggests_photo': suggests_photo
            }, room=sid)

            # If suggests photo, emit photo_suggestion event
            if suggests_photo:
                await sio.emit('photo_suggestion', {
                    'girl_id': girl_id,
                    'message': 'Elle veut t\'envoyer une photo... 📸 (Coût: 5 tokens)'
                }, room=sid)

            # Cache recent messages in Redis for performance
            cache = get_redis()
            recent_key = cache_key("recent_messages", user_id, girl_id)
            # Store last 100 messages
            cache.lpush(recent_key, f"{ai_message.id}:{ai_message_text}")
            cache.ltrim(recent_key, 0, 99)
            cache.expire(recent_key, 3600)  # 1 hour TTL

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error handling message: {e}", exc_info=True)
        await sio.emit('error', {
            'message': 'Failed to process message',
            'error': str(e)
        }, room=sid)


@sio.event
async def typing_indicator(sid, data):
    """
    Handle typing indicator from user.

    Currently girlfriend typing is handled automatically by AI response.
    This is for potential future use (user-to-user chat).
    """
    logger.debug(f"Typing indicator from {sid}: {data}")
    # For now, no action needed (girlfriends don't see user typing)


@sio.event
async def mark_read(sid, data):
    """
    Mark messages as read.

    Data format:
    {
        "user_id": 123,
        "girl_id": "emma",
        "message_ids": [1, 2, 3]
    }
    """
    logger.info(f"Mark read from {sid}: {data}")

    try:
        user_id = data.get('user_id')
        girl_id = data.get('girl_id')
        message_ids = data.get('message_ids', [])

        if not user_id or not girl_id:
            return

        db = SessionLocal()

        try:
            # Update message status to READ
            updated = db.query(ChatMessage).filter(
                ChatMessage.id.in_(message_ids),
                ChatMessage.user_id == user_id,
                ChatMessage.girl_id == girl_id,
                ChatMessage.sender == MessageSender.GIRL
            ).update({ChatMessage.status: MessageStatus.READ}, synchronize_session=False)

            db.commit()

            logger.info(f"Marked {updated} messages as read for user {user_id}")

            # Emit read receipt confirmation
            await sio.emit('messages_read', {
                'message_ids': message_ids,
                'count': updated
            }, room=sid)

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error marking messages read: {e}", exc_info=True)


@sio.event
async def request_photo(sid, data):
    """
    User requests photo generation.

    Data format:
    {
        "user_id": 123,
        "girl_id": "emma",
        "context": "selfie",
        "nsfw_level": 50
    }
    """
    logger.info(f"Photo request from {sid}: {data}")

    try:
        user_id = data.get('user_id')
        girl_id = data.get('girl_id')
        context = data.get('context', 'selfie')
        nsfw_level = data.get('nsfw_level', 50)

        # Call AI service to generate photo
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/generate/photo",
                json={
                    'user_id': user_id,
                    'girl_id': girl_id,
                    'context': context,
                    'nsfw_level': nsfw_level
                }
            )

            if response.status_code == 200:
                photo_data = response.json()

                # Emit photo generation started
                await sio.emit('photo_generating', {
                    'task_id': photo_data['task_id'],
                    'estimated_time': photo_data['estimated_time'],
                    'tokens_deducted': photo_data['tokens_deducted']
                }, room=sid)
            else:
                error_data = response.json()
                await sio.emit('error', {
                    'message': error_data.get('detail', 'Photo generation failed')
                }, room=sid)

    except Exception as e:
        logger.error(f"Error requesting photo: {e}", exc_info=True)
        await sio.emit('error', {
            'message': 'Failed to generate photo',
            'error': str(e)
        }, room=sid)
