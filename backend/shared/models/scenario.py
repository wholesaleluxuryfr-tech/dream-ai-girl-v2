"""
Scenario Models - Roleplay scenarios for enhanced interactions

Database models for the scenario/roleplay system
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base


# ============================================================================
# ENUMS
# ============================================================================

class ScenarioCategory(str, enum.Enum):
    """Scenario categories"""
    ROMANTIC = "romantic"
    SPICY = "spicy"
    HARDCORE = "hardcore"
    FANTASY = "fantasy"
    DAILY_LIFE = "daily_life"
    ADVENTURE = "adventure"
    ROLEPLAY = "roleplay"
    SPECIAL = "special"


class ScenarioIntensity(str, enum.Enum):
    """Content intensity levels"""
    SOFT = "soft"  # Romantic, safe
    MEDIUM = "medium"  # Flirty, suggestive
    HOT = "hot"  # Explicit, NSFW
    EXTREME = "extreme"  # Hardcore, fetish


class ScenarioStatus(str, enum.Enum):
    """Scenario status"""
    ACTIVE = "active"
    DRAFT = "draft"
    ARCHIVED = "archived"


# ============================================================================
# SCENARIOS
# ============================================================================

class Scenario(Base):
    """Master scenario definitions"""
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)

    # Basic info
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(50), nullable=False)  # Emoji

    # Categorization
    category = Column(SQLEnum(ScenarioCategory), nullable=False)
    intensity = Column(SQLEnum(ScenarioIntensity), default=ScenarioIntensity.MEDIUM)
    tags = Column(JSON, default=list)  # ["plage", "nuit", "extérieur"]

    # Requirements
    min_affection = Column(Integer, default=0)  # Minimum affection level required
    is_premium = Column(Boolean, default=False)  # Requires premium subscription
    cost_tokens = Column(Integer, default=0)  # Token cost to unlock

    # Scenario content
    initial_message = Column(Text, nullable=False)  # Girl's opening message
    context_prompt = Column(Text, nullable=False)  # AI system prompt additions
    suggested_responses = Column(JSON, default=list)  # Optional user response suggestions

    # Multi-part scenarios
    is_multi_part = Column(Boolean, default=False)
    total_parts = Column(Integer, default=1)

    # Media
    thumbnail_url = Column(String(500), nullable=True)
    background_music_url = Column(String(500), nullable=True)

    # Stats
    play_count = Column(Integer, default=0)
    average_rating = Column(Integer, default=0)  # 0-5 stars

    # Status
    status = Column(SQLEnum(ScenarioStatus), default=ScenarioStatus.ACTIVE)
    is_featured = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_scenarios = relationship("UserScenario", back_populates="scenario")


class UserScenario(Base):
    """User's scenario progress and history"""
    __tablename__ = "user_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    girl_id = Column(String(50), nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)

    # Progress
    is_unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)

    # Multi-part progress
    current_part = Column(Integer, default=1)
    completed_parts = Column(JSON, default=list)  # [1, 2, 3]
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    # Stats
    play_count = Column(Integer, default=0)
    last_played_at = Column(DateTime, nullable=True)
    total_messages = Column(Integer, default=0)

    # Rating
    user_rating = Column(Integer, nullable=True)  # 1-5 stars

    # Session data
    session_data = Column(JSON, default=dict)  # Temporary state for active scenario

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scenario = relationship("Scenario", back_populates="user_scenarios")


class ScenarioPart(Base):
    """Multi-part scenario segments"""
    __tablename__ = "scenario_parts"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)

    # Part info
    part_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)

    # Content
    trigger_condition = Column(Text, nullable=True)  # When to unlock this part
    initial_message = Column(Text, nullable=False)
    context_prompt = Column(Text, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class ScenarioChoice(Base):
    """Interactive choices within scenarios"""
    __tablename__ = "scenario_choices"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)

    # Choice info
    choice_point = Column(Integer, nullable=False)  # Message count when choice appears
    question = Column(String(500), nullable=False)

    # Options
    options = Column(JSON, nullable=False)  # [{"text": "...", "outcome": "..."}]

    # Consequences
    affects_outcome = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
