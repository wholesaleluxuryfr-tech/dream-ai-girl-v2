"""Advanced Redis Caching Strategy for Performance Optimization

Cache-Aside Pattern with intelligent invalidation

Target: Reduce database load by 80% for hot data
"""

import json
import logging
from typing import Optional, Any, Callable
from functools import wraps
import hashlib
from datetime import timedelta

from .database import get_redis_client

logger = logging.getLogger(__name__)
redis = get_redis_client()


# ============================================================================
# CACHE KEY PATTERNS
# ============================================================================

class CacheKeys:
    """Centralized cache key patterns for consistency"""

    # User data
    USER_PROFILE = "user:profile:{user_id}"
    USER_STATS = "user:stats:{user_id}"
    USER_TOKENS = "user:tokens:{user_id}"
    USER_SESSION = "user:session:{user_id}"

    # Match data
    MATCH = "match:{user_id}:{girl_id}"
    USER_MATCHES = "matches:user:{user_id}"
    MATCH_AFFECTION = "affection:{user_id}:{girl_id}"

    # Chat data
    CONVERSATION_HISTORY = "chat:history:{user_id}:{girl_id}"
    CONVERSATION_LATEST = "chat:latest:{user_id}:{girl_id}:{limit}"
    UNREAD_COUNT = "chat:unread:{user_id}:{girl_id}"
    TYPING_STATUS = "chat:typing:{user_id}:{girl_id}"

    # Media
    GIRL_PHOTOS = "photos:girl:{girl_id}"
    USER_RECEIVED_PHOTOS = "photos:received:{user_id}:{girl_id}"
    PHOTO_URL = "photo:url:{photo_id}"

    # Girl profiles
    GIRL_PROFILE = "girl:profile:{girl_id}"
    ACTIVE_GIRLS = "girls:active"
    GIRL_ARCHETYPE = "girl:archetype:{girl_id}"

    # Leaderboard
    LEADERBOARD_XP = "leaderboard:xp"
    LEADERBOARD_TOKENS = "leaderboard:tokens"

    # Rate limiting
    RATE_LIMIT = "ratelimit:{user_id}:{endpoint}"

    # Memory system
    MEMORIES = "memories:{user_id}:{girl_id}"
    RECENT_CONTEXT = "context:recent:{user_id}:{girl_id}"


# ============================================================================
# CACHE TTL (Time To Live) SETTINGS
# ============================================================================

class CacheTTL:
    """Cache expiration times optimized per data type"""

    # Short-lived (high-change frequency)
    TYPING_STATUS = 10  # 10 seconds
    RATE_LIMIT = 60  # 1 minute
    UNREAD_COUNT = 30  # 30 seconds

    # Medium-lived (moderate changes)
    CONVERSATION_LATEST = 300  # 5 minutes
    USER_STATS = 600  # 10 minutes
    MATCH_AFFECTION = 300  # 5 minutes

    # Long-lived (low-change frequency)
    USER_PROFILE = 900  # 15 minutes
    GIRL_PROFILE = 1800  # 30 minutes
    GIRL_PHOTOS = 3600  # 1 hour

    # Very long-lived (rarely changes)
    GIRL_ARCHETYPE = 7200  # 2 hours
    ACTIVE_GIRLS = 3600  # 1 hour

    # Persistent (manual invalidation only)
    USER_SESSION = 86400  # 24 hours


# ============================================================================
# CACHING DECORATORS
# ============================================================================

def cache_result(key_pattern: str, ttl: int = 300, serialize: bool = True):
    """
    Decorator to cache function results

    Args:
        key_pattern: Redis key pattern (can use {arg_name} placeholders)
        ttl: Time to live in seconds
        serialize: Whether to JSON serialize (False for simple types)

    Example:
        @cache_result("user:profile:{user_id}", ttl=900)
        def get_user_profile(user_id: int):
            return db.query(User).filter(User.id == user_id).first()
    """

    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from pattern
            import inspect
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            cache_key = key_pattern.format(**bound_args.arguments)

            # Try to get from cache
            cached = redis.get(cache_key)
            if cached:
                logger.debug(f"✅ Cache HIT: {cache_key}")
                return json.loads(cached) if serialize else cached

            # Cache miss - execute function
            logger.debug(f"❌ Cache MISS: {cache_key}")
            result = func(*args, **kwargs)

            # Store in cache
            if result is not None:
                cache_value = json.dumps(result) if serialize else result
                redis.setex(cache_key, ttl, cache_value)

            return result

        # Add cache invalidation method
        wrapper.invalidate = lambda **kwargs: redis.delete(key_pattern.format(**kwargs))

        return wrapper

    return decorator


def cache_invalidate(key_pattern: str, **kwargs):
    """
    Manually invalidate cache key

    Example:
        cache_invalidate(CacheKeys.USER_PROFILE, user_id=123)
    """
    cache_key = key_pattern.format(**kwargs)
    redis.delete(cache_key)
    logger.debug(f"🗑️  Cache invalidated: {cache_key}")


