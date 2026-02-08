"""
Gamification Service - XP, Achievements, Streaks, Rewards

Handles all gamification logic for user engagement
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from shared.models.gamification import (
    UserLevel,
    Achievement,
    UserAchievement,
    XPTransaction,
    DailyReward,
    Leaderboard,
    AchievementType,
    RewardType
)
from shared.models.user import User

import logging

logger = logging.getLogger(__name__)


# ============================================================================
# XP & LEVEL SYSTEM
# ============================================================================

class XPSystem:
    """Manages XP gains and level ups"""

    # XP rewards for actions
    XP_REWARDS = {
        "message_sent": 5,
        "photo_received": 20,
        "video_received": 50,
        "match_created": 30,
        "affection_milestone": 25,  # Every 10 affection points
        "daily_login": 20,
        "streak_bonus": 10,  # Per streak day
        "achievement_unlock": 50,
    }

    @staticmethod
    def calculate_xp_for_level(level: int) -> int:
        """
        Calculate XP required to reach next level
        Formula: 100 * level^1.5
        """
        return int(100 * (level ** 1.5))

    @classmethod
    def award_xp(
        cls,
        db: Session,
        user_id: int,
        xp_amount: int,
        reason: str,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, Optional[int]]:
        """
        Award XP to user and handle level up

        Returns:
            (leveled_up: bool, new_level: Optional[int])
        """
        # Get or create user level
        user_level = db.query(UserLevel).filter(UserLevel.user_id == user_id).first()
        if not user_level:
            user_level = UserLevel(user_id=user_id)
            db.add(user_level)
            db.flush()

        # Record current state
        level_before = user_level.level
        xp_before = user_level.xp

        # Add XP
        user_level.xp += xp_amount

        # Check for level up(s)
        leveled_up = False
        new_level = None

        while user_level.xp >= user_level.xp_to_next_level:
            # Level up!
            user_level.xp -= user_level.xp_to_next_level
            user_level.level += 1
            leveled_up = True
            new_level = user_level.level

            # Calculate new XP requirement
            user_level.xp_to_next_level = cls.calculate_xp_for_level(user_level.level)

            logger.info(f"User {user_id} leveled up to level {user_level.level}!")

        # Log transaction
        transaction = XPTransaction(
            user_id=user_id,
            xp_change=xp_amount,
            reason=reason,
            metadata=metadata,
            level_before=level_before,
            level_after=user_level.level,
            leveled_up=leveled_up
        )
        db.add(transaction)

        db.commit()

        return leveled_up, new_level

    @classmethod
    def get_user_level(cls, db: Session, user_id: int) -> Optional[UserLevel]:
        """Get user's level info"""
        return db.query(UserLevel).filter(UserLevel.user_id == user_id).first()


# ============================================================================
# ACHIEVEMENT SYSTEM
# ============================================================================

