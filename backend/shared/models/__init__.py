"""
Shared database models used across all microservices.
Uses SQLAlchemy 2.0 + Pydantic v2 for validation.
"""

from .user import User, UserCreate, UserUpdate, UserResponse
from .match import Match, MatchCreate, MatchResponse
from .chat import ChatMessage, ChatMessageCreate, ChatMessageResponse
from .memory import Memory, MemoryCreate, MemoryResponse
from .media import (
    ProfilePhoto, ProfilePhotoCreate,
    ProfileVideo, ProfileVideoCreate,
    ReceivedPhoto, ReceivedPhotoCreate,
    GeneratedVideo, GeneratedVideoCreate
)
from .custom_girl import CustomGirl, CustomGirlCreate, CustomGirlResponse
from .story import Story, StoryCreate, StoryResponse
from .watch_video import WatchVideo, WatchVideoCreate, ReactionClip, ReactionClipCreate
from .subscription import Subscription, SubscriptionTier, TokenTransaction
from .analytics import UserEvent, SessionLog

__all__ = [
    # User
    "User", "UserCreate", "UserUpdate", "UserResponse",
    # Match
    "Match", "MatchCreate", "MatchResponse",
    # Chat
    "ChatMessage", "ChatMessageCreate", "ChatMessageResponse",
    # Memory
    "Memory", "MemoryCreate", "MemoryResponse",
    # Media
    "ProfilePhoto", "ProfilePhotoCreate",
    "ProfileVideo", "ProfileVideoCreate",
    "ReceivedPhoto", "ReceivedPhotoCreate",
    "GeneratedVideo", "GeneratedVideoCreate",
    # Custom Girl
    "CustomGirl", "CustomGirlCreate", "CustomGirlResponse",
    # Story
    "Story", "StoryCreate", "StoryResponse",
    # Watch Together
    "WatchVideo", "WatchVideoCreate",
    "ReactionClip", "ReactionClipCreate",
    # Subscription & Payment
    "Subscription", "SubscriptionTier", "TokenTransaction",
    # Analytics
    "UserEvent", "SessionLog",
]
