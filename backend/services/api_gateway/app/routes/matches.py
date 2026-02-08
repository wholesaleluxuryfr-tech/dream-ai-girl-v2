"""Match routes - swipe and match with girlfriends"""

from fastapi import APIRouter, HTTPException, status, Request, Query
from pydantic import BaseModel
from typing import List
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


class SwipeRequest(BaseModel):
    girl_id: str
    action: str  # "like" or "pass"


async def call_service(url: str, method: str = "GET", data: dict = None):
    """Helper to call microservice"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                response = await client.post(url, json=data)
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


@router.get("/discover")
async def get_discover_profiles(request: Request, limit: int = Query(10, ge=1, le=50)):
    """
    Get profiles to swipe on (Tinder-like discovery).

    Returns girls that user hasn't seen yet.

    - **limit**: Number of profiles to return (1-50)
    """
    user_id = request.state.user_id
    url = f"{settings.AUTH_SERVICE_URL}/matches/discover?user_id={user_id}&limit={limit}"
    return await call_service(url)


@router.post("/swipe")
async def swipe_profile(swipe: SwipeRequest, request: Request):
    """
    Swipe on a profile (like or pass).

    - **girl_id**: Girl ID
    - **action**: "like" or "pass"

    If action is "like" and match happens, creates a chat room.
    """
    user_id = request.state.user_id
    data = {"user_id": user_id, **swipe.model_dump()}
    url = f"{settings.AUTH_SERVICE_URL}/matches/swipe"
    return await call_service(url, method="POST", data=data)


@router.get("/list")
async def get_matches(request: Request):
    """
    Get all user matches.

    Returns list of girlfriends user has matched with.
    """
    user_id = request.state.user_id
    url = f"{settings.AUTH_SERVICE_URL}/matches?user_id={user_id}"
    return await call_service(url)


@router.get("/{girl_id}")
async def get_match_details(girl_id: str, request: Request):
    """
    Get detailed info about a match.

    - **girl_id**: Girlfriend ID

    Returns match details including affection level.
    """
    user_id = request.state.user_id
    url = f"{settings.AUTH_SERVICE_URL}/matches/{user_id}/{girl_id}"
    return await call_service(url)


@router.delete("/{girl_id}")
async def unmatch(girl_id: str, request: Request):
    """
    Unmatch with a girlfriend.

    - **girl_id**: Girlfriend ID

    Deletes the match and all associated data.
    """
    user_id = request.state.user_id
    url = f"{settings.AUTH_SERVICE_URL}/matches/{user_id}/{girl_id}"
    return await call_service(url, method="DELETE")
