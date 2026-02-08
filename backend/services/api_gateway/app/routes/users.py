"""User management routes"""

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    age: Optional[int] = None
    photo_url: Optional[str] = None


async def call_auth_service(endpoint: str, method: str = "GET", data: dict = None):
    """Helper to call auth service"""
    url = f"{settings.AUTH_SERVICE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if method == "GET":
                response = await client.get(url)
            elif method == "PUT":
                response = await client.put(url, json=data)
            elif method == "DELETE":
                response = await client.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json() if response.text else {"error": "Service error"}
                )

            return response.json()

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Service unavailable: {str(e)}"
            )


@router.get("/profile")
async def get_profile(request: Request):
    """Get current user profile"""
    user_id = request.state.user_id
    return await call_auth_service(f"/users/{user_id}")


@router.put("/profile")
async def update_profile(profile: UpdateProfileRequest, request: Request):
    """Update user profile"""
    user_id = request.state.user_id
    return await call_auth_service(
        f"/users/{user_id}",
        method="PUT",
        data=profile.model_dump(exclude_none=True)
    )


@router.get("/stats")
async def get_user_stats(request: Request):
    """Get user statistics (matches, messages, photos, etc.)"""
    user_id = request.state.user_id
    return await call_auth_service(f"/users/{user_id}/stats")


@router.delete("/account")
async def delete_account(request: Request):
    """
    Delete user account permanently.

    ⚠️ This action is irreversible!
    """
    user_id = request.state.user_id
    return await call_auth_service(f"/users/{user_id}", method="DELETE")
