"""Video generation routes (stubs)"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class GenerateVideoRequest(BaseModel):
    user_id: int
    girl_id: str

@router.post("/generate")
async def generate_video(request: GenerateVideoRequest):
    """Generate video (TODO: implement AnimateDiff)"""
    return {"message": "Video generation not yet implemented", "status": "pending"}
