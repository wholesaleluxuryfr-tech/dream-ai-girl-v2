"""Stories routes (stubs)"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_stories(user_id: int):
    """Get active stories"""
    return {"stories": [], "message": "Stories feature coming soon"}
