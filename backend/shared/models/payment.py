"""
Payment models for Stripe integration

Handles subscriptions, transactions, and payment history
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Text, Index
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import Optional, List
from .user import Base


# ============================================================================
# SUBSCRIPTION MODEL
# ============================================================================

class Subscription(Base):
    """
    User subscription model with Stripe integration

    Tracks Premium and Elite tier subscriptions
    """
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Subscription details
    tier = Column(String(20), nullable=False)  # "premium" or "elite"
    status = Column(String(20), nullable=False)  # active, canceled, past_due, etc.

    # Stripe references
    stripe_subscription_id = Column(String(100), unique=True, nullable=False)
    stripe_customer_id = Column(String(100), nullable=False)

    # Billing period
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)

    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    canceled_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_user_subscription_status', 'user_id', 'status'),
        Index('idx_stripe_subscription', 'stripe_subscription_id'),
    )


# ============================================================================
# TRANSACTION MODEL
# ============================================================================

class Transaction(Base):
    """
    Payment and token transaction history

    Tracks all financial operations: purchases, grants, spending
    """
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Transaction details
    type = Column(String(50), nullable=False)  # token_purchase, token_grant, token_spent, subscription_payment
    amount = Column(Integer, nullable=False)  # Tokens or amount in cents
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False)  # pending, completed, failed, refunded

    # Payment details
    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_charge_id = Column(String(100), nullable=True)
    amount_paid = Column(Float, nullable=True)  # EUR
    currency = Column(String(3), default="eur")

    # Metadata
    metadata = Column(Text, nullable=True)  # JSON string for additional data

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_user_transaction_type', 'user_id', 'type'),
        Index('idx_transaction_status', 'status'),
        Index('idx_transaction_date', 'created_at'),
    )


# ============================================================================
# INVOICE MODEL
# ============================================================================

class Invoice(Base):
    """
    Invoice records from Stripe

    Tracks billing history for subscriptions
    """
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)

    # Stripe details
    stripe_invoice_id = Column(String(100), unique=True, nullable=False)
    stripe_customer_id = Column(String(100), nullable=False)

    # Invoice details
    amount_due = Column(Float, nullable=False)  # EUR
    amount_paid = Column(Float, nullable=False)  # EUR
    currency = Column(String(3), default="eur")
    status = Column(String(20), nullable=False)  # draft, open, paid, void, uncollectible

    # PDF
    invoice_pdf = Column(Text, nullable=True)  # URL to Stripe-hosted PDF

    # Dates
    billing_period_start = Column(DateTime, nullable=True)
    billing_period_end = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_user_invoice', 'user_id', 'status'),
        Index('idx_stripe_invoice', 'stripe_invoice_id'),
    )


# ============================================================================
# PAYMENT METHOD MODEL
# ============================================================================

class PaymentMethod(Base):
    """
    Saved payment methods (cards)

    References Stripe PaymentMethod objects
    """
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Stripe details
    stripe_payment_method_id = Column(String(100), unique=True, nullable=False)
    stripe_customer_id = Column(String(100), nullable=False)

    # Card details (last 4, brand, exp)
    type = Column(String(20), nullable=False)  # card, sepa_debit, etc.
    card_brand = Column(String(20), nullable=True)  # visa, mastercard, amex
    card_last4 = Column(String(4), nullable=True)
    card_exp_month = Column(Integer, nullable=True)
    card_exp_year = Column(Integer, nullable=True)

    # Flags
    is_default = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_user_payment_method', 'user_id', 'is_default'),
    )


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class SubscriptionPlan(BaseModel):
    """Subscription plan details"""
    id: str
    name: str
    price: float
    currency: str
    interval: str
    features: List[str]


class TokenPackage(BaseModel):
    """Token package details"""
    id: str
    name: str
    tokens: int
    bonus: int
    price: float
    currency: str
    popular: bool


class SubscriptionSchema(BaseModel):
    """Subscription response schema"""
    id: int
    user_id: int
    tier: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool

    class Config:
        from_attributes = True


class TransactionSchema(BaseModel):
    """Transaction response schema"""
    id: int
    user_id: int
    type: str
    amount: int
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