class AchievementSystem:
    """Manages achievements and badges"""

    @classmethod
    def check_and_update_achievements(
        cls,
        db: Session,
        user_id: int,
        action: str,
        value: int = 1
    ) -> List[Achievement]:
        """
        Check if action unlocks any achievements

        Args:
            user_id: User ID
            action: Action performed (e.g., "message_sent")
            value: Value/count for the action

        Returns:
            List of newly unlocked achievements
        """
        user_level = db.query(UserLevel).filter(UserLevel.user_id == user_id).first()
        if not user_level:
            return []

        # Update stats
        if action == "message_sent":
            user_level.total_messages_sent += value
        elif action == "match_created":
            user_level.total_matches += value
        elif action == "photo_received":
            user_level.total_photos_received += value
        elif action == "video_received":
            user_level.total_videos_received += value

        db.commit()

        # Check all achievements
        newly_unlocked = []

        achievements = db.query(Achievement).all()
        for achievement in achievements:
            # Get or create user achievement record
            user_achievement = db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id
                )
            ).first()

            if not user_achievement:
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement.id
                )
                db.add(user_achievement)

            # Skip if already unlocked
            if user_achievement.is_unlocked:
                continue

            # Check progress
            current_value = cls._get_stat_value(user_level, achievement.requirement_field)
            user_achievement.progress = current_value

            # Check if unlocked
            if current_value >= achievement.requirement_count:
                user_achievement.is_unlocked = True
                user_achievement.unlocked_at = datetime.utcnow()

                # Award XP
                if achievement.reward_xp > 0:
                    XPSystem.award_xp(
                        db,
                        user_id,
                        achievement.reward_xp,
                        f"Achievement unlocked: {achievement.name}"
                    )

                # Award tokens (if applicable)
                if achievement.reward_type == RewardType.TOKENS:
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        user.tokens = (user.tokens or 0) + achievement.reward_value

                newly_unlocked.append(achievement)
                logger.info(f"User {user_id} unlocked achievement: {achievement.name}")

        db.commit()

        return newly_unlocked

    @staticmethod
    def _get_stat_value(user_level: UserLevel, field: str) -> int:
        """Get stat value from UserLevel"""
        if not field:
            return 0
        return getattr(user_level, field, 0)

    @classmethod
    def get_user_achievements(
        cls,
        db: Session,
        user_id: int,
        include_locked: bool = True
    ) -> List[Dict]:
        """
        Get all achievements for user with progress

        Returns:
            List of achievement dicts with progress info
        """
        achievements = db.query(Achievement).order_by(Achievement.display_order).all()

        result = []
        for achievement in achievements:
            # Get user's progress
            user_achievement = db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id
                )
            ).first()

            # Skip secret achievements if locked
            if achievement.is_secret and (not user_achievement or not user_achievement.is_unlocked):
                if not include_locked:
                    continue

            result.append({
                "id": achievement.id,
                "name": achievement.name,
                "description": achievement.description,
                "icon": achievement.icon,
                "type": achievement.type.value,
                "rarity": achievement.rarity,
                "requirement": achievement.requirement_count,
                "progress": user_achievement.progress if user_achievement else 0,
                "is_unlocked": user_achievement.is_unlocked if user_achievement else False,
                "unlocked_at": user_achievement.unlocked_at.isoformat() if (user_achievement and user_achievement.unlocked_at) else None,
                "reward_type": achievement.reward_type.value,
                "reward_value": achievement.reward_value,
                "is_secret": achievement.is_secret
            })

        return result


# ============================================================================
# DAILY STREAK SYSTEM
# ============================================================================

