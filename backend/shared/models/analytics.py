"""Analytics and tracking models"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from pydantic import BaseModel, Field
from .user import Base


class UserEvent(Base):
    """User behavior tracking events"""
    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Event details
    event_type = Column(String(50), nullable=False, index=True)
    event_name = Column(String(100), nullable=False)
    event_data = Column(Text, nullable=True)  # JSON data

    # Context
    session_id = Column(String(100), nullable=True, index=True)
    page_url = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)

    # Device info
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    device_type = Column(String(20), nullable=True)  # mobile, tablet, desktop

    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index('idx_event_type_date', 'event_type', 'timestamp'),
        Index('idx_user_session', 'user_id', 'session_id'),
    )


class SessionLog(Base):
    """User session tracking"""
    __tablename__ = "session_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Session details
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds

    # Activity tracking
    pages_viewed = Column(Integer, default=0)
    messages_sent = Column(Integer, default=0)
    photos_viewed = Column(Integer, default=0)
    videos_watched = Column(Integer, default=0)

    # Device info
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    device_type = Column(String(20), nullable=True)

    # Acquisition
    utm_source = Column(String(100), nullable=True)
    utm_medium = Column(String(100), nullable=True)
    utm_campaign = Column(String(100), nullable=True)

    __table_args__ = (
        Index('idx_user_started', 'user_id', 'started_at'),
    )


# Pydantic schemas
class EventCreate(BaseModel):
    """Schema for creating analytics event"""
    user_id: Optional[int] = None
    event_type: str = Field(..., max_length=50)
    event_name: str = Field(..., max_length=100)
    event_data: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    page_url: Optional[str] = None
    referrer: Optional[str] = None


class SessionStart(BaseModel):
    """Schema for starting a session"""
    session_id: str
    user_id: Optional[int] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None


class SessionUpdate(BaseModel):
    """Schema for updating session activity"""
    session_id: str
    pages_viewed: Optional[int] = None
    messages_sent: Optional[int] = None
    photos_viewed: Optional[int] = None
    videos_watched: Optional[int] = None


class UserAnalytics(BaseModel):
    """User analytics summary"""
    user_id: int
    total_sessions: int
    total_duration: int  # seconds
    avg_session_duration: int
    total_messages: int
    total_photos_viewed: int
    total_videos_watched: int
    last_active: datetime
    favorite_girl_id: Optional[str] = None
    churn_risk_score: float = Field(..., ge=0.0, le=1.0)
