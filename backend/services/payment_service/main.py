"""
Payment Service - Handles Stripe subscriptions and token purchases

Microservice responsible for all payment operations:
- Subscription management (Premium/Elite tiers)
- Token purchases (one-time payments)
- Webhook handling for Stripe events
- Payment history and invoicing
"""

from fastapi import FastAPI, HTTPException, Request, Header, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import stripe
import sys
import os
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db, check_postgres_health
from shared.models.user import User
from shared.models.payment import Subscription, Transaction, TokenPackage, SubscriptionPlan

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Create FastAPI app
app = FastAPI(
    title="Dream AI Girl - Payment Service",
    description="Handles all payment operations with Stripe",
    version="1.0.0"
)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class SubscribeRequest(BaseModel):
    user_id: int
    tier: str  # "premium" or "elite"
    payment_method_id: str


class CancelSubscriptionRequest(BaseModel):
    user_id: int


class PurchaseTokensRequest(BaseModel):
    user_id: int
    package_id: str
    payment_method_id: str


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    tier: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    stripe_subscription_id: Optional[str]
    cancel_at_period_end: bool


class TokenBalanceResponse(BaseModel):
    user_id: int
    balance: int
    recent_transactions: List[Dict]


# ============================================================================
# SUBSCRIPTION PLANS & TOKEN PACKAGES
# ============================================================================

SUBSCRIPTION_PLANS = {
    "premium": {
        "name": "Premium",
        "price": 9.99,
        "currency": "eur",
        "interval": "month",
        "stripe_price_id": settings.STRIPE_PREMIUM_PRICE_ID,
        "features": [
            "3 girlfriends actives",
            "Messages illimités",
            "500 tokens/semaine",
            "Photos HD",
            "Priorité génération",
            "Pas de publicité",
            "Messages vocaux"
        ]
    },
    "elite": {
        "name": "Elite",
        "price": 19.99,
        "currency": "eur",
        "interval": "month",
        "stripe_price_id": settings.STRIPE_ELITE_PRICE_ID,
        "features": [
            "Girlfriends illimitées",
            "Messages illimités",
            "Tokens illimités",
            "Génération vidéo",
            "Custom girlfriend",
            "Support prioritaire",
            "Accès beta features",
            "Badge Elite"
        ]
    }
}

TOKEN_PACKAGES = {
    "small": {
        "name": "Petit Pack",
        "tokens": 100,
        "bonus": 0,
        "price": 4.99,
        "currency": "eur",
        "popular": False
    },
    "medium": {
        "name": "Pack Moyen",
        "tokens": 250,
        "bonus": 25,
        "price": 9.99,
        "currency": "eur",
        "popular": True
    },
    "large": {
        "name": "Grand Pack",
        "tokens": 600,
        "bonus": 100,
        "price": 19.99,
        "currency": "eur",
        "popular": False
    },
    "mega": {
        "name": "Méga Pack",
        "tokens": 1500,
        "bonus": 300,
        "price": 39.99,
        "currency": "eur",
        "popular": False
    }
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_or_create_stripe_customer(user: User) -> str:
    """Get or create Stripe customer for user"""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    # Create new Stripe customer
    customer = stripe.Customer.create(
        email=user.email,
        name=user.username,
        metadata={"user_id": user.id}
    )

    # Update user with customer ID
    user.stripe_customer_id = customer.id

    return customer.id


def create_subscription_in_stripe(customer_id: str, price_id: str) -> stripe.Subscription:
    """Create Stripe subscription"""
    subscription = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        payment_behavior="default_incomplete",
        payment_settings={"save_default_payment_method": "on_subscription"},
        expand=["latest_invoice.payment_intent"]
    )
    return subscription


def add_tokens_to_user(db: Session, user: User, amount: int, source: str = "purchase"):
    """Add tokens to user balance and log transaction"""
    user.token_balance += amount

    # Create transaction record
    transaction = Transaction(
        user_id=user.id,
        type="token_purchase" if source == "purchase" else "token_grant",
        amount=amount,
        description=f"Added {amount} tokens - {source}",
        status="completed"
    )
    db.add(transaction)
    db.commit()