class StreakSystem:
    """Manages daily login streaks"""

    @classmethod
    def check_daily_login(cls, db: Session, user_id: int) -> Dict:
        """
        Check daily login and update streak

        Returns:
            Dict with streak info and rewards
        """
        user_level = db.query(UserLevel).filter(UserLevel.user_id == user_id).first()
        if not user_level:
            user_level = UserLevel(user_id=user_id)
            db.add(user_level)
            db.flush()

        today = datetime.utcnow().date()
        today_datetime = datetime.combine(today, datetime.min.time())

        # Check if already claimed today
        existing_reward = db.query(DailyReward).filter(
            and_(
                DailyReward.user_id == user_id,
                DailyReward.date >= today_datetime,
                DailyReward.claimed == True
            )
        ).first()

        if existing_reward:
            return {
                "already_claimed": True,
                "streak": user_level.current_streak,
                "tokens_earned": 0,
                "xp_earned": 0
            }

        # Update streak
        if user_level.last_active_date:
            last_active = user_level.last_active_date.date()
            yesterday = today - timedelta(days=1)

            if last_active == yesterday:
                # Continuing streak
                user_level.current_streak += 1
            elif last_active == today:
                # Already active today (shouldn't happen)
                pass
            else:
                # Streak broken
                user_level.current_streak = 1
        else:
            # First login
            user_level.current_streak = 1

        # Update last active
        user_level.last_active_date = datetime.utcnow()
        user_level.total_days_active += 1

        # Update longest streak
        if user_level.current_streak > user_level.longest_streak:
            user_level.longest_streak = user_level.current_streak

        # Calculate rewards (bonus for streaks)
        base_tokens = 10
        base_xp = 20

        # Streak multiplier (every 7 days)
        multiplier = 1 + (user_level.current_streak // 7)

        tokens_earned = base_tokens * multiplier
        xp_earned = base_xp * multiplier

        # Create reward record
        reward = DailyReward(
            user_id=user_id,
            date=today_datetime,
            tokens_earned=tokens_earned,
            xp_earned=xp_earned,
            streak_day=user_level.current_streak,
            bonus_multiplier=multiplier,
            claimed=True,
            claimed_at=datetime.utcnow()
        )
        db.add(reward)

        # Award tokens
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.tokens = (user.tokens or 0) + tokens_earned

        # Award XP
        XPSystem.award_xp(
            db,
            user_id,
            xp_earned,
            f"Daily login (Day {user_level.current_streak})"
        )

        # Check streak achievements
        AchievementSystem.check_and_update_achievements(
            db,
            user_id,
            "streak_updated",
            user_level.current_streak
        )

        db.commit()

        return {
            "already_claimed": False,
            "streak": user_level.current_streak,
            "tokens_earned": tokens_earned,
            "xp_earned": xp_earned,
            "multiplier": multiplier,
            "longest_streak": user_level.longest_streak
        }


# ============================================================================
# LEADERBOARD SYSTEM
# ============================================================================

class LeaderboardSystem:
    """Manages leaderboards"""

    @classmethod
    def get_leaderboard(
        cls,
        db: Session,
        period: str = "weekly",
        limit: int = 100
    ) -> List[Dict]:
        """
        Get leaderboard for specified period

        Args:
            period: "weekly", "monthly", or "all-time"
            limit: Number of top users to return
        """
        # Calculate period dates
        now = datetime.utcnow()

        if period == "weekly":
            # Start of week (Monday)
            start_date = now - timedelta(days=now.weekday())
        elif period == "monthly":
            # Start of month
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:  # all-time
            start_date = datetime(2000, 1, 1)  # Very old date

        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        # Query XP gained in period
        from sqlalchemy import func

        leaderboard = (
            db.query(
                User.id,
                User.username,
                func.sum(XPTransaction.xp_change).label('total_xp')
            )
            .join(XPTransaction, User.id == XPTransaction.user_id)
            .filter(XPTransaction.created_at >= start_date)
            .filter(XPTransaction.xp_change > 0)  # Only positive XP
            .group_by(User.id, User.username)
            .order_by(desc('total_xp'))
            .limit(limit)
            .all()
        )

        # Format results
        results = []
        for rank, (user_id, username, total_xp) in enumerate(leaderboard, 1):
            # Get user level
            user_level = db.query(UserLevel).filter(UserLevel.user_id == user_id).first()

            results.append({
                "rank": rank,
                "user_id": user_id,
                "username": username,
                "xp": int(total_xp or 0),
                "level": user_level.level if user_level else 1,
                "streak": user_level.current_streak if user_level else 0
            })

        return results


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def track_action(db: Session, user_id: int, action: str, value: int = 1) -> Dict:
    """
    Track user action and award XP + check achievements

    Args:
        user_id: User ID
        action: Action type (e.g., "message_sent")
        value: Count/value of action

    Returns:
        Dict with XP awarded, level up info, and unlocked achievements
    """
    # Award XP
    xp_amount = XPSystem.XP_REWARDS.get(action, 0) * value

    leveled_up = False
    new_level = None

    if xp_amount > 0:
        leveled_up, new_level = XPSystem.award_xp(
            db,
            user_id,
            xp_amount,
            action.replace("_", " ").title()
        )

    # Check achievements
    newly_unlocked = AchievementSystem.check_and_update_achievements(
        db,
        user_id,
        action,
        value
    )

    return {
        "xp_awarded": xp_amount,
        "leveled_up": leveled_up,
        "new_level": new_level,
        "achievements_unlocked": [
            {
                "name": ach.name,
                "description": ach.description,
                "icon": ach.icon,
                "reward_value": ach.reward_value
            }
            for ach in newly_unlocked
        ]
    }
