"""Chat routes - proxy to chat service"""

from fastapi import APIRouter, HTTPException, status, Request, Query
from pydantic import BaseModel
from typing import Optional, List
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


class SendMessageRequest(BaseModel):
    girl_id: str
    content: str
    media_type: Optional[str] = None
    media_url: Optional[str] = None


async def call_chat_service(endpoint: str, method: str = "GET", data: dict = None):
    """Helper to call chat service"""
    url = f"{settings.CHAT_SERVICE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:  # Longer timeout for AI responses
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

        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Chat service timeout - AI might be slow"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Chat service unavailable: {str(e)}"
            )


@router.get("/rooms")
async def get_chat_rooms(request: Request):
    """
    Get all chat rooms (matches with recent messages).

    Returns list of girlfriends user is chatting with.
    """
    user_id = request.state.user_id
    return await call_chat_service(f"/rooms?user_id={user_id}")


@router.get("/{girl_id}/messages")
async def get_messages(
    girl_id: str,
    request: Request,
    limit: int = Query(100, ge=10, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Get chat message history with a girlfriend.

    - **girl_id**: Girlfriend ID
    - **limit**: Number of messages to return (10-500)
    - **offset**: Pagination offset
    """
    user_id = request.state.user_id
    return await call_chat_service(
        f"/messages?user_id={user_id}&girl_id={girl_id}&limit={limit}&offset={offset}"
    )


@router.post("/{girl_id}/send")
async def send_message(girl_id: str, message: SendMessageRequest, request: Request):
    """
    Send a message to a girlfriend.

    The AI will generate a response automatically.

    - **girl_id**: Girlfriend ID
    - **content**: Message text
    - **media_type**: Optional media type (photo, video, voice, gif)
    - **media_url**: Optional media URL
    """
    user_id = request.state.user_id
    data = {
        "user_id": user_id,
        "girl_id": girl_id,
        **message.model_dump()
    }
    return await call_chat_service("/send", method="POST", data=data)


@router.post("/{girl_id}/mark-read")
async def mark_messages_read(girl_id: str, request: Request):
    """
    Mark all messages from girlfriend as read.

    - **girl_id**: Girlfriend ID
    """
    user_id = request.state.user_id
    data = {"user_id": user_id, "girl_id": girl_id}
    return await call_chat_service("/mark-read", method="POST", data=data)


@router.get("/{girl_id}/typing")
async def get_typing_status(girl_id: str, request: Request):
    """
    Check if girlfriend is currently typing.

    For WebSocket, use ws://chat-service:8002/ws
    """
    user_id = request.state.user_id
    return await call_chat_service(f"/typing?user_id={user_id}&girl_id={girl_id}")
