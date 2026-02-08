"""Custom girlfriend model for user-created profiles"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from pydantic import BaseModel, Field
from .user import Base


class CustomGirl(Base):
    """SQLAlchemy CustomGirl model"""
    __tablename__ = "custom_girls"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    girl_id = Column(String(100), nullable=False, unique=True, index=True)

    # Basic info
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)

    # Physical appearance
    ethnicity = Column(String(50), nullable=False)
    body_type = Column(String(50), nullable=False)  # slim, athletic, curvy, plus
    breast_size = Column(String(10), nullable=False)  # A, B, C, D, DD+
    hair_color = Column(String(30), nullable=False)
    hair_length = Column(String(30), nullable=False)  # short, medium, long
    eye_color = Column(String(30), nullable=False)

    # Personality
    archetype = Column(String(30), nullable=True)  # romantique, perverse, soumise, etc
    personality = Column(Text, nullable=True)  # Free-form personality description

    # AI generation
    appearance_prompt = Column(Text, nullable=False)  # Full prompt for image generation

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    is_public = Column(Integer, default=0)  # 0=private, 1=public (shareable)
    times_matched = Column(Integer, default=0)  # How many times matched by others

    __table_args__ = (
        Index('idx_user_custom', 'user_id', 'created_at'),
    )


# Pydantic schemas
class CustomGirlBase(BaseModel):
    """Base custom girlfriend schema"""
    name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=18, le=50)
    ethnicity: str = Field(..., pattern='^(european|french|russian|asian|japanese|korean|chinese|african|latina|brazilian|arab|indian|mixed)$')
    body_type: str = Field(..., pattern='^(slim|athletic|curvy|plus)$')
    breast_size: str = Field(..., pattern='^(A|B|C|D|DD\\+)$')
    hair_color: str = Field(..., max_length=30)
    hair_length: str = Field(..., pattern='^(short|medium|long)$')
    eye_color: str = Field(..., max_length=30)
    archetype: Optional[str] = Field(None, pattern='^(romantique|perverse|exhib|cougar|soumise|dominante|nympho|timide|fetichiste|salope)$')
    personality: Optional[str] = Field(None, max_length=1000)


class CustomGirlCreate(CustomGirlBase):
    """Schema for creating custom girlfriend"""
    user_id: int


class CustomGirlUpdate(BaseModel):
    """Schema for updating custom girlfriend"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    personality: Optional[str] = Field(None, max_length=1000)
    is_public: Optional[bool] = None


class CustomGirlResponse(BaseModel):
    """Schema for custom girlfriend response"""
    id: int
    user_id: int
    girl_id: str
    name: str
    age: int
    ethnicity: str
    body_type: str
    breast_size: str
    hair_color: str
    hair_length: str
    eye_color: str
    archetype: Optional[str] = None
    personality: Optional[str] = None
    created_at: datetime
    is_public: bool
    times_matched: int

    class Config:
        from_attributes = True
