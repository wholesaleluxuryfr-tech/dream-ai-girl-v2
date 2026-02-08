"""Database utilities and session management

NOTE: For optimized database operations, use:
- shared.config.database_config for connection pooling and query optimization
- shared.utils.cache_strategy for Redis caching patterns

This module provides backward-compatible utilities and health checks.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator
import redis
from motor.motor_asyncio import AsyncIOMotorClient
from ..config.settings import get_settings

settings = get_settings()

# ============================================
# PostgreSQL (Basic - for backward compatibility)
# ============================================
# For production use, import from shared.config.database_config instead
# which includes query monitoring, performance tracking, and optimizations

engine = create_engine(
    settings.POSTGRES_URL,
    poolclass=QueuePool,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,  # Test connections before using
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI.

    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# Redis
# ============================================

redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True,
    max_connections=50,  # Connection pool for Redis
)


def get_redis() -> redis.Redis:
    """
    Get Redis client.

    Usage:
        cache = get_redis()
        cache.setex("key", 300, "value")
    """
    return redis_client


def get_redis_client() -> redis.Redis:
    """
    Alias for get_redis() for consistency with other modules.

    Usage:
        from shared.utils.database import get_redis_client
        redis = get_redis_client()
    """
    return redis_client


# ============================================
# MongoDB (for analytics)
# ============================================

mongo_client = None
mongo_db = None

if settings.MONGODB_URL:
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongo_db = mongo_client.dream_ai_analytics


def get_mongo():
    """Get MongoDB database"""
    return mongo_db


# ============================================
# Cache Utilities
# ============================================

def cache_key(prefix: str, *args) -> str:
    """
    Generate a cache key from prefix and arguments.

    Example:
        cache_key("user", 123) -> "user:123"
        cache_key("chat", 123, "emma") -> "chat:123:emma"
    """
    return f"{prefix}:{':'.join(map(str, args))}"


def get_cached(key: str, default=None):
    """Get value from Redis cache"""
    cache = get_redis()
    value = cache.get(key)
    return value if value is not None else default


def set_cached(key: str, value: str, ttl: int = None):
    """Set value in Redis cache with optional TTL"""
    cache = get_redis()
    if ttl:
        cache.setex(key, ttl, value)
    else:
        cache.set(key, value)


def delete_cached(key: str):
    """Delete value from Redis cache"""
    cache = get_redis()
    cache.delete(key)


def invalidate_pattern(pattern: str):
    """Delete all keys matching pattern"""
    cache = get_redis()
    for key in cache.scan_iter(match=pattern):
        cache.delete(key)


# ============================================
# Health Checks
# ============================================

def check_postgres_health() -> bool:
    """Check if PostgreSQL is healthy"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False


def check_redis_health() -> bool:
    """Check if Redis is healthy"""
    try:
        cache = get_redis()
        cache.ping()
        return True
    except Exception:
        return False


def check_mongo_health() -> bool:
    """Check if MongoDB is healthy"""
    if not mongo_client:
        return True  # Not required
    try:
        mongo_client.admin.command('ping')
        return True
    except Exception:
        return False
