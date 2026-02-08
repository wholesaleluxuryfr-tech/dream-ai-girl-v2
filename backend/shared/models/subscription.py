"""Subscription and payment models"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Float, Enum
from pydantic import BaseModel, Field
import enum
from .user import Base


class SubscriptionTier(str, enum.Enum):
    """Subscription tier levels"""
    FREE = "free"
    PREMIUM = "premium"
    ELITE = "elite"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAUSED = "paused"


class Subscription(Base):
    """User subscription model"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, unique=True)

    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)

    # Dates
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    last_payment_at = Column(DateTime, nullable=True)

    # Payment
    stripe_customer_id = Column(String(100), nullable=True, unique=True)
    stripe_subscription_id = Column(String(100), nullable=True, unique=True)
    price_per_month = Column(Float, nullable=True)  # EUR

    # Renewal
    auto_renew = Column(Integer, default=1)  # 1=yes, 0=no

    __table_args__ = (
        Index('idx_user_subscription', 'user_id', 'status'),
    )


class TokenTransaction(Base):
    """Token purchase and usage transactions"""
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    transaction_type = Column(String(20), nullable=False)  # purchase, earned, spent
    amount = Column(Integer, nullable=False)  # positive for purchase/earned, negative for spent
    balance_after = Column(Integer, nullable=False)

    # Details
    reason = Column(String(100), nullable=True)  # photo_generation, video_generation, daily_bonus, etc
    price_paid = Column(Float, nullable=True)  # EUR (for purchases)

    # Payment
    stripe_payment_intent_id = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_user_tokens_date', 'user_id', 'created_at'),
    )


# Pydantic schemas
class SubscriptionResponse(BaseModel):
    """Subscription response schema"""
    id: int
    user_id: int
    tier: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    price_per_month: Optional[float] = None
    auto_renew: bool

    class Config:
        from_attributes = True


class SubscriptionPlan(BaseModel):
    """Available subscription plans"""
    tier: SubscriptionTier
    name: str
    price_per_month: float
    features: list[str]
    active_girlfriends: int  # -1 for unlimited
    messages_per_day: int  # -1 for unlimited
    tokens_per_week: int
    photo_quality: str
    has_video_generation: bool
    has_custom_girlfriend: bool
    has_voice_messages: bool
    has_priority_support: bool


class TokenPurchaseRequest(BaseModel):
    """Request to purchase tokens"""
    package_id: str  # small, medium, large, mega
    payment_method: str = "stripe"


class TokenPackage(BaseModel):
    """Token purchase package"""
    id: str
    tokens: int
    price: float  # EUR
    bonus_tokens: int = 0
    popular: bool = False
