"""Chat message model"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Enum
from pydantic import BaseModel, Field
import enum
from .user import Base


class MessageSender(str, enum.Enum):
    """Message sender types"""
    USER = "user"
    GIRL = "girl"
    SYSTEM = "system"


class MessageStatus(str, enum.Enum):
    """Message delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class ChatMessage(Base):
    """SQLAlchemy ChatMessage model"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    girl_id = Column(String(50), nullable=False, index=True)
    sender = Column(Enum(MessageSender), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Optional fields
    time_str = Column(String(10), nullable=True)  # Legacy: "HH:MM"
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT)

    # Media attachments
    media_type = Column(String(20), nullable=True)  # photo, video, voice, gif
    media_url = Column(String(500), nullable=True)

    # Reply/thread support
    reply_to_message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)

    # Composite indexes for performance
    __table_args__ = (
        Index('idx_user_girl_timestamp', 'user_id', 'girl_id', 'timestamp'),
        Index('idx_chat_room', 'user_id', 'girl_id'),
    )


# Pydantic schemas
class ChatMessageBase(BaseModel):
    """Base chat message schema"""
    content: str = Field(..., min_length=1, max_length=5000)
    media_type: Optional[str] = Field(None, pattern='^(photo|video|voice|gif)$')
    media_url: Optional[str] = Field(None, max_length=500)
    reply_to_message_id: Optional[int] = None


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating a new chat message"""
    user_id: int
    girl_id: str
    sender: MessageSender


class ChatMessageUpdate(BaseModel):
    """Schema for updating message status"""
    status: MessageStatus


class ChatMessageResponse(BaseModel):
    """Schema for chat message response"""
    id: int
    user_id: int
    girl_id: str
    sender: str
    content: str
    timestamp: datetime
    status: str
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    reply_to_message_id: Optional[int] = None

    class Config:
        from_attributes = True


class ChatRoom(BaseModel):
    """Chat room with recent messages"""
    user_id: int
    girl_id: str
    girl_name: str
    girl_photo_url: Optional[str] = None
    affection: int
    last_message: Optional[ChatMessageResponse] = None
    unread_count: int = 0
    is_online: bool = False
    is_typing: bool = False


class TypingIndicator(BaseModel):
    """WebSocket typing indicator"""
    user_id: int
    girl_id: str
    is_typing: bool
