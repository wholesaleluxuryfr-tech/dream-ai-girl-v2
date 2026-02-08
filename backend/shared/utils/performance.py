"""
Performance optimization utilities

Caching, query optimization, response compression, and monitoring
"""

import time
import functools
import hashlib
import json
from typing import Callable, Any, Optional
from contextlib import contextmanager
import redis
from sqlalchemy import event
from sqlalchemy.engine import Engine
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# QUERY PERFORMANCE MONITORING
# ============================================================================

class QueryPerformanceMonitor:
    """Monitor and log slow database queries"""

    def __init__(self, slow_query_threshold_ms: float = 100):
        self.slow_query_threshold_ms = slow_query_threshold_ms
        self.query_stats = {}

    def setup_listeners(self, engine: Engine):
        """Setup SQLAlchemy event listeners for query monitoring"""

        @event.listens_for(engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(time.time())

        @event.listens_for(engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = time.time() - conn.info['query_start_time'].pop()
            total_time_ms = total_time * 1000

            # Log slow queries
            if total_time_ms > self.slow_query_threshold_ms:
                logger.warning(
                    f"Slow query detected ({total_time_ms:.2f}ms): {statement[:200]}..."
                )

            # Track query stats
            query_key = statement[:100]
            if query_key not in self.query_stats:
                self.query_stats[query_key] = {
                    'count': 0,
                    'total_time': 0,
                    'max_time': 0,
                    'min_time': float('inf')
                }

            stats = self.query_stats[query_key]
            stats['count'] += 1
            stats['total_time'] += total_time_ms
            stats['max_time'] = max(stats['max_time'], total_time_ms)
            stats['min_time'] = min(stats['min_time'], total_time_ms)

    def get_stats(self):
        """Get aggregated query statistics"""
        return self.query_stats


# ============================================================================
# ADVANCED CACHING
# ============================================================================

class CacheManager:
    """Advanced caching with Redis"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from function arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return f"cache:{hashlib.md5(key_data.encode()).hexdigest()}"

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            data = self.redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        return None

    def set(self, key: str, value: Any, ttl: int = 900):
        """Set value in cache with TTL"""
        try:
            self.redis.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.error(f"Cache set error: {e}")

    def delete(self, key: str):
        """Delete key from cache"""
        try:
            self.redis.delete(key)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")

    def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
        except Exception as e:
            logger.error(f"Cache delete pattern error: {e}")

    def cached(self, ttl: int = 900, prefix: str = "fn"):
        """Decorator for caching function results"""
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = self.cache_key(f"{prefix}:{func.__name__}", *args, **kwargs)

                # Try to get from cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Call function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)

                return result
            return wrapper
        return decorator


# ============================================================================
# REQUEST BATCHING
# ============================================================================

class BatchProcessor:
    """Batch multiple requests together for efficiency"""

    def __init__(self, batch_size: int = 10, batch_timeout_ms: int = 100):
        self.batch_size = batch_size
        self.batch_timeout_ms = batch_timeout_ms
        self.pending_requests = []
        self.batch_start_time = None

    def add_request(self, request_data: dict) -> Any:
        """Add request to batch"""
        self.pending_requests.append(request_data)

        if self.batch_start_time is None:
            self.batch_start_time = time.time()

        # Process batch if full or timeout reached
        if (len(self.pending_requests) >= self.batch_size or
            (time.time() - self.batch_start_time) * 1000 >= self.batch_timeout_ms):
            return self.process_batch()

    def process_batch(self) -> list:
        """Process accumulated requests in batch"""
        if not self.pending_requests:
            return []

        batch = self.pending_requests
        self.pending_requests = []
        self.batch_start_time = None

        # Process batch (override in subclass)
        return self._process(batch)

    def _process(self, batch: list) -> list:
        """Override this method to implement batch processing"""
        raise NotImplementedError


# ============================================================================
# RESPONSE COMPRESSION
# ============================================================================

def should_compress_response(content_type: str, size: int) -> bool:
    """Determine if response should be compressed"""
    compressible_types = [
        'application/json',
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
    ]

    # Only compress if size > 1KB
    return any(ct in content_type for ct in compressible_types) and size > 1024


# ============================================================================
# DATABASE QUERY OPTIMIZER
# ============================================================================

class QueryOptimizer:
    """Optimize database queries for better performance"""

    @staticmethod
    def optimize_pagination(query, page: int, page_size: int):
        """Optimize pagination queries"""
        # Use offset/limit efficiently
        offset = (page - 1) * page_size
        return query.offset(offset).limit(page_size)

    @staticmethod
    def optimize_join_queries(query, eager_load_relations: list):
        """Use eager loading to avoid N+1 queries"""
        from sqlalchemy.orm import joinedload

        for relation in eager_load_relations:
            query = query.options(joinedload(relation))

        return query

    @staticmethod
    def optimize_count_query(query):
        """Optimize count queries by avoiding loading full objects"""
        from sqlalchemy import func
        return query.with_entities(func.count()).scalar()


# ============================================================================
# MEMORY PROFILING
# ============================================================================

@contextmanager
def memory_profiler(label: str = "operation"):
    """Context manager to profile memory usage"""
    import tracemalloc

    tracemalloc.start()
    start_time = time.time()

    try:
        yield
    finally:
        current, peak = tracemalloc.get_traced_memory()
        elapsed_time = time.time() - start_time

        logger.info(
            f"Memory profile [{label}]: "
            f"Current={current / 1024 / 1024:.2f}MB, "
            f"Peak={peak / 1024 / 1024:.2f}MB, "
            f"Time={elapsed_time:.2f}s"
        )

        tracemalloc.stop()


# ============================================================================
# PERFORMANCE TIMING
# ============================================================================

class PerformanceTimer:
    """Context manager and decorator for timing operations"""

    def __init__(self, label: str = "operation", log_slow: bool = True, threshold_ms: float = 100):
        self.label = label
        self.log_slow = log_slow
        self.threshold_ms = threshold_ms
        self.start_time = None
        self.elapsed_ms = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_ms = (time.time() - self.start_time) * 1000

        if self.log_slow and self.elapsed_ms > self.threshold_ms:
            logger.warning(f"Slow operation [{self.label}]: {self.elapsed_ms:.2f}ms")
        else:
            logger.debug(f"Operation [{self.label}]: {self.elapsed_ms:.2f}ms")

    @staticmethod
    def timed(label: str = None):
        """Decorator for timing function execution"""
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                func_label = label or func.__name__
                with PerformanceTimer(func_label):
                    return func(*args, **kwargs)
            return wrapper
        return decorator


# ============================================================================
# CONNECTION POOLING OPTIMIZER
# ============================================================================

class ConnectionPoolOptimizer:
    """Optimize database connection pool settings"""

    @staticmethod
    def get_optimal_pool_size(concurrent_requests: int = 100) -> dict:
        """Calculate optimal pool size based on expected load"""
        # Formula: pool_size = (concurrent_requests / avg_request_time) * safety_factor
        return {
            'pool_size': min(concurrent_requests // 10, 50),  # Max 50 connections
            'max_overflow': min(concurrent_requests // 5, 100),  # Max 100 overflow
            'pool_timeout': 30,  # 30 seconds timeout
            'pool_recycle': 3600,  # Recycle connections after 1 hour
            'pool_pre_ping': True,  # Test connections before use
        }


# ============================================================================
# RATE LIMITING HELPERS
# ============================================================================

class RateLimiter:
    """Token bucket rate limiter"""

    def __init__(self, redis_client: redis.Redis, rate: int, per: int):
        self.redis = redis_client
        self.rate = rate  # requests
        self.per = per  # seconds

    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed under rate limit"""
        now = time.time()
        window_key = f"ratelimit:{key}:{int(now // self.per)}"

        try:
            current = self.redis.incr(window_key)
            if current == 1:
                self.redis.expire(window_key, self.per)

            return current <= self.rate
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            return True  # Fail open


# ============================================================================
# LAZY LOADING
# ============================================================================

class LazyLoader:
    """Lazy load heavy objects only when needed"""

    def __init__(self, loader_func: Callable):
        self.loader_func = loader_func
        self._value = None
        self._loaded = False

    def __call__(self):
        if not self._loaded:
            self._value = self.loader_func()
            self._loaded = True
        return self._value

    def reset(self):
        """Reset lazy loader"""
        self._value = None
        self._loaded = False


# ============================================================================
# OBJECT POOL
# ============================================================================

class ObjectPool:
    """Pool expensive objects for reuse"""

    def __init__(self, factory: Callable, max_size: int = 10):
        self.factory = factory
        self.max_size = max_size
        self.pool = []
        self.in_use = set()

    def acquire(self):
        """Acquire object from pool"""
        if self.pool:
            obj = self.pool.pop()
        else:
            obj = self.factory()

        self.in_use.add(id(obj))
        return obj

    def release(self, obj):
        """Return object to pool"""
        obj_id = id(obj)
        if obj_id in self.in_use:
            self.in_use.remove(obj_id)

            if len(self.pool) < self.max_size:
                self.pool.append(obj)

    @contextmanager
    def use(self):
        """Context manager for using pooled object"""
        obj = self.acquire()
        try:
            yield obj
        finally:
            self.release(obj)