def cache_invalidate_pattern(pattern: str):
    """
    Invalidate all keys matching pattern

    Example:
        cache_invalidate_pattern("chat:history:123:*")  # Clear all conversations for user 123
    """
    keys = redis.keys(pattern)
    if keys:
        redis.delete(*keys)
        logger.debug(f"🗑️  Cache invalidated {len(keys)} keys matching: {pattern}")


# ============================================================================
# SPECIALIZED CACHE FUNCTIONS
# ============================================================================

def cache_conversation_history(user_id: int, girl_id: str, messages: list, limit: int = 100):
    """
    Cache conversation history with intelligent structure

    Stores:
    - Latest N messages as JSON list
    - Indexed for quick retrieval
    """
    key = CacheKeys.CONVERSATION_LATEST.format(user_id=user_id, girl_id=girl_id, limit=limit)

    # Serialize messages
    serialized = json.dumps([
        {
            'id': m.id,
            'sender': m.sender.value if hasattr(m.sender, 'value') else m.sender,
            'content': m.content,
            'timestamp': m.timestamp.isoformat(),
            'media_url': m.media_url,
            'is_read': m.is_read
        }
        for m in messages[:limit]
    ])

    redis.setex(key, CacheTTL.CONVERSATION_LATEST, serialized)
    logger.debug(f"💾 Cached {len(messages)} messages for {user_id}:{girl_id}")


def get_cached_conversation(user_id: int, girl_id: str, limit: int = 100) -> Optional[list]:
    """Retrieve cached conversation history"""
    key = CacheKeys.CONVERSATION_LATEST.format(user_id=user_id, girl_id=girl_id, limit=limit)
    cached = redis.get(key)

    if cached:
        logger.debug(f"✅ Cache HIT: Conversation {user_id}:{girl_id}")
        return json.loads(cached)

    logger.debug(f"❌ Cache MISS: Conversation {user_id}:{girl_id}")
    return None


def cache_user_matches(user_id: int, matches: list):
    """Cache user's active matches list"""
    key = CacheKeys.USER_MATCHES.format(user_id=user_id)

    serialized = json.dumps([
        {
            'girl_id': m.girl_id,
            'affection': m.affection,
            'photos_received': m.photos_received,
            'videos_received': m.videos_received,
            'matched_at': m.matched_at.isoformat()
        }
        for m in matches
    ])

    redis.setex(key, CacheTTL.USER_PROFILE, serialized)
    logger.debug(f"💾 Cached {len(matches)} matches for user {user_id}")


def get_cached_matches(user_id: int) -> Optional[list]:
    """Retrieve cached matches"""
    key = CacheKeys.USER_MATCHES.format(user_id=user_id)
    cached = redis.get(key)

    if cached:
        return json.loads(cached)
    return None


def increment_affection_cached(user_id: int, girl_id: str, amount: int = 1) -> int:
    """
    Increment affection in cache + return new value

    Benefits:
    - Atomic operation
    - No database hit for counter increments
    - Sync to DB periodically (every 10 increments or on logout)
    """
    key = CacheKeys.MATCH_AFFECTION.format(user_id=user_id, girl_id=girl_id)

    new_value = redis.incr(key, amount)

    # Set expiry if first time
    if new_value == amount:
        redis.expire(key, CacheTTL.MATCH_AFFECTION)

    # Every 10 points, mark for DB sync
    if new_value % 10 == 0:
        sync_key = f"sync:affection:{user_id}:{girl_id}"
        redis.setex(sync_key, 3600, new_value)

    return new_value


def get_cached_affection(user_id: int, girl_id: str) -> Optional[int]:
    """Get cached affection level"""
    key = CacheKeys.MATCH_AFFECTION.format(user_id=user_id, girl_id=girl_id)
    value = redis.get(key)

    return int(value) if value else None


def cache_girl_profile(girl_id: str, profile: dict):
    """Cache girl profile (archetype, appearance, personality)"""
    key = CacheKeys.GIRL_PROFILE.format(girl_id=girl_id)
    redis.setex(key, CacheTTL.GIRL_PROFILE, json.dumps(profile))


def get_cached_girl_profile(girl_id: str) -> Optional[dict]:
    """Retrieve cached girl profile"""
    key = CacheKeys.GIRL_PROFILE.format(girl_id=girl_id)
    cached = redis.get(key)

    return json.loads(cached) if cached else None


# ============================================================================
# LEADERBOARD CACHING (Sorted Sets)
# ============================================================================

def update_leaderboard_xp(user_id: int, xp: int):
    """Update user XP in leaderboard (Redis sorted set)"""
    redis.zadd(CacheKeys.LEADERBOARD_XP, {str(user_id): xp})


def get_leaderboard_top(limit: int = 100) -> list[dict]:
    """
    Get top users by XP

    Returns: [{"user_id": 123, "xp": 5000, "rank": 1}, ...]
    """
    top_users = redis.zrevrange(CacheKeys.LEADERBOARD_XP, 0, limit - 1, withscores=True)

    return [
        {
            'user_id': int(user_id),
            'xp': int(xp),
            'rank': rank + 1
        }
        for rank, (user_id, xp) in enumerate(top_users)
    ]


