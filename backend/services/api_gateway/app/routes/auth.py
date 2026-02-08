"""Authentication routes - proxy to auth service"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


# Pydantic schemas
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    age: int


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Helper function to call auth service
async def call_auth_service(endpoint: str, method: str = "GET", data: dict = None):
    """Call auth service and return response"""
    url = f"{settings.AUTH_SERVICE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if method == "POST":
                response = await client.post(url, json=data)
            elif method == "GET":
                response = await client.get(url)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Forward the response
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json() if response.text else {"error": "Auth service error"}
                )

            return response.json()

        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Auth service timeout"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Auth service unavailable: {str(e)}"
            )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new user.

    - **username**: Unique username (3-50 chars, alphanumeric + underscore)
    - **email**: Valid email address
    - **password**: Strong password (min 8 chars, uppercase, lowercase, digit)
    - **age**: Age (must be 18+)

    Returns JWT access and refresh tokens.
    """
    result = await call_auth_service(
        "/register",
        method="POST",
        data=request.model_dump()
    )
    return result


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login with username/email and password.

    - **username_or_email**: Username or email address
    - **password**: User password

    Returns JWT access and refresh tokens.
    """
    result = await call_auth_service(
        "/login",
        method="POST",
        data=request.model_dump()
    )
    return result


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token

    Returns new access token and refresh token.
    """
    result = await call_auth_service(
        "/refresh",
        method="POST",
        data=request.model_dump()
    )
    return result


@router.post("/logout")
async def logout(request: Request):
    """
    Logout user (invalidate tokens).

    Requires authentication.
    """
    user_id = request.state.user_id
    result = await call_auth_service(
        f"/logout/{user_id}",
        method="POST"
    )
    return result


@router.get("/me")
async def get_current_user(request: Request):
    """
    Get current authenticated user info.

    Requires authentication.
    """
    user_id = request.state.user_id
    result = await call_auth_service(f"/users/{user_id}")
    return result
