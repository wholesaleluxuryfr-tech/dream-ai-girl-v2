"""Watch Together feature models"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, Index, Boolean
from pydantic import BaseModel, Field
from .user import Base


class WatchVideo(Base):
    """NSFW videos for Watch Together feature"""
    __tablename__ = "watch_videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    video_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(Integer, default=0)  # seconds
    category = Column(String(50), default="general")  # oral, sensuel, hardcore, lesbian, etc
    tags = Column(Text, nullable=True)  # JSON array of tags

    # Reaction timestamps for girlfriend reactions
    # JSON: [{"time": 30, "intensity": "excited"}, {"time": 120, "intensity": "touch_light"}, ...]
    reaction_timestamps = Column(Text, nullable=True)

    # Metadata
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_premium = Column(Boolean, default=False)  # Premium content for subscribers

    __table_args__ = (
        Index('idx_category_views', 'category', 'views_count'),
    )


class ReactionClip(Base):
    """Girlfriend reaction clips for Watch Together"""
    __tablename__ = "reaction_clips"

    id = Column(Integer, primary_key=True, index=True)
    girl_id = Column(String(50), nullable=False, index=True)

    # Reaction types: idle, smile, excited, touch_light, touch_intense, climax
    reaction_type = Column(String(50), nullable=False, index=True)

    clip_url = Column(String(500), nullable=False)
    is_video = Column(Boolean, default=False)  # True=video, False=animated image/GIF
    duration = Column(Integer, default=0)  # seconds (for videos)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_girl_reaction', 'girl_id', 'reaction_type'),
    )


# Pydantic schemas
class WatchVideoBase(BaseModel):
    """Base watch video schema"""
    title: str = Field(..., max_length=200)
    video_url: str = Field(..., max_length=500)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    duration: int = Field(default=0, ge=0)
    category: str = Field(default="general", max_length=50)
    tags: Optional[List[str]] = None
    is_premium: bool = False


class WatchVideoCreate(WatchVideoBase):
    """Schema for creating watch video"""
    pass


class ReactionTimestamp(BaseModel):
    """Reaction timestamp in video"""
    time: int = Field(..., ge=0)  # seconds
    intensity: str = Field(..., pattern='^(idle|smile|excited|touch_light|touch_intense|climax)$')


class WatchVideoResponse(BaseModel):
    """Schema for watch video response"""
    id: int
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: int
    category: str
    tags: Optional[List[str]] = None
    reaction_timestamps: Optional[List[ReactionTimestamp]] = None
    views_count: int
    is_premium: bool

    class Config:
        from_attributes = True


class ReactionClipCreate(BaseModel):
    """Schema for creating reaction clip"""
    girl_id: str
    reaction_type: str = Field(..., pattern='^(idle|smile|excited|touch_light|touch_intense|climax)$')
    clip_url: str = Field(..., max_length=500)
    is_video: bool = False
    duration: int = Field(default=0, ge=0)


class WatchSession(BaseModel):
    """Active watch together session"""
    session_id: str
    user_id: int
    girl_id: str
    video_id: int
    started_at: datetime
    current_time: int = 0  # seconds
    is_paused: bool = False


class WatchEvent(BaseModel):
    """Watch together event (play, pause, seek)"""
    session_id: str
    event_type: str = Field(..., pattern='^(play|pause|seek|reaction)$')
    timestamp: int = Field(..., ge=0)  # video timestamp in seconds
    reaction_type: Optional[str] = None
