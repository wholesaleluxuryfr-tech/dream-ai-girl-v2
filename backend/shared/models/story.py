"""Story model for Instagram-like stories feature"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from pydantic import BaseModel, Field
from .user import Base


class Story(Base):
    """SQLAlchemy Story model"""
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    girl_id = Column(String(100), nullable=False, index=True)
    photo_url = Column(String(500), nullable=False)
    context = Column(String(100), nullable=True)  # gym, beach, home, party, etc
    caption = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # Stories expire after 24h

    # View tracking
    views_count = Column(Integer, default=0)

    __table_args__ = (
        Index('idx_girl_expires', 'girl_id', 'expires_at'),
    )


# Pydantic schemas
class StoryBase(BaseModel):
    """Base story schema"""
    photo_url: str = Field(..., max_length=500)
    context: Optional[str] = Field(None, max_length=100)
    caption: Optional[str] = Field(None, max_length=500)


class StoryCreate(StoryBase):
    """Schema for creating a story"""
    girl_id: str
    expires_in_hours: int = Field(default=24, ge=1, le=72)


class StoryResponse(BaseModel):
    """Schema for story response"""
    id: int
    girl_id: str
    photo_url: str
    context: Optional[str] = None
    caption: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    views_count: int
    time_remaining: int  # minutes until expiration

    class Config:
        from_attributes = True


class StoryView(BaseModel):
    """Story view event"""
    story_id: int
    user_id: int
    viewed_at: datetime = Field(default_factory=datetime.utcnow)
