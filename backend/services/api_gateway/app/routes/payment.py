"""Payment routes - Stripe subscriptions and token purchases"""

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
import httpx
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings

settings = get_settings()
router = APIRouter()


class SubscribeRequest(BaseModel):
    tier: str  # "premium" or "elite"
    payment_method_id: str  # Stripe payment method ID


class PurchaseTokensRequest(BaseModel):
    package_id: str  # "small", "medium", "large", "mega"
    payment_method_id: str


async def call_payment_service(endpoint: str, method: str = "GET", data: dict = None):
    """Helper to call payment service"""
    url = f"{settings.PAYMENT_SERVICE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                response = await client.post(url, json=data)
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
                detail=f"Payment service unavailable: {str(e)}"
            )


@router.get("/subscription")
async def get_subscription(request: Request):
    """
    Get current user subscription details.

    Returns tier, status, expiration date, etc.
    """
    user_id = request.state.user_id
    return await call_payment_service(f"/subscription?user_id={user_id}")


@router.post("/subscribe")
async def subscribe(subscribe_req: SubscribeRequest, request: Request):
    """
    Subscribe to Premium or Elite tier.

    - **tier**: "premium" (9.99€/month) or "elite" (19.99€/month)
    - **payment_method_id**: Stripe payment method ID from frontend

    Creates a Stripe subscription and returns subscription details.
    """
    user_id = request.state.user_id
    data = {"user_id": user_id, **subscribe_req.model_dump()}
    return await call_payment_service("/subscribe", method="POST", data=data)


@router.post("/cancel-subscription")
async def cancel_subscription(request: Request):
    """
    Cancel current subscription.

    Subscription remains active until end of billing period.
    """
    user_id = request.state.user_id
    data = {"user_id": user_id}
    return await call_payment_service("/cancel-subscription", method="POST", data=data)


@router.get("/tokens")
async def get_token_balance(request: Request):
    """
    Get current token balance and transaction history.
    """
    user_id = request.state.user_id
    return await call_payment_service(f"/tokens?user_id={user_id}")


@router.post("/purchase-tokens")
async def purchase_tokens(purchase_req: PurchaseTokensRequest, request: Request):
    """
    Purchase token package.

    - **package_id**: Package ID
      - "small": 100 tokens - 4.99€
      - "medium": 250 tokens + 25 bonus - 9.99€
      - "large": 600 tokens + 100 bonus - 19.99€
      - "mega": 1500 tokens + 300 bonus - 39.99€
    - **payment_method_id**: Stripe payment method ID
    """
    user_id = request.state.user_id
    data = {"user_id": user_id, **purchase_req.model_dump()}
    return await call_payment_service("/purchase-tokens", method="POST", data=data)


@router.get("/plans")
async def get_subscription_plans():
    """
    Get all available subscription plans with features.

    Public endpoint (no auth required).
    """
    return await call_payment_service("/plans")


@router.get("/token-packages")
async def get_token_packages():
    """
    Get all available token packages with prices.

    Public endpoint (no auth required).
    """
    return await call_payment_service("/token-packages")
