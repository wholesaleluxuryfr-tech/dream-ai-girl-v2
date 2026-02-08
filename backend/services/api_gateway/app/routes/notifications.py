"""
Notifications API Routes

Endpoints for push notifications management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict
import json

from shared.utils.database import get_db

router = APIRouter()


# ============================================================================
# REQUEST MODELS
# ============================================================================

class SubscribeRequest(BaseModel):
    user_id: int
    subscription: Dict  # PushSubscription object


class UnsubscribeRequest(BaseModel):
    subscription: Dict


class SendNotificationRequest(BaseModel):
    user_id: int
    title: str
    body: str
    icon: Optional[str] = None
    image: Optional[str] = None
    url: Optional[str] = None
    data: Optional[Dict] = None


# ============================================================================
# SUBSCRIPTION MANAGEMENT
# ============================================================================

@router.post("/subscribe")
async def subscribe_to_push(
    request: SubscribeRequest,
    db: Session = Depends(get_db)
):
    """
    Subscribe user to push notifications

    Stores push subscription in database
    """
    try:
        from shared.models.user import User

        # Get user
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Store subscription (simplified - in production use dedicated table)
        # For now, we'll just acknowledge the subscription
        # TODO: Store in PushSubscription table

        return {
            "success": True,
            "message": "Subscribed to push notifications"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unsubscribe")
async def unsubscribe_from_push(
    request: UnsubscribeRequest,
    db: Session = Depends(get_db)
):
    """
    Unsubscribe from push notifications

    Removes push subscription from database
    """
    try:
        # TODO: Remove subscription from database

        return {
            "success": True,
            "message": "Unsubscribed from push notifications"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SEND NOTIFICATIONS
# ============================================================================

@router.post("/send")
async def send_notification(
    request: SendNotificationRequest,
    db: Session = Depends(get_db)
):
    """
    Send push notification to user

    Note: Requires web-push library and VAPID keys configured
    """
    try:
        # TODO: Implement actual push notification sending using pywebpush
        # For now, just acknowledge the request

        """
        Example implementation:

        from pywebpush import webpush, WebPushException

        # Get user's subscriptions
        subscriptions = get_user_subscriptions(request.user_id)

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info=sub,
                    data=json.dumps({
                        "title": request.title,
                        "body": request.body,
                        "icon": request.icon,
                        "image": request.image,
                        "url": request.url,
                        "data": request.data
                    }),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": "mailto:contact@dreamaigirl.com"
                    }
                )
            except WebPushException as e:
                print(f"Push failed: {e}")
        """

        return {
            "success": True,
            "message": "Notification sent"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# NOTIFICATION PREFERENCES
# ============================================================================

@router.get("/preferences/{user_id}")
async def get_notification_preferences(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""
    # TODO: Get from database
    return {
        "user_id": user_id,
        "enabled": True,
        "preferences": {
            "new_messages": True,
            "new_photos": True,
            "matches": True,
            "scenarios": True,
            "achievements": True,
            "marketing": False
        }
    }


@router.post("/preferences/{user_id}")
async def update_notification_preferences(
    user_id: int,
    preferences: Dict,
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    # TODO: Save to database
    return {
        "success": True,
        "preferences": preferences
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def send_push_to_user(user_id: int, title: str, body: str, data: Optional[Dict] = None):
    """
    Helper function to send push notification to user

    Can be called from other services
    """
    # TODO: Implement actual sending
    pass


async def notify_new_message(user_id: int, girl_id: str, message: str):
    """Notify user of new message"""
    await send_push_to_user(
        user_id=user_id,
        title=f"Nouveau message",
        body=message[:100],
        data={
            "type": "message",
            "girl_id": girl_id,
            "url": f"/chat/{girl_id}"
        }
    )


async def notify_new_photo(user_id: int, girl_id: str, girl_name: str):
    """Notify user of new photo"""
    await send_push_to_user(
        user_id=user_id,
        title=f"📸 {girl_name} t'a envoyé une photo",
        body="Clique pour voir",
        data={
            "type": "photo",
            "girl_id": girl_id,
            "url": f"/chat/{girl_id}"
        }
    )


async def notify_new_match(user_id: int, girl_id: str, girl_name: str):
    """Notify user of new match"""
    await send_push_to_user(
        user_id=user_id,
        title=f"❤️ C'est un match!",
        body=f"Tu as matché avec {girl_name}",
        data={
            "type": "match",
            "girl_id": girl_id,
            "url": f"/chat/{girl_id}"
        }
    )
