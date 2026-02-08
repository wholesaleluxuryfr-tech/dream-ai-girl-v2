"""
Auth Service - Authentication and User Management
Handles registration, login, JWT tokens, and user CRUD operations.
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
from shared.utils.database import check_postgres_health, check_redis_health, engine
from shared.models.user import Base

from .routes import auth, users, matches

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
    logger.info("🔐 Starting Auth Service...")
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
    logger.info("👋 Shutting down Auth Service...")


# Create FastAPI app
app = FastAPI(
    title="Dream AI Girl - Auth Service",
    description="Authentication and user management microservice",
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

    is_healthy = postgres_healthy and redis_healthy

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "service": "auth-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "postgres": "up" if postgres_healthy else "down",
            "redis": "up" if redis_healthy else "down",
        },
        "version": app.version,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Dream AI Girl - Auth Service",
        "version": app.version,
        "status": "operational",
    }


# ============================================
# ROUTES
# ============================================

# Authentication routes
app.include_router(
    auth.router,
    prefix="",
    tags=["Authentication"]
)

# User management routes
app.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)

# Match management routes
app.include_router(
    matches.router,
    prefix="/matches",
    tags=["Matches"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG,
        log_level="info"
    )
