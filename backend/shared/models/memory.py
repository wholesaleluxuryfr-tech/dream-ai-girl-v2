"""Memory model for AI contextual memory"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Float
from pydantic import BaseModel, Field
from .user import Base


class Memory(Base):
    """SQLAlchemy Memory model for AI long-term memory"""
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    girl_id = Column(String(50), nullable=False, index=True)
    content = Column(Text, nullable=False)
    memory_type = Column(String(50), default="conversation")  # conversation, preference, fact, event
    importance = Column(Float, default=0.5)  # 0.0 to 1.0 (for retrieval prioritization)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Vector embedding for semantic search (stored as JSON string)
    embedding = Column(Text, nullable=True)  # JSON array of floats

    # Metadata for context
    related_message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)
    tags = Column(Text, nullable=True)  # JSON array of tags

    __table_args__ = (
        Index('idx_user_girl_memory', 'user_id', 'girl_id', 'created_at'),
        Index('idx_memory_type', 'memory_type', 'importance'),
    )


# Pydantic schemas
class MemoryBase(BaseModel):
    """Base memory schema"""
    content: str = Field(..., min_length=1, max_length=2000)
    memory_type: str = Field(default="conversation", pattern='^(conversation|preference|fact|event)$')
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    tags: Optional[List[str]] = None


class MemoryCreate(MemoryBase):
    """Schema for creating a new memory"""
    user_id: int
    girl_id: str
    related_message_id: Optional[int] = None


class MemoryResponse(BaseModel):
    """Schema for memory response"""
    id: int
    user_id: int
    girl_id: str
    content: str
    memory_type: str
    importance: float
    created_at: datetime
    tags: Optional[List[str]] = None

    class Config:
        from_attributes = True


class MemorySearch(BaseModel):
    """Schema for semantic memory search"""
    query: str
    user_id: int
    girl_id: str
    top_k: int = Field(default=5, ge=1, le=20)
    memory_types: Optional[List[str]] = None


class MemorySearchResult(MemoryResponse):
    """Memory search result with similarity score"""
    similarity_score: float = Field(..., ge=0.0, le=1.0)