def grant_subscription_tokens(db: Session, user: User, tier: str):
    """Grant weekly tokens based on subscription tier"""
    if tier == "premium":
        add_tokens_to_user(db, user, 500, f"Weekly {tier} subscription")
    elif tier == "elite":
        # Elite has unlimited, but we'll give a large amount weekly
        add_tokens_to_user(db, user, 10000, f"Weekly {tier} subscription")


# ============================================================================
# SUBSCRIPTION ENDPOINTS
# ============================================================================

@app.get("/subscription")
async def get_subscription(user_id: int):
    """Get user's current subscription"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status.in_(["active", "trialing", "past_due"])
        ).first()

        if not subscription:
            return {
                "tier": "free",
                "status": "active",
                "features": []
            }

        return {
            "id": subscription.id,
            "user_id": subscription.user_id,
            "tier": subscription.tier,
            "status": subscription.status,
            "current_period_start": subscription.current_period_start.isoformat(),
            "current_period_end": subscription.current_period_end.isoformat(),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "features": SUBSCRIPTION_PLANS[subscription.tier]["features"]
        }
    finally:
        db.close()


@app.post("/subscribe")
async def create_subscription(request: SubscribeRequest):
    """Create new subscription"""
    db = next(get_db())
    try:
        # Validate tier
        if request.tier not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid tier")

        # Get user
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check for existing active subscription
        existing = db.query(Subscription).filter(
            Subscription.user_id == request.user_id,
            Subscription.status.in_(["active", "trialing"])
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="User already has active subscription"
            )

        # Get or create Stripe customer
        customer_id = get_or_create_stripe_customer(user)

        # Attach payment method to customer
        stripe.PaymentMethod.attach(
            request.payment_method_id,
            customer=customer_id
        )

        # Set as default payment method
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": request.payment_method_id}
        )

        # Create Stripe subscription
        plan = SUBSCRIPTION_PLANS[request.tier]
        stripe_sub = create_subscription_in_stripe(customer_id, plan["stripe_price_id"])

        # Create subscription in database
        subscription = Subscription(
            user_id=request.user_id,
            tier=request.tier,
            status=stripe_sub.status,
            stripe_subscription_id=stripe_sub.id,
            stripe_customer_id=customer_id,
            current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start),
            current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end),
            cancel_at_period_end=False
        )

        db.add(subscription)
        db.commit()
        db.refresh(subscription)

        # Grant initial tokens
        grant_subscription_tokens(db, user, request.tier)

        logger.info(f"Created subscription for user {request.user_id}: {request.tier}")

        return {
            "subscription": {
                "id": subscription.id,
                "tier": subscription.tier,
                "status": subscription.status,
                "current_period_end": subscription.current_period_end.isoformat()
            },
            "client_secret": stripe_sub.latest_invoice.payment_intent.client_secret if stripe_sub.latest_invoice else None
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()


@app.post("/cancel-subscription")
async def cancel_subscription(request: CancelSubscriptionRequest):
    """Cancel subscription at end of billing period"""
    db = next(get_db())
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == request.user_id,
            Subscription.status.in_(["active", "trialing"])
        ).first()

        if not subscription:
            raise HTTPException(status_code=404, detail="No active subscription found")

        # Cancel in Stripe
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )

        # Update in database
        subscription.cancel_at_period_end = True
        db.commit()

        logger.info(f"Cancelled subscription for user {request.user_id}")

        return {
            "success": True,
            "message": "Subscription will be cancelled at end of billing period",
            "ends_at": subscription.current_period_end.isoformat()
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()


# ============================================================================
# TOKEN ENDPOINTS
# ============================================================================

@app.get("/tokens")
async def get_token_balance(user_id: int):
    """Get user's token balance and recent transactions"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get recent transactions
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc()).limit(10).all()

        return {
            "user_id": user_id,
            "balance": user.token_balance,
            "recent_transactions": [
                {
                    "id": t.id,
                    "type": t.type,
                    "amount": t.amount,
                    "description": t.description,
                    "status": t.status,
                    "created_at": t.created_at.isoformat()
                }
                for t in transactions
            ]
        }
    finally:
        db.close()


