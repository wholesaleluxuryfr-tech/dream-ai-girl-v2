"""
API Gateway - Main application entry point.
Routes all client requests to appropriate microservices.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import sys
import os
import logging
from datetime import datetime

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import check_postgres_health, check_redis_health
from .middleware.rate_limiter import RateLimiterMiddleware
from .middleware.logging import LoggingMiddleware
from .middleware.auth import AuthMiddleware
from .routes import auth, users, chat, matches, media, stories, payment, gamification, scenarios, analytics, notifications, custom_girls, photos, videos, voice

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
    logger.info("🚀 Starting API Gateway...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Check database connections
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
    logger.info("👋 Shutting down API Gateway...")


# Create FastAPI app
app = FastAPI(
    title="Dream AI Girl API",
    description="API Gateway pour la plateforme Dream AI Girl - Meilleure girlfriend IA française",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# ============================================
# MIDDLEWARE
# ============================================

# CORS - Must be first
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.ENVIRONMENT == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host (production only)
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["dreamaigirl.com", "*.dreamaigirl.com"]
    )

# Custom middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(AuthMiddleware)


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


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "message": f"The requested resource was not found: {request.url.path}",
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# ============================================
# HEALTH & MONITORING
# ============================================

@app.get("/health", tags=["Monitoring"])
async def health_check():
    """Health check endpoint for load balancers and monitoring"""
    postgres_healthy = check_postgres_health()
    redis_healthy = check_redis_health()

    is_healthy = postgres_healthy and redis_healthy

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "postgres": "up" if postgres_healthy else "down",
            "redis": "up" if redis_healthy else "down",
        },
        "version": app.version,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Dream AI Girl API Gateway",
        "version": app.version,
        "docs": f"{settings.CORS_ORIGINS[0]}/docs" if settings.DEBUG else None,
        "status": "operational",
    }


@app.get("/ping", tags=["Monitoring"])
async def ping():
    """Simple ping endpoint"""
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat()}


# ============================================
# ROUTES
# ============================================

# Authentication routes
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

# User routes
app.include_router(
    users.router,
    prefix="/api/v1/users",
    tags=["Users"]
)

# Chat routes
app.include_router(
    chat.router,
    prefix="/api/v1/chat",
    tags=["Chat"]
)

# Match routes
app.include_router(
    matches.router,
    prefix="/api/v1/matches",
    tags=["Matches"]
)

# Media routes
app.include_router(
    media.router,
    prefix="/api/v1/media",
    tags=["Media"]
)

# Stories routes
app.include_router(
    stories.router,
    prefix="/api/v1/stories",
    tags=["Stories"]
)

# Payment routes
app.include_router(
    payment.router,
    prefix="/api/v1/payment",
    tags=["Payment"]
)

# Gamification routes
app.include_router(
    gamification.router,
    prefix="/api/v1/gamification",
    tags=["Gamification"]
)

# Scenarios routes
app.include_router(
    scenarios.router,
    prefix="/api/v1/scenarios",
    tags=["Scenarios"]
)

# Analytics routes
app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)

# Notifications routes
app.include_router(
    notifications.router,
    prefix="/api/v1/notifications",
    tags=["Notifications"]
)

# Custom Girls routes
app.include_router(
    custom_girls.router,
    prefix="/api/v1/custom-girls",
    tags=["Custom Girls"]
)

# Photos routes (SDXL generation)
app.include_router(
    photos.router,
    prefix="/api/v1/photos",
    tags=["Photos"]
)

# Videos routes (AnimateDiff generation)
app.include_router(
    videos.router,
    prefix="/api/v1/videos",
    tags=["Videos"]
)

# Voice routes (ElevenLabs TTS)
app.include_router(
    voice.router,
    prefix="/api/v1/voice",
    tags=["Voice"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
