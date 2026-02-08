"""Match model for user-girlfriend relationships"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from pydantic import BaseModel, Field
from .user import Base


class Match(Base):
    """SQLAlchemy Match model"""
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    girl_id = Column(String(50), nullable=False, index=True)
    affection = Column(Integer, default=20)  # 0-100 scale
    matched_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Gamification
    messages_count = Column(Integer, default=0)
    photos_received = Column(Integer, default=0)
    videos_received = Column(Integer, default=0)
    last_interaction_at = Column(DateTime, default=datetime.utcnow)

    # Composite index for fast queries
    __table_args__ = (
        Index('idx_user_girl', 'user_id', 'girl_id', unique=True),
        Index('idx_user_affection', 'user_id', 'affection'),
    )


# Pydantic schemas
class MatchBase(BaseModel):
    """Base match schema"""
    girl_id: str = Field(..., min_length=1, max_length=50)


class MatchCreate(MatchBase):
    """Schema for creating a new match"""
    user_id: int


class MatchUpdate(BaseModel):
    """Schema for updating match affection"""
    affection: Optional[int] = Field(None, ge=0, le=100)


class MatchResponse(BaseModel):
    """Schema for match response"""
    id: int
    user_id: int
    girl_id: str
    affection: int
    matched_at: datetime
    messages_count: int
    photos_received: int
    videos_received: int
    last_interaction_at: datetime

    class Config:
        from_attributes = True


class MatchWithGirlInfo(MatchResponse):
    """Match response with girlfriend profile info"""
    girl_name: str
    girl_age: int
    girl_photo_url: Optional[str] = None
    girl_tagline: Optional[str] = None