@app.post("/purchase-tokens")
async def purchase_tokens(request: PurchaseTokensRequest):
    """Purchase token package"""
    db = next(get_db())
    try:
        # Validate package
        if request.package_id not in TOKEN_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package")

        package = TOKEN_PACKAGES[request.package_id]

        # Get user
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get or create Stripe customer
        customer_id = get_or_create_stripe_customer(user)

        # Create payment intent
        amount_cents = int(package["price"] * 100)  # Convert to cents

        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=package["currency"],
            customer=customer_id,
            payment_method=request.payment_method_id,
            confirm=True,
            metadata={
                "user_id": request.user_id,
                "package_id": request.package_id,
                "tokens": package["tokens"] + package["bonus"]
            }
        )

        # If payment succeeded, add tokens
        if payment_intent.status == "succeeded":
            total_tokens = package["tokens"] + package["bonus"]
            add_tokens_to_user(db, user, total_tokens, f"Purchase {request.package_id}")

            logger.info(f"User {request.user_id} purchased {total_tokens} tokens")

            return {
                "success": True,
                "tokens_added": total_tokens,
                "new_balance": user.token_balance,
                "payment_intent_id": payment_intent.id
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Payment failed: {payment_intent.status}"
            )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()


# ============================================================================
# PLAN & PACKAGE INFO
# ============================================================================

@app.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {
        "plans": [
            {
                "id": plan_id,
                **plan_data
            }
            for plan_id, plan_data in SUBSCRIPTION_PLANS.items()
        ]
    }


@app.get("/token-packages")
async def get_token_packages():
    """Get all available token packages"""
    return {
        "packages": [
            {
                "id": package_id,
                **package_data
            }
            for package_id, package_data in TOKEN_PACKAGES.items()
        ]
    }


# ============================================================================
# STRIPE WEBHOOKS
# ============================================================================

@app.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Handle Stripe webhook events

    Events handled:
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed
    """
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    db = next(get_db())
    try:
        # Handle event
        if event.type == "customer.subscription.updated":
            subscription_data = event.data.object

            # Update subscription in database
            subscription = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == subscription_data.id
            ).first()

            if subscription:
                subscription.status = subscription_data.status
                subscription.current_period_start = datetime.fromtimestamp(
                    subscription_data.current_period_start
                )
                subscription.current_period_end = datetime.fromtimestamp(
                    subscription_data.current_period_end
                )
                subscription.cancel_at_period_end = subscription_data.cancel_at_period_end
                db.commit()

                logger.info(f"Updated subscription {subscription.id}: {subscription_data.status}")

        elif event.type == "customer.subscription.deleted":
            subscription_data = event.data.object

            # Update subscription status
            subscription = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == subscription_data.id
            ).first()

            if subscription:
                subscription.status = "canceled"
                db.commit()

                logger.info(f"Cancelled subscription {subscription.id}")

        elif event.type == "invoice.payment_succeeded":
            invoice = event.data.object

            # Grant tokens for recurring subscription payment
            if invoice.subscription:
                subscription = db.query(Subscription).filter(
                    Subscription.stripe_subscription_id == invoice.subscription
                ).first()

                if subscription:
                    user = db.query(User).filter(User.id == subscription.user_id).first()
                    if user:
                        grant_subscription_tokens(db, user, subscription.tier)
                        logger.info(f"Granted tokens for user {user.id} subscription renewal")

        elif event.type == "invoice.payment_failed":
            invoice = event.data.object

            # Handle failed payment
            if invoice.subscription:
                subscription = db.query(Subscription).filter(
                    Subscription.stripe_subscription_id == invoice.subscription
                ).first()

                if subscription:
                    subscription.status = "past_due"
                    db.commit()

                    logger.warning(f"Payment failed for subscription {subscription.id}")

        return {"received": True}

    finally:
        db.close()


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    postgres_healthy = check_postgres_health()

    return {
        "status": "healthy" if postgres_healthy else "unhealthy",
        "service": "payment_service",
        "postgres": "up" if postgres_healthy else "down",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
