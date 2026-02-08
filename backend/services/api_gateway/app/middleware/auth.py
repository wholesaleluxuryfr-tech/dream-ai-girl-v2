"""Authentication middleware for JWT token validation"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.utils.security import verify_token
from shared.utils.database import get_cached, cache_key

# Public routes that don't require authentication
PUBLIC_ROUTES = [
    "/",
    "/health",
    "/ping",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
]


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Authentication middleware that validates JWT tokens.

    - Extracts token from Authorization header
    - Validates token signature and expiration
    - Injects user info into request.state
    - Allows public routes without authentication
    """

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for public routes
        if self._is_public_route(request.url.path):
            return await call_next(request)

        # Extract token from header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return self._unauthorized_response("Missing or invalid authorization header")

        token = auth_header.replace("Bearer ", "")

        # Validate token
        payload = verify_token(token, token_type="access")
        if not payload:
            return self._unauthorized_response("Invalid or expired token")

        # Extract user info from token
        user_id = payload.get("user_id")
        if not user_id:
            return self._unauthorized_response("Invalid token payload")

        # Check if user is active (cached check)
        user_active = self._check_user_active(user_id)
        if not user_active:
            return self._unauthorized_response("User account is inactive")

        # Inject user info into request state
        request.state.user_id = user_id
        request.state.username = payload.get("username")
        request.state.subscription_tier = payload.get("subscription_tier", "free")
        request.state.is_authenticated = True

        # Process request
        response = await call_next(request)

        return response

    def _is_public_route(self, path: str) -> bool:
        """Check if route is public (no auth required)"""
        for public_route in PUBLIC_ROUTES:
            if path == public_route or path.startswith(public_route):
                return True
        return False

    def _check_user_active(self, user_id: int) -> bool:
        """Check if user is active (with caching)"""
        # Try to get from cache first
        key = cache_key("user_active", user_id)
        cached = get_cached(key)

        if cached is not None:
            return cached == "1"

        # If not in cache, assume active (will be validated by auth service)
        # In production, you'd query the database or call auth service
        return True

    def _unauthorized_response(self, message: str):
        """Return 401 Unauthorized response"""
        from starlette.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": "Unauthorized",
                "message": message,
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
