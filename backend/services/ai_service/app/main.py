"""
AI Service - Conversational AI and Media Generation
Handles chat with AI girlfriends and generates images/videos.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sys
import os
import logging
from datetime import datetime

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import check_postgres_health, check_redis_health

from .routes import chat, generation, memory

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events - startup and shutdown"""
    # Startup
    logger.info("🤖 Starting AI Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"OpenRouter Model: {settings.OPENROUTER_MODEL}")

    # Check API keys
    if settings.OPENROUTER_API_KEY:
        logger.info("✅ OpenRouter API key configured")
    else:
        logger.warning("⚠️ OpenRouter API key not configured - chat will not work")

    # Check connections
    if check_postgres_health():
        logger.info("✅ PostgreSQL connection healthy")
    else:
        logger.error("❌ PostgreSQL connection failed")

    if check_redis_health():
        logger.info("✅ Redis connection healthy")
    else:
        logger.error("❌ Redis connection failed")

    yield

    # Shutdown
    logger.info("👋 Shutting down AI Service...")


# Create FastAPI app
app = FastAPI(
    title="Dream AI Girl - AI Service",
    description="Conversational AI and media generation microservice",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# ============================================
# MIDDLEWARE
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal service, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# EXCEPTION HANDLERS
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# ============================================
# HEALTH & MONITORING
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    postgres_healthy = check_postgres_health()
    redis_healthy = check_redis_health()

    # Check memory system
    from .memory_system import get_memory_system
    mem_sys = get_memory_system()
    memory_status = "active" if (mem_sys.index and mem_sys.embedding_client) else "unavailable"

    is_healthy = postgres_healthy and redis_healthy

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "service": "ai-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "postgres": "up" if postgres_healthy else "down",
            "redis": "up" if redis_healthy else "down",
            "openrouter": "configured" if settings.OPENROUTER_API_KEY else "not configured",
            "pinecone": "configured" if settings.PINECONE_API_KEY else "not configured",
            "memory_system": memory_status
        },
        "version": app.version,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Dream AI Girl - AI Service",
        "version": app.version,
        "status": "operational",
        "capabilities": ["conversational_ai", "image_generation", "video_generation"]
    }


# ============================================
# ROUTES
# ============================================

# Chat routes
app.include_router(
    chat.router,
    prefix="/chat",
    tags=["Chat AI"]
)

# Generation routes
app.include_router(
    generation.router,
    prefix="/generate",
    tags=["Media Generation"]
)

# Memory routes
app.include_router(
    memory.router,
    prefix="/memory",
    tags=["Memory System"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=settings.DEBUG,
        log_level="info"
    )