def get_user_leaderboard_rank(user_id: int) -> Optional[int]:
    """Get user's rank in leaderboard (1-indexed)"""
    rank = redis.zrevrank(CacheKeys.LEADERBOARD_XP, str(user_id))
    return rank + 1 if rank is not None else None


# ============================================================================
# SESSION CACHING
# ============================================================================

def cache_user_session(user_id: int, session_data: dict):
    """
    Cache user session data (JWT tokens, last activity, etc.)

    Used for:
    - Fast token validation
    - Active user tracking
    - Session management
    """
    key = CacheKeys.USER_SESSION.format(user_id=user_id)
    redis.setex(key, CacheTTL.USER_SESSION, json.dumps(session_data))


def get_cached_session(user_id: int) -> Optional[dict]:
    """Retrieve cached session"""
    key = CacheKeys.USER_SESSION.format(user_id=user_id)
    cached = redis.get(key)

    return json.loads(cached) if cached else None


def invalidate_user_session(user_id: int):
    """Invalidate session on logout"""
    key = CacheKeys.USER_SESSION.format(user_id=user_id)
    redis.delete(key)
    logger.info(f"🔓 Session invalidated for user {user_id}")


# ============================================================================
# UNREAD COUNT CACHING
# ============================================================================

def increment_unread_count(user_id: int, girl_id: str):
    """Increment unread message counter"""
    key = CacheKeys.UNREAD_COUNT.format(user_id=user_id, girl_id=girl_id)
    redis.incr(key)
    redis.expire(key, CacheTTL.UNREAD_COUNT * 2)  # Auto-expire if not accessed


def reset_unread_count(user_id: int, girl_id: str):
    """Reset unread count (when user opens conversation)"""
    key = CacheKeys.UNREAD_COUNT.format(user_id=user_id, girl_id=girl_id)
    redis.delete(key)


def get_unread_count(user_id: int, girl_id: str) -> int:
    """Get unread message count"""
    key = CacheKeys.UNREAD_COUNT.format(user_id=user_id, girl_id=girl_id)
    count = redis.get(key)

    return int(count) if count else 0


# ============================================================================
# TYPING INDICATOR CACHING
# ============================================================================

def set_typing_status(user_id: int, girl_id: str, is_typing: bool):
    """Set typing indicator (short-lived)"""
    key = CacheKeys.TYPING_STATUS.format(user_id=user_id, girl_id=girl_id)

    if is_typing:
        redis.setex(key, CacheTTL.TYPING_STATUS, '1')
    else:
        redis.delete(key)


def is_typing(user_id: int, girl_id: str) -> bool:
    """Check if girl is typing"""
    key = CacheKeys.TYPING_STATUS.format(user_id=user_id, girl_id=girl_id)
    return redis.exists(key) > 0


# ============================================================================
# MEMORY/CONTEXT CACHING
# ============================================================================

def cache_recent_context(user_id: int, girl_id: str, context: str):
    """
    Cache recent conversation context for AI

    Stores last 5-10 message summary for fast AI context retrieval
    """
    key = CacheKeys.RECENT_CONTEXT.format(user_id=user_id, girl_id=girl_id)
    redis.setex(key, CacheTTL.CONVERSATION_LATEST, context)


def get_recent_context(user_id: int, girl_id: str) -> Optional[str]:
    """Retrieve cached context"""
    key = CacheKeys.RECENT_CONTEXT.format(user_id=user_id, girl_id=girl_id)
    return redis.get(key)


# ============================================================================
# CACHE WARMING (Pre-populate on startup)
# ============================================================================

async def warm_cache_for_user(user_id: int, db):
    """
    Pre-populate cache with user's hot data

    Called on:
    - User login
    - First API request after inactivity
    """
    from shared.models.user import User
    from shared.models.match import Match

    # Warm user profile
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user_data = {
            'id': user.id,
            'username': user.username,
            'tokens': user.tokens,
            'xp': user.xp,
            'level': user.level
        }
        key = CacheKeys.USER_PROFILE.format(user_id=user_id)
        redis.setex(key, CacheTTL.USER_PROFILE, json.dumps(user_data))

    # Warm matches
    matches = db.query(Match).filter(Match.user_id == user_id, Match.is_active == True).all()
    cache_user_matches(user_id, matches)

    # Update leaderboard
    if user:
        update_leaderboard_xp(user.id, user.xp)

    logger.info(f"🔥 Cache warmed for user {user_id}")


# ============================================================================
# CACHE STATISTICS
# ============================================================================

def get_cache_stats() -> dict:
    """Get Redis cache statistics"""
    info = redis.info('stats')

    return {
        'total_keys': redis.dbsize(),
        'hit_rate': info.get('keyspace_hits', 0) / (info.get('keyspace_hits', 0) + info.get('keyspace_misses', 1)),
        'used_memory_human': redis.info('memory').get('used_memory_human'),
        'connected_clients': redis.info('clients').get('connected_clients'),
    }
