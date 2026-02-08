"""Media models for photos and videos"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Boolean, Text
from pydantic import BaseModel, Field, HttpUrl
from .user import Base


class ProfilePhoto(Base):
    """Pre-generated profile photos for girlfriends"""
    __tablename__ = "profile_photos"

    id = Column(Integer, primary_key=True, index=True)
    girl_id = Column(String(50), nullable=False, index=True)
    photo_type = Column(String(50), nullable=False)  # profile, casual, lingerie, nude, explicit
    photo_url = Column(String(500), nullable=False)
    is_nsfw = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_girl_photo_type', 'girl_id', 'photo_type'),
    )


class ProfileVideo(Base):
    """Pre-generated videos for girlfriends"""
    __tablename__ = "profile_videos"

    id = Column(Integer, primary_key=True, index=True)
    girl_id = Column(String(50), nullable=False, index=True)
    video_type = Column(String(50), nullable=False)  # intro, dance, tease, explicit
    video_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(Integer, default=0)  # seconds
    is_intro = Column(Boolean, default=False)
    is_nsfw = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_girl_video_type', 'girl_id', 'video_type'),
    )


class ReceivedPhoto(Base):
    """Photos received by users from girlfriends"""
    __tablename__ = "received_photos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    girl_id = Column(String(50), nullable=False, index=True)
    photo_url = Column(String(500), nullable=False)
    context = Column(String(200), nullable=True)  # selfie, bathroom, bedroom, outdoors, etc
    generation_prompt = Column(Text, nullable=True)
    is_nsfw = Column(Boolean, default=False)
    received_at = Column(DateTime, default=datetime.utcnow)

    # Generation metadata
    generation_time = Column(Integer, nullable=True)  # milliseconds
    generation_model = Column(String(50), nullable=True)  # sdxl, promptchan, etc

    __table_args__ = (
        Index('idx_user_girl_photos', 'user_id', 'girl_id', 'received_at'),
    )


class GeneratedVideo(Base):
    """AI-generated videos"""
    __tablename__ = "generated_videos"

    id = Column(Integer, primary_key=True, index=True)
    girl_id = Column(String(100), nullable=False, index=True)
    video_url = Column(Text, nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    source_image_url = Column(Text, nullable=True)
    prompt = Column(Text, nullable=True)
    task_id = Column(String(100), nullable=True)
    video_type = Column(String(50), default="a2e")  # a2e, animatediff, wav2lip
    duration = Column(Integer, default=0)  # seconds
    is_nsfw = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Generation metadata
    generation_time = Column(Integer, nullable=True)  # milliseconds
    generation_model = Column(String(50), nullable=True)

    __table_args__ = (
        Index('idx_girl_video_created', 'girl_id', 'created_at'),
    )


# Pydantic schemas
class ProfilePhotoCreate(BaseModel):
    """Schema for creating profile photo"""
    girl_id: str
    photo_type: str
    photo_url: str
    is_nsfw: bool = False


class ProfileVideoCreate(BaseModel):
    """Schema for creating profile video"""
    girl_id: str
    video_type: str
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: int = 0
    is_intro: bool = False
    is_nsfw: bool = False


class ReceivedPhotoCreate(BaseModel):
    """Schema for creating received photo"""
    user_id: int
    girl_id: str
    photo_url: str
    context: Optional[str] = None
    generation_prompt: Optional[str] = None
    is_nsfw: bool = False


class GeneratedVideoCreate(BaseModel):
    """Schema for creating generated video"""
    girl_id: str
    video_url: str
    thumbnail_url: Optional[str] = None
    source_image_url: Optional[str] = None
    prompt: Optional[str] = None
    task_id: Optional[str] = None
    video_type: str = "a2e"
    duration: int = 0
    is_nsfw: bool = False


class MediaGenerationRequest(BaseModel):
    """Request for generating media"""
    girl_id: str
    media_type: str = Field(..., pattern='^(photo|video)$')
    context: Optional[str] = None
    nsfw_level: int = Field(default=50, ge=0, le=100)
    custom_prompt: Optional[str] = None


class MediaGenerationResponse(BaseModel):
    """Response for media generation"""
    task_id: str
    status: str  # pending, processing, completed, failed
    media_url: Optional[str] = None
    estimated_time: int  # seconds
