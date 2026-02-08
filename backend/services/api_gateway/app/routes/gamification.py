"""
Gamification API Routes

Endpoints for XP, achievements, streaks, leaderboards
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict

from shared.utils.database import get_db
from ..gamification_service import (
    XPSystem,
    AchievementSystem,
    StreakSystem,
    LeaderboardSystem,
    track_action
)

router = APIRouter()


# ============================================================================
# XP & LEVELS
# ============================================================================

@router.get("/level/{user_id}")
async def get_user_level(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get user's current level and XP progress
    """
    user_level = XPSystem.get_user_level(db, user_id)

    if not user_level:
        raise HTTPException(status_code=404, detail="User level not found")

    return {
        "user_id": user_id,
        "level": user_level.level,
        "xp": user_level.xp,
        "xp_to_next_level": user_level.xp_to_next_level,
        "total_xp": user_level.xp + sum(
            XPSystem.calculate_xp_for_level(lvl)
            for lvl in range(1, user_level.level)
        ),
        "stats": {
            "total_messages": user_level.total_messages_sent,
            "total_matches": user_level.total_matches,
            "total_photos": user_level.total_photos_received,
            "total_videos": user_level.total_videos_received,
            "days_active": user_level.total_days_active,
            "current_streak": user_level.current_streak,
            "longest_streak": user_level.longest_streak
        }
    }


@router.post("/award-xp")
async def award_xp_endpoint(
    user_id: int,
    xp_amount: int,
    reason: str,
    db: Session = Depends(get_db)
):
    """
    Manually award XP to a user (admin/system use)
    """
    leveled_up, new_level = XPSystem.award_xp(
        db,
        user_id,
        xp_amount,
        reason
    )

    return {
        "success": True,
        "xp_awarded": xp_amount,
        "leveled_up": leveled_up,
        "new_level": new_level
    }


# ============================================================================
# ACHIEVEMENTS
# ============================================================================

@router.get("/achievements/{user_id}")
async def get_user_achievements(
    user_id: int,
    include_locked: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Get all achievements for user with progress
    """
    achievements = AchievementSystem.get_user_achievements(
        db,
        user_id,
        include_locked
    )

    # Calculate stats
    total = len(achievements)
    unlocked = sum(1 for ach in achievements if ach["is_unlocked"])
    locked = total - unlocked

    return {
        "achievements": achievements,
        "stats": {
            "total": total,
            "unlocked": unlocked,
            "locked": locked,
            "completion_percentage": round((unlocked / total * 100) if total > 0 else 0, 1)
        }
    }


@router.post("/track-action")
async def track_user_action(
    user_id: int,
    action: str,
    value: int = 1,
    db: Session = Depends(get_db)
):
    """
    Track user action and award XP + check achievements

    Actions:
    - message_sent
    - photo_received
    - video_received
    - match_created
    - affection_milestone
    - daily_login
    - achievement_unlock
    """
    result = track_action(db, user_id, action, value)

    return {
        "success": True,
        **result
    }


# ============================================================================
# DAILY REWARDS & STREAKS
# ============================================================================

@router.post("/daily-login/{user_id}")
async def claim_daily_login(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Claim daily login reward and update streak
    """
    result = StreakSystem.check_daily_login(db, user_id)

    return {
        "success": True,
        **result
    }


@router.get("/streak/{user_id}")
async def get_user_streak(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get user's current streak info
    """
    user_level = XPSystem.get_user_level(db, user_id)

    if not user_level:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user_id,
        "current_streak": user_level.current_streak,
        "longest_streak": user_level.longest_streak,
        "last_active": user_level.last_active_date.isoformat() if user_level.last_active_date else None,
        "total_days_active": user_level.total_days_active
    }


# ============================================================================
# LEADERBOARD
# ============================================================================

@router.get("/leaderboard")
async def get_leaderboard(
    period: str = Query("weekly", regex="^(weekly|monthly|all-time)$"),
    limit: int = Query(100, ge=10, le=500),
    db: Session = Depends(get_db)
):
    """
    Get leaderboard for specified period

    Periods:
    - weekly: Last 7 days (Monday to Sunday)
    - monthly: Current month
    - all-time: All time
    """
    leaderboard = LeaderboardSystem.get_leaderboard(db, period, limit)

    return {
        "period": period,
        "leaderboard": leaderboard,
        "total_users": len(leaderboard)
    }


@router.get("/leaderboard/user/{user_id}")
async def get_user_leaderboard_position(
    user_id: int,
    period: str = Query("weekly", regex="^(weekly|monthly|all-time)$"),
    db: Session = Depends(get_db)
):
    """
    Get user's position in leaderboard
    """
    leaderboard = LeaderboardSystem.get_leaderboard(db, period, 10000)

    # Find user in leaderboard
    user_position = next(
        (entry for entry in leaderboard if entry["user_id"] == user_id),
        None
    )

    if not user_position:
        raise HTTPException(status_code=404, detail="User not found in leaderboard")

    # Get top 3 for context
    top_3 = leaderboard[:3]

    return {
        "user_position": user_position,
        "top_3": top_3,
        "total_users": len(leaderboard)
    }


# ============================================================================
# STATS
# ============================================================================

@router.get("/stats/{user_id}")
async def get_gamification_stats(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive gamification stats for user
    """
    # Level info
    user_level = XPSystem.get_user_level(db, user_id)
    if not user_level:
        raise HTTPException(status_code=404, detail="User not found")

    # Achievements
    achievements = AchievementSystem.get_user_achievements(db, user_id)
    unlocked_count = sum(1 for ach in achievements if ach["is_unlocked"])

    # Leaderboard position (weekly)
    leaderboard = LeaderboardSystem.get_leaderboard(db, "weekly", 10000)
    user_rank = next(
        (entry["rank"] for entry in leaderboard if entry["user_id"] == user_id),
        None
    )

    return {
        "user_id": user_id,
        "level": {
            "current": user_level.level,
            "xp": user_level.xp,
            "xp_to_next": user_level.xp_to_next_level,
            "progress_percentage": round(
                (user_level.xp / user_level.xp_to_next_level * 100), 1
            )
        },
        "achievements": {
            "total": len(achievements),
            "unlocked": unlocked_count,
            "completion": round((unlocked_count / len(achievements) * 100), 1) if achievements else 0
        },
        "streak": {
            "current": user_level.current_streak,
            "longest": user_level.longest_streak,
            "days_active": user_level.total_days_active
        },
        "leaderboard": {
            "weekly_rank": user_rank,
            "total_users": len(leaderboard)
        },
        "activity": {
            "messages_sent": user_level.total_messages_sent,
            "matches": user_level.total_matches,
            "photos_received": user_level.total_photos_received,
            "videos_received": user_level.total_videos_received
        }
    }
