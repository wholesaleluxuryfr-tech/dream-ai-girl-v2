"""Memory Management Routes

API endpoints for managing AI girlfriend memories
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
import logging

from ..memory_system import get_memory_system

logger = logging.getLogger(__name__)
router = APIRouter()

memory_system = get_memory_system()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class StoreMemoryRequest(BaseModel):
    user_id: int
    girl_id: str
    content: str
    context: Optional[Dict] = None


class MemoryResponse(BaseModel):
    content: str
    importance: float
    timestamp: str
    similarity: Optional[float] = None


class MemorySummaryRequest(BaseModel):
    user_id: int
    girl_id: str
    messages: List[Dict]  # [{"sender": "user", "content": "..."}]


# ============================================================================
# MEMORY ROUTES
# ============================================================================

@router.post("/store")
async def store_memory(request: StoreMemoryRequest):
    """
    Manually store a memory

    Use this to save important conversation moments, user preferences, or facts
    """
    success = memory_system.store_memory(
        user_id=request.user_id,
        girl_id=request.girl_id,
        content=request.content,
        context=request.context
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to store memory - check Pinecone configuration"
        )

    return {
        "success": True,
        "message": "Memory stored successfully"
    }


@router.get("/retrieve")
async def retrieve_memories(
    user_id: int = Query(...),
    girl_id: str = Query(...),
    query: str = Query(...),
    top_k: int = Query(5, ge=1, le=20),
    min_importance: float = Query(0.3, ge=0.0, le=1.0)
) -> Dict:
    """
    Retrieve relevant memories using semantic search

    Args:
        user_id: User ID
        girl_id: Girlfriend ID
        query: Search query (semantic)
        top_k: Number of memories to return
        min_importance: Minimum importance threshold
    """
    memories = memory_system.retrieve_memories(
        user_id=user_id,
        girl_id=girl_id,
        query=query,
        top_k=top_k,
        min_importance=min_importance
    )

    return {
        "memories": memories,
        "count": len(memories)
    }


@router.get("/recent")
async def get_recent_memories(
    user_id: int = Query(...),
    girl_id: str = Query(...),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, ge=1, le=50)
) -> Dict:
    """
    Get recent important memories without search query

    Returns memories sorted by importance from the last N days
    """
    memories = memory_system.get_recent_memories(
        user_id=user_id,
        girl_id=girl_id,
        days=days,
        limit=limit
    )

    return {
        "memories": memories,
        "count": len(memories),
        "days": days
    }


@router.post("/summarize")
async def summarize_conversation(request: MemorySummaryRequest):
    """
    Summarize a conversation and optionally store as memory

    Useful for extracting key points from long conversations
    """
    summary = memory_system.summarize_conversation(
        user_id=request.user_id,
        girl_id=request.girl_id,
        messages=request.messages
    )

    if not summary:
        return {
            "success": False,
            "message": "Conversation too short to summarize or LLM unavailable"
        }

    # Optionally store the summary as a memory
    memory_system.store_memory(
        user_id=request.user_id,
        girl_id=request.girl_id,
        content=f"[RÉSUMÉ] {summary}",
        context={'type': 'summary', 'message_count': len(request.messages)}
    )

    return {
        "success": True,
        "summary": summary,
        "stored_as_memory": True
    }


@router.get("/stats")
async def get_memory_stats(
    user_id: int = Query(...),
    girl_id: str = Query(...)
) -> Dict:
    """Get memory system statistics"""
    stats = memory_system.get_stats(user_id, girl_id)

    return {
        "user_id": user_id,
        "girl_id": girl_id,
        **stats
    }


@router.delete("/clear")
async def clear_memories(
    user_id: int = Query(...),
    girl_id: str = Query(...)
):
    """
    Clear all memories for a user-girl pair

    ⚠️ WARNING: This action cannot be undone!
    """
    success = memory_system.delete_user_memories(user_id, girl_id)

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to clear memories"
        )

    return {
        "success": True,
        "message": f"All memories cleared for user {user_id} and {girl_id}"
    }


@router.get("/health")
async def memory_health_check():
    """Check if memory system is operational"""
    stats = memory_system.get_stats(user_id=0, girl_id="test")

    is_healthy = stats.get('status') in ['active', 'unavailable']

    return {
        "status": "healthy" if is_healthy else "degraded",
        "memory_system_status": stats.get('status'),
        "pinecone_available": memory_system.index is not None,
        "embeddings_available": memory_system.embedding_client is not None
    }
