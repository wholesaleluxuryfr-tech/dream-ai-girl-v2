"""Authentication routes - register, login, refresh, logout"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import sys
import os
import logging

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db, get_redis, cache_key, set_cached, delete_cached
from shared.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token
)
from shared.models.user import User, UserCreate, UserLogin, UserResponse

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# Response schemas
class TokenResponse(dict):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(dict):
    """Refresh token request"""
    refresh_token: str


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Creates user account and returns JWT tokens.
    """
    logger.info(f"Registration attempt: {user_data.username}")

    # Check if username exists
    existing_user = db.query(User).filter(User.username == user_data.username.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    try:
        hashed_password = hash_password(user_data.password)

        new_user = User(
            username=user_data.username.lower(),
            email=user_data.email.lower(),
            password_hash=hashed_password,
            age=user_data.age,
            tokens=100,  # Starting tokens
            xp=0,
            level=1,
            subscription_tier="free",
            created_at=datetime.utcnow(),
            is_active=True,
            is_verified=False,
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"User registered successfully: {new_user.username} (ID: {new_user.id})")

        # Generate tokens
        token_payload = {
            "user_id": new_user.id,
            "username": new_user.username,
            "subscription_tier": new_user.subscription_tier,
        }

        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        # Store refresh token in Redis (with user_id as key)
        cache = get_redis()
        refresh_key = cache_key("refresh_token", new_user.id)
        cache.setex(refresh_key, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, refresh_token)

        # Cache user active status
        active_key = cache_key("user_active", new_user.id)
        set_cached(active_key, "1", ttl=settings.REDIS_TTL_LONG)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(new_user),
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Registration failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with username/email and password.

    Returns JWT tokens on success.
    """
    logger.info(f"Login attempt: {credentials.username_or_email}")

    # Find user by username or email
    user = db.query(User).filter(
        (User.username == credentials.username_or_email.lower()) |
        (User.email == credentials.username_or_email.lower())
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )

    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    logger.info(f"User logged in successfully: {user.username} (ID: {user.id})")

    # Generate tokens
    token_payload = {
        "user_id": user.id,
        "username": user.username,
        "subscription_tier": user.subscription_tier,
    }

    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    # Store refresh token in Redis
    cache = get_redis()
    refresh_key = cache_key("refresh_token", user.id)
    cache.setex(refresh_key, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, refresh_token)

    # Cache user active status
    active_key = cache_key("user_active", user.id)
    set_cached(active_key, "1", ttl=settings.REDIS_TTL_LONG)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.post("/refresh", response_model=dict)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.

    Returns new access and refresh tokens.
    """
    # Verify refresh token
    payload = verify_token(request["refresh_token"], token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = payload.get("user_id")

    # Verify token exists in Redis
    cache = get_redis()
    refresh_key = cache_key("refresh_token", user_id)
    stored_token = cache.get(refresh_key)

    if not stored_token or stored_token != request["refresh_token"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    logger.info(f"Token refreshed for user: {user.username} (ID: {user.id})")

    # Generate new tokens
    token_payload = {
        "user_id": user.id,
        "username": user.username,
        "subscription_tier": user.subscription_tier,
    }

    access_token = create_access_token(token_payload)
    new_refresh_token = create_refresh_token(token_payload)

    # Update refresh token in Redis
    cache.setex(refresh_key, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, new_refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.post("/logout/{user_id}")
async def logout(user_id: int, db: Session = Depends(get_db)):
    """
    Logout user by invalidating refresh token.

    Removes refresh token from Redis.
    """
    # Delete refresh token from Redis
    cache = get_redis()
    refresh_key = cache_key("refresh_token", user_id)
    deleted = cache.delete(refresh_key)

    # Delete user active cache
    active_key = cache_key("user_active", user_id)
    delete_cached(active_key)

    logger.info(f"User logged out: ID {user_id}")

    return {
        "message": "Logged out successfully",
        "tokens_invalidated": deleted > 0
    }


@router.post("/verify-email/{user_id}")
async def verify_email(user_id: int, verification_code: str, db: Session = Depends(get_db)):
    """
    Verify user email with verification code.

    TODO: Implement email verification logic with codes sent via email.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # TODO: Verify code (store verification codes in Redis)
    # For now, just mark as verified
    user.is_verified = True
    db.commit()

    logger.info(f"Email verified for user: {user.username}")

    return {"message": "Email verified successfully"}


@router.post("/request-password-reset")
async def request_password_reset(email: str, db: Session = Depends(get_db)):
    """
    Request password reset email.

    TODO: Implement email sending with reset link.
    """
    user = db.query(User).filter(User.email == email.lower()).first()

    # Don't reveal if email exists or not (security)
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}

    # TODO: Generate reset token, store in Redis, send email
    logger.info(f"Password reset requested for: {email}")

    return {"message": "If the email exists, a reset link has been sent"}
