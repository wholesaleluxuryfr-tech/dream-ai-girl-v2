"""Rate limiting middleware using Redis"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import sys
import os
import time

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_redis

settings = get_settings()


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.

    Limits:
    - Free users: 60 requests/minute
    - Premium users: 120 requests/minute
    - Elite users: Unlimited (or very high limit)
    """

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/ping", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Get user identifier (IP or user_id if authenticated)
        user_id = getattr(request.state, "user_id", None)
        identifier = f"user:{user_id}" if user_id else f"ip:{request.client.host}"

        # Get rate limit based on subscription tier
        subscription_tier = getattr(request.state, "subscription_tier", "free")
        rate_limit = self._get_rate_limit(subscription_tier)

        if rate_limit is None:  # Unlimited
            return await call_next(request)

        # Check rate limit
        if not self._check_rate_limit(identifier, rate_limit):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"You have exceeded the rate limit of {rate_limit} requests per minute",
                    "retry_after": 60,
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        remaining = self._get_remaining_requests(identifier, rate_limit)
        response.headers["X-RateLimit-Limit"] = str(rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)

        return response

    def _get_rate_limit(self, subscription_tier: str) -> int:
        """Get rate limit based on subscription tier"""
        limits = {
            "free": settings.RATE_LIMIT_REQUESTS_PER_MINUTE,
            "premium": settings.RATE_LIMIT_REQUESTS_PER_MINUTE * 2,
            "elite": None,  # Unlimited
        }
        return limits.get(subscription_tier, limits["free"])

    def _check_rate_limit(self, identifier: str, limit: int) -> bool:
        """Check if request is within rate limit using sliding window"""
        cache = get_redis()
        key = f"rate_limit:{identifier}"
        now = time.time()
        window = 60  # 1 minute

        # Remove old entries outside the window
        cache.zremrangebyscore(key, 0, now - window)

        # Count requests in current window
        current_count = cache.zcard(key)

        if current_count >= limit:
            return False

        # Add current request
        cache.zadd(key, {str(now): now})
        cache.expire(key, window)

        return True

    def _get_remaining_requests(self, identifier: str, limit: int) -> int:
        """Get remaining requests for this minute"""
        cache = get_redis()
        key = f"rate_limit:{identifier}"
        now = time.time()
        window = 60

        cache.zremrangebyscore(key, 0, now - window)
        current_count = cache.zcard(key)

        return max(0, limit - current_count)
