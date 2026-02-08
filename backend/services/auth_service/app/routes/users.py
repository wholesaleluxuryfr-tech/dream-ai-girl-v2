"""User management routes - CRUD operations on users"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import sys
import os
import logging

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db, cache_key, set_cached, delete_cached, get_cached
from shared.models.user import User, UserUpdate, UserResponse, UserStats
from shared.models.match import Match
from shared.models.chat import ChatMessage
from shared.models.media import ReceivedPhoto, GeneratedVideo

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get user by ID.

    Returns full user profile.
    """
    # Try cache first
    cache_key_str = cache_key("user_profile", user_id)
    cached = get_cached(cache_key_str)

    if cached:
        logger.info(f"User profile cache hit: {user_id}")
        import json
        return json.loads(cached)

    # Query database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    response = UserResponse.model_validate(user)

    # Cache for 15 minutes
    import json
    set_cached(cache_key_str, json.dumps(response.model_dump(), default=str), ttl=settings.REDIS_TTL_MEDIUM)

    return response


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """
    Update user profile.

    Can update username, email, age, photo_url, preferences.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update only provided fields
    update_data = user_update.model_dump(exclude_none=True)

    for field, value in update_data.items():
        if field == "username":
            # Check if new username is taken
            existing = db.query(User).filter(
                User.username == value.lower(),
                User.id != user_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            setattr(user, field, value.lower())
        elif field == "email":
            # Check if new email is taken
            existing = db.query(User).filter(
                User.email == value.lower(),
                User.id != user_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            setattr(user, field, value.lower())
        else:
            setattr(user, field, value)

    try:
        db.commit()
        db.refresh(user)

        logger.info(f"User profile updated: {user.username} (ID: {user_id})")

        # Invalidate cache
        cache_key_str = cache_key("user_profile", user_id)
        delete_cached(cache_key_str)

        return UserResponse.model_validate(user)

    except Exception as e:
        db.rollback()
        logger.error(f"User update failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Update failed"
        )


@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete user account permanently.

    ⚠️ This action is irreversible!

    Deletes:
    - User account
    - All matches
    - All messages
    - All media
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Delete related data (cascade delete)
        db.query(Match).filter(Match.user_id == user_id).delete()
        db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
        db.query(ReceivedPhoto).filter(ReceivedPhoto.user_id == user_id).delete()

        # Delete user
        db.delete(user)
        db.commit()

        logger.warning(f"User account deleted: {user.username} (ID: {user_id})")

        # Invalidate all caches for this user
        from shared.utils.database import invalidate_pattern
        invalidate_pattern(f"*user*{user_id}*")

        return {"message": "Account deleted successfully"}

    except Exception as e:
        db.rollback()
        logger.error(f"User deletion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deletion failed"
        )


@router.get("/{user_id}/stats", response_model=UserStats)
async def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """
    Get user statistics.

    Returns aggregated stats: matches, messages, photos, videos, etc.
    """
    # Check user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Try cache first
    cache_key_str = cache_key("user_stats", user_id)
    cached = get_cached(cache_key_str)

    if cached:
        logger.info(f"User stats cache hit: {user_id}")
        import json
        return json.loads(cached)

    # Calculate stats
    total_matches = db.query(func.count(Match.id)).filter(Match.user_id == user_id).scalar()
    total_messages = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.sender == "user"
    ).scalar()
    total_photos_received = db.query(func.count(ReceivedPhoto.id)).filter(
        ReceivedPhoto.user_id == user_id
    ).scalar()
    total_videos_generated = db.query(func.count(GeneratedVideo.id)).filter(
        GeneratedVideo.girl_id.in_(
            db.query(Match.girl_id).filter(Match.user_id == user_id)
        )
    ).scalar()

    # TODO: Calculate current_streak_days and achievements_unlocked
    # For now, use placeholder values
    current_streak_days = 0
    achievements_unlocked = 0

    stats = UserStats(
        total_matches=total_matches or 0,
        total_messages=total_messages or 0,
        total_photos_received=total_photos_received or 0,
        total_videos_generated=total_videos_generated or 0,
        current_streak_days=current_streak_days,
        achievements_unlocked=achievements_unlocked,
    )

    # Cache for 5 minutes (stats change frequently)
    import json
    set_cached(cache_key_str, json.dumps(stats.model_dump()), ttl=settings.REDIS_TTL_SHORT)

    return stats


@router.post("/{user_id}/add-tokens")
async def add_tokens(user_id: int, amount: int, db: Session = Depends(get_db)):
    """
    Add tokens to user account.

    Internal endpoint for payment service to add purchased tokens.
    """
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.tokens += amount
    db.commit()

    logger.info(f"Added {amount} tokens to user {user.username} (ID: {user_id}). New balance: {user.tokens}")

    # Invalidate cache
    cache_key_str = cache_key("user_profile", user_id)
    delete_cached(cache_key_str)

    return {
        "message": "Tokens added successfully",
        "new_balance": user.tokens,
        "added": amount
    }


@router.post("/{user_id}/deduct-tokens")
async def deduct_tokens(user_id: int, amount: int, reason: str, db: Session = Depends(get_db)):
    """
    Deduct tokens from user account.

    Internal endpoint for spending tokens (photo/video generation, etc.)
    """
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tokens < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient tokens. You need {amount} tokens but have {user.tokens}"
        )

    user.tokens -= amount
    db.commit()

    logger.info(f"Deducted {amount} tokens from user {user.username} (ID: {user_id}) for: {reason}. New balance: {user.tokens}")

    # Invalidate cache
    cache_key_str = cache_key("user_profile", user_id)
    delete_cached(cache_key_str)

    return {
        "message": "Tokens deducted successfully",
        "new_balance": user.tokens,
        "deducted": amount,
        "reason": reason
    }


@router.post("/{user_id}/add-xp")
async def add_xp(user_id: int, amount: int, reason: str, db: Session = Depends(get_db)):
    """
    Add XP to user account.

    Internal endpoint for gamification (messages, photos, daily login).
    """
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_xp = user.xp
    old_level = user.level
    user.xp += amount

    # Check for level up
    xp_for_next_level = user.level * settings.XP_FOR_LEVEL_UP
    while user.xp >= xp_for_next_level:
        user.level += 1
        user.xp -= xp_for_next_level
        xp_for_next_level = user.level * settings.XP_FOR_LEVEL_UP
        logger.info(f"User {user.username} leveled up to level {user.level}!")

    db.commit()

    level_up = user.level > old_level

    logger.info(f"Added {amount} XP to user {user.username} (ID: {user_id}) for: {reason}. New XP: {user.xp}, Level: {user.level}")

    # Invalidate cache
    cache_key_str = cache_key("user_profile", user_id)
    delete_cached(cache_key_str)

    return {
        "message": "XP added successfully",
        "xp": user.xp,
        "level": user.level,
        "added": amount,
        "reason": reason,
        "level_up": level_up
    }
