"""User model with SQLAlchemy and Pydantic schemas"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase, relationship
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class Base(DeclarativeBase):
    pass


class User(Base):
    """SQLAlchemy User model"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    photo_url = Column(String(500), nullable=True)

    # Gamification
    tokens = Column(Integer, default=100)
    token_balance = Column(Integer, default=100)  # Alias for tokens (payment service compatibility)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)

    # Subscription
    subscription_tier = Column(String(20), default="free")  # free, premium, elite
    subscription_expires_at = Column(DateTime, nullable=True)

    # Payment (Stripe)
    stripe_customer_id = Column(String(100), unique=True, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Preferences
    preferred_language = Column(String(5), default="fr")
    notifications_enabled = Column(Boolean, default=True)

    # Relationships (gamification)
    level_info = relationship("UserLevel", back_populates="user", uselist=False)


# Pydantic schemas for validation
class UserBase(BaseModel):
    """Base user schema with common fields"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    age: int = Field(..., ge=18, le=99)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Username must be alphanumeric with underscores"""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v.lower()


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Password must be strong"""
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    age: Optional[int] = Field(None, ge=18, le=99)
    photo_url: Optional[str] = Field(None, max_length=500)
    preferred_language: Optional[str] = Field(None, pattern='^(fr|en|es|de)$')
    notifications_enabled: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user response (excludes sensitive data)"""
    id: int
    username: str
    email: str
    age: int
    photo_url: Optional[str] = None

    # Gamification
    tokens: int
    xp: int
    level: int

    # Subscription
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None

    # Metadata
    created_at: datetime
    last_login_at: Optional[datetime] = None
    is_active: bool
    is_verified: bool

    # Preferences
    preferred_language: str
    notifications_enabled: bool

    class Config:
        from_attributes = True  # Pydantic v2 (was orm_mode in v1)


class UserLogin(BaseModel):
    """Schema for user login"""
    username_or_email: str
    password: str


class UserStats(BaseModel):
    """User statistics for profile page"""
    total_matches: int
    total_messages: int
    total_photos_received: int
    total_videos_generated: int
    current_streak_days: int
    achievements_unlocked: int
