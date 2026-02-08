"""Media Service - Image/Video Generation and CDN"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sys
import os
import logging
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import check_postgres_health, check_redis_health

from .routes import photos, videos, stories

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("📸 Starting Media Service...")
    logger.info(f"Promptchan API: {'configured' if settings.PROMPTCHAN_KEY else 'not configured'}")

    if check_postgres_health():
        logger.info("✅ PostgreSQL healthy")
    if check_redis_health():
        logger.info("✅ Redis healthy")

    yield
    logger.info("👋 Shutting down Media Service...")


app = FastAPI(
    title="Dream AI Girl - Media Service",
    description="Image/Video generation and CDN management",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": "Internal server error", "message": str(exc) if settings.DEBUG else "An error occurred"})


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "media-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "postgres": "up" if check_postgres_health() else "down",
            "redis": "up" if check_redis_health() else "down",
            "promptchan": "configured" if settings.PROMPTCHAN_KEY else "not configured"
        }
    }


@app.get("/")
async def root():
    return {"service": "Dream AI Girl - Media Service", "version": app.version, "capabilities": ["image_generation", "video_generation", "cdn", "compression"]}


app.include_router(photos.router, prefix="/photos", tags=["Photos"])
app.include_router(videos.router, prefix="/videos", tags=["Videos"])
app.include_router(stories.router, prefix="/stories", tags=["Stories"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=settings.DEBUG)
