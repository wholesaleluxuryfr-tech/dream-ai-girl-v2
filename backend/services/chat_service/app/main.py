"""
Chat Service - Real-time WebSocket chat
Handles instant messaging with typing indicators, read receipts, and AI integration.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import socketio
import sys
import os
import logging
from datetime import datetime

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import check_postgres_health, check_redis_health, engine
from shared.models.chat import Base

from .routes import messages
from .websocket import sio

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
    logger.info("💬 Starting Chat Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Database table creation failed: {e}")

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
    logger.info("👋 Shutting down Chat Service...")


# Create FastAPI app
app = FastAPI(
    title="Dream AI Girl - Chat Service",
    description="Real-time WebSocket chat microservice",
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
    allow_origins=["*"],  # Internal service + WebSocket, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# SOCKET.IO INTEGRATION
# ============================================

# Mount Socket.IO app
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
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

    is_healthy = postgres_healthy and redis_healthy

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "service": "chat-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "postgres": "up" if postgres_healthy else "down",
            "redis": "up" if redis_healthy else "down",
        },
        "version": app.version,
        "websocket": "enabled"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Dream AI Girl - Chat Service",
        "version": app.version,
        "status": "operational",
        "websocket_url": "/socket.io",
        "capabilities": ["real_time_chat", "typing_indicators", "read_receipts", "ai_integration"]
    }


# ============================================
# ROUTES
# ============================================

# REST API routes for chat history
app.include_router(
    messages.router,
    prefix="/api",
    tags=["Chat Messages"]
)


# Use socket_app instead of app for ASGI
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        socket_app,  # Use socket_app which wraps both FastAPI and Socket.IO
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )
