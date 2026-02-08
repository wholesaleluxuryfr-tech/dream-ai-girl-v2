"""
Gamification Models - XP, Levels, Achievements, Streaks

Database models for the gamification system
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base


# ============================================================================
# ENUMS
# ============================================================================

class AchievementType(str, enum.Enum):
    """Achievement categories"""
    MESSAGING = "messaging"
    MATCHING = "matching"
    PHOTOS = "photos"
    AFFECTION = "affection"
    STREAK = "streak"
    EXPLORATION = "exploration"
    SPECIAL = "special"


class RewardType(str, enum.Enum):
    """Types of rewards"""
    TOKENS = "tokens"
    XP = "xp"
    BADGE = "badge"
    UNLOCK = "unlock"


# ============================================================================
# USER PROGRESSION
# ============================================================================

class UserLevel(Base):
    """User level and XP tracking"""
    __tablename__ = "user_levels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # XP and level
    xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    xp_to_next_level = Column(Integer, default=100, nullable=False)

    # Total stats
    total_messages_sent = Column(Integer, default=0)
    total_matches = Column(Integer, default=0)
    total_photos_received = Column(Integer, default=0)
    total_videos_received = Column(Integer, default=0)
    total_days_active = Column(Integer, default=0)

    # Streaks
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="level")
    achievements = relationship("UserAchievement", back_populates="user_level")


# ============================================================================
# ACHIEVEMENTS
# ============================================================================

class Achievement(Base):
    """Master list of all available achievements"""
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)

    # Achievement details
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), nullable=False)
    icon = Column(String(50), nullable=False)  # Emoji or icon name
    type = Column(SQLEnum(AchievementType), nullable=False)

    # Requirements
    requirement_count = Column(Integer, default=1)  # e.g., send 50 messages
    requirement_field = Column(String(100), nullable=True)  # e.g., "total_messages_sent"

    # Rewards
    reward_type = Column(SQLEnum(RewardType), nullable=False)
    reward_value = Column(Integer, nullable=False)  # e.g., 50 tokens
    reward_xp = Column(Integer, default=0)  # Bonus XP for achievement

    # Display
    is_secret = Column(Boolean, default=False)  # Hidden until unlocked
    rarity = Column(String(20), default="common")  # common, rare, epic, legendary
    display_order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    """User's unlocked achievements"""
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_levels.user_id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)

    # Progress
    progress = Column(Integer, default=0)  # Current progress towards requirement
    is_unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)

    # Reward claimed
    reward_claimed = Column(Boolean, default=False)
    reward_claimed_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_level = relationship("UserLevel", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


# ============================================================================
# XP TRANSACTIONS
# ============================================================================

class XPTransaction(Base):
    """Log of all XP gains/losses"""
    __tablename__ = "xp_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Transaction details
    xp_change = Column(Integer, nullable=False)  # Can be negative
    reason = Column(String(200), nullable=False)  # e.g., "Sent message", "Received photo"
    metadata = Column(JSON, nullable=True)  # Additional context

    # Level change (if any)
    level_before = Column(Integer, nullable=False)
    level_after = Column(Integer, nullable=False)
    leveled_up = Column(Boolean, default=False)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


# ============================================================================
# DAILY REWARDS
# ============================================================================

class DailyReward(Base):
    """Daily login rewards and streaks"""
    __tablename__ = "daily_rewards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Date
    date = Column(DateTime, nullable=False)  # Date of login (day precision)

    # Rewards
    tokens_earned = Column(Integer, default=10)
    xp_earned = Column(Integer, default=20)

    # Streak bonus
    streak_day = Column(Integer, default=1)  # Day X of streak
    bonus_multiplier = Column(Integer, default=1)  # 1x, 2x, 3x etc.

    # Claimed
    claimed = Column(Boolean, default=False)
    claimed_at = Column(DateTime, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


# ============================================================================
# LEADERBOARD
# ============================================================================

class Leaderboard(Base):
    """Weekly/monthly leaderboard entries"""
    __tablename__ = "leaderboards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Period
    period = Column(String(20), nullable=False)  # weekly, monthly, all-time
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Score
    score = Column(Integer, default=0)  # XP earned during period
    rank = Column(Integer, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
