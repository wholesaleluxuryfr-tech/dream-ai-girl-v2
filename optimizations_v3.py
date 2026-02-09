"""
Dream AI Girl V3 - Performance Optimizations
Caching, compression, lazy loading, batch requests, DB optimization
"""

import time
import hashlib
import json
import gzip
from functools import wraps, lru_cache
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from collections import OrderedDict

# ============================================================
# INTELLIGENT CACHING SYSTEM
# ============================================================

class SmartCache:
    """Multi-level caching with TTL and smart invalidation"""

    def __init__(self, max_size: int = 1000):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.ttl = {}  # Time to live for each key
        self.hit_count = 0
        self.miss_count = 0

    def get(self, key: str) -> Optional[Any]:
        """Get from cache with TTL check"""
        if key in self.cache:
            # Check if expired
            if key in self.ttl and datetime.now() > self.ttl[key]:
                del self.cache[key]
                del self.ttl[key]
                self.miss_count += 1
                return None

            # Move to end (LRU)
            self.cache.move_to_end(key)
            self.hit_count += 1
            return self.cache[key]

        self.miss_count += 1
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set cache with TTL"""
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.max_size:
                # Remove oldest
                oldest = next(iter(self.cache))
                del self.cache[oldest]
                if oldest in self.ttl:
                    del self.ttl[oldest]

        self.cache[key] = value
        self.ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)

    def invalidate(self, pattern: str = None):
        """Invalidate cache by pattern"""
        if pattern is None:
            self.cache.clear()
            self.ttl.clear()
        else:
            keys_to_delete = [k for k in self.cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self.cache[key]
                if key in self.ttl:
                    del self.ttl[key]

    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total = self.hit_count + self.miss_count
        hit_rate = (self.hit_count / total * 100) if total > 0 else 0
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hit_count,
            "misses": self.miss_count,
            "hit_rate": f"{hit_rate:.2f}%"
        }

# Global cache instances
RESPONSE_CACHE = SmartCache(max_size=500)  # API responses
GIRL_DATA_CACHE = SmartCache(max_size=100)  # AI Girl data
IMAGE_CACHE = SmartCache(max_size=200)  # Image URLs

# ============================================================
# CACHING DECORATORS
# ============================================================

def cache_response(ttl: int = 300, key_prefix: str = ""):
    """Decorator to cache API responses"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{f.__name__}:{hashlib.md5(str(args).encode() + str(kwargs).encode()).hexdigest()}"

            # Try to get from cache
            cached = RESPONSE_CACHE.get(cache_key)
            if cached is not None:
                return cached

            # Execute function
            result = f(*args, **kwargs)

            # Cache result
            RESPONSE_CACHE.set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

def cache_girl_data(ttl: int = 600):
    """Cache AI Girl data (changes rarely)"""
    def decorator(f):
        @wraps(f)
        def wrapper(girl_id, *args, **kwargs):
            cache_key = f"girl:{girl_id}"

            cached = GIRL_DATA_CACHE.get(cache_key)
            if cached is not None:
                return cached

            result = f(girl_id, *args, **kwargs)
            GIRL_DATA_CACHE.set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

# ============================================================
# DATABASE OPTIMIZATIONS
# ============================================================

class DatabaseOptimizer:
    """Database query optimization utilities"""

    @staticmethod
    def batch_get_girls(girl_ids: List[str]) -> Dict:
        """Batch get multiple girls in one query"""
        # Instead of N queries, do 1 query
        # Example: SELECT * FROM girls WHERE id IN (?,?,?)
        pass

    @staticmethod
    def preload_relationships(query_result):
        """Eager load relationships to avoid N+1"""
        # Example: Load all matches with their girls in one go
        pass

    @staticmethod
    def create_indexes():
        """Create performance indexes"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_chat_user_girl ON chat_messages(user_id, girl_id)",
            "CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON chat_messages(timestamp DESC)",
            "CREATE INDEX IF NOT EXISTS idx_photos_user_girl ON received_photos(user_id, girl_id)",
        ]
        return indexes

    @staticmethod
    def optimize_query(query_type: str, params: Dict) -> str:
        """Optimize queries based on access patterns"""
        optimizations = {
            "get_recent_messages": """
                SELECT * FROM chat_messages
                WHERE user_id = ? AND girl_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """,
            "get_girl_stats": """
                SELECT
                    g.*,
                    COUNT(DISTINCT m.user_id) as total_matches,
                    AVG(m.affection) as avg_affection
                FROM girls g
                LEFT JOIN matches m ON g.id = m.girl_id
                WHERE g.id = ?
                GROUP BY g.id
            """
        }
        return optimizations.get(query_type, "")

# ============================================================
# REQUEST BATCHING
# ============================================================

class RequestBatcher:
    """Batch multiple API requests into one"""

    def __init__(self, max_batch_size: int = 10, max_wait_ms: int = 100):
        self.pending = []
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self.last_flush = time.time()

    def add_request(self, request_data: Dict):
        """Add request to batch"""
        self.pending.append(request_data)

        if len(self.pending) >= self.max_batch_size:
            return self.flush()

        if (time.time() - self.last_flush) * 1000 > self.max_wait_ms:
            return self.flush()

        return None

    def flush(self) -> List:
        """Execute all pending requests"""
        if not self.pending:
            return []

        batch = self.pending
        self.pending = []
        self.last_flush = time.time()

        # Execute batch
        results = self._execute_batch(batch)
        return results

    def _execute_batch(self, batch: List[Dict]) -> List:
        """Execute batched requests"""
        # Implementation depends on your API
        # Could batch multiple AI requests, image generations, etc.
        pass

# ============================================================
# COMPRESSION UTILITIES
# ============================================================

def compress_response(data: Any) -> bytes:
    """Compress JSON response with gzip"""
    json_str = json.dumps(data)
    compressed = gzip.compress(json_str.encode('utf-8'))
    return compressed

def decompress_response(compressed: bytes) -> Any:
    """Decompress gzip response"""
    decompressed = gzip.decompress(compressed)
    return json.loads(decompressed.decode('utf-8'))

def compress_middleware(f):
    """Middleware to compress responses"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        result = f(*args, **kwargs)

        # Check if client supports gzip
        accept_encoding = request.headers.get('Accept-Encoding', '')
        if 'gzip' in accept_encoding and isinstance(result, dict):
            compressed = compress_response(result)
            response = make_response(compressed)
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Type'] = 'application/json'
            return response

        return result
    return wrapper

# ============================================================
# LAZY LOADING UTILITIES
# ============================================================

class LazyLoader:
    """Lazy load images and heavy content"""

    @staticmethod
    def generate_placeholder(width: int, height: int, color: str = "E91E63") -> str:
        """Generate placeholder image URL"""
        return f"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}'%3E%3Crect width='100%25' height='100%25' fill='%23{color}'/%3E%3C/svg%3E"

    @staticmethod
    def create_lazy_load_config() -> Dict:
        """Configuration for lazy loading"""
        return {
            "root_margin": "50px",  # Load 50px before entering viewport
            "threshold": 0.01,
            "placeholder_color": "1A1A24"
        }

    @staticmethod
    def optimize_image_url(url: str, width: int = None, quality: int = 85) -> str:
        """Generate optimized image URL"""
        # If using image CDN (like Cloudinary, Imgix)
        if width:
            return f"{url}?w={width}&q={quality}&auto=format"
        return url

# ============================================================
# PERFORMANCE MONITORING
# ============================================================

class PerformanceMonitor:
    """Monitor and track performance metrics"""

    def __init__(self):
        self.metrics = {
            "api_calls": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_response_time": 0,
            "slow_queries": []
        }
        self.response_times = []

    def track_request(self, endpoint: str, duration: float):
        """Track API request performance"""
        self.metrics["api_calls"] += 1
        self.response_times.append(duration)

        # Keep last 100 response times
        if len(self.response_times) > 100:
            self.response_times.pop(0)

        # Calculate average
        self.metrics["avg_response_time"] = sum(self.response_times) / len(self.response_times)

        # Track slow queries
        if duration > 1.0:  # Slower than 1 second
            self.metrics["slow_queries"].append({
                "endpoint": endpoint,
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            })

    def get_stats(self) -> Dict:
        """Get performance statistics"""
        return {
            **self.metrics,
            "cache_hit_rate": f"{(self.metrics['cache_hits'] / max(1, self.metrics['cache_hits'] + self.metrics['cache_misses'])) * 100:.2f}%"
        }

# Global monitor
PERFORMANCE_MONITOR = PerformanceMonitor()

def monitor_performance(f):
    """Decorator to monitor endpoint performance"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = f(*args, **kwargs)
        duration = time.time() - start

        PERFORMANCE_MONITOR.track_request(f.__name__, duration)

        return result
    return wrapper

# ============================================================
# MEMORY OPTIMIZATION
# ============================================================

class MemoryOptimizer:
    """Optimize memory usage"""

    @staticmethod
    def cleanup_old_data(db_connection, days: int = 30):
        """Clean up old data to save space"""
        queries = [
            f"DELETE FROM chat_messages WHERE timestamp < datetime('now', '-{days} days')",
            f"DELETE FROM sessions WHERE created_at < datetime('now', '-7 days')",
            "VACUUM",  # Reclaim space
        ]
        return queries

    @staticmethod
    def optimize_json_storage(data: Dict) -> str:
        """Optimize JSON storage (remove whitespace)"""
        return json.dumps(data, separators=(',', ':'))

    @staticmethod
    def paginate_results(query, page: int = 1, per_page: int = 20):
        """Paginate large result sets"""
        offset = (page - 1) * per_page
        # Add LIMIT and OFFSET to query
        return f"{query} LIMIT {per_page} OFFSET {offset}"

# ============================================================
# RATE LIMITING OPTIMIZATION
# ============================================================

class SmartRateLimiter:
    """Smart rate limiting with burst allowance"""

    def __init__(self, requests_per_minute: int = 60, burst_size: int = 10):
        self.rpm = requests_per_minute
        self.burst_size = burst_size
        self.buckets = {}  # user_id: [timestamps]

    def is_allowed(self, user_id: str) -> bool:
        """Check if request is allowed"""
        now = time.time()

        if user_id not in self.buckets:
            self.buckets[user_id] = []

        # Clean old timestamps
        self.buckets[user_id] = [
            ts for ts in self.buckets[user_id]
            if now - ts < 60  # Last minute
        ]

        # Check if within limit
        if len(self.buckets[user_id]) < self.rpm:
            self.buckets[user_id].append(now)
            return True

        return False

    def get_retry_after(self, user_id: str) -> int:
        """Get seconds until user can retry"""
        if user_id not in self.buckets or not self.buckets[user_id]:
            return 0

        oldest = min(self.buckets[user_id])
        return max(0, int(60 - (time.time() - oldest)))

# ============================================================
# EXAMPLE USAGE IN FLASK APP
# ============================================================

"""
# In your Flask app:

from optimizations_v3 import (
    cache_response,
    cache_girl_data,
    compress_middleware,
    monitor_performance,
    RESPONSE_CACHE,
    GIRL_DATA_CACHE,
    DatabaseOptimizer
)

# Apply caching to API endpoints
@app.route('/api/girls')
@cache_response(ttl=600, key_prefix="girls")
@monitor_performance
def get_girls():
    # This will be cached for 10 minutes
    girls = get_all_girls_from_db()
    return jsonify(girls)

@app.route('/api/girl/<girl_id>')
@cache_girl_data(ttl=600)
@monitor_performance
def get_girl(girl_id):
    girl = get_girl_from_db(girl_id)
    return jsonify(girl)

# Compress large responses
@app.route('/api/chat/history/<girl_id>')
@compress_middleware
@monitor_performance
def get_chat_history(girl_id):
    history = get_large_chat_history(girl_id)
    return jsonify(history)

# Monitor performance
@app.route('/api/admin/stats')
def get_performance_stats():
    return jsonify({
        "cache": RESPONSE_CACHE.get_stats(),
        "performance": PERFORMANCE_MONITOR.get_stats()
    })

# Cache invalidation on data change
@app.route('/api/girl/<girl_id>/update', methods=['POST'])
def update_girl(girl_id):
    update_girl_in_db(girl_id, request.json)

    # Invalidate cache
    GIRL_DATA_CACHE.invalidate(f"girl:{girl_id}")

    return jsonify({"success": True})
"""

# ============================================================
# FRONTEND OPTIMIZATIONS (JavaScript)
# ============================================================

FRONTEND_OPTIMIZATIONS_JS = """
// Lazy Loading Images
const lazyLoadImages = () => {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });

    document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
    });
};

// Debounce expensive operations
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Request batching
class RequestBatcher {
    constructor(maxWait = 100) {
        this.queue = [];
        this.maxWait = maxWait;
        this.timeout = null;
    }

    add(request) {
        this.queue.push(request);

        if (!this.timeout) {
            this.timeout = setTimeout(() => this.flush(), this.maxWait);
        }

        if (this.queue.length >= 10) {
            this.flush();
        }
    }

    async flush() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0);
        clearTimeout(this.timeout);
        this.timeout = null;

        // Send batch request
        const response = await fetch('/api/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: batch })
        });

        return response.json();
    }
}

// LocalStorage caching
const LocalCache = {
    set(key, value, ttl = 300) {
        const item = {
            value,
            expiry: Date.now() + (ttl * 1000)
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    get(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }

        return item.value;
    }
};

// Preload critical resources
const preloadResources = () => {
    // Preload fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.as = 'font';
    fontLink.href = '/fonts/Inter-Regular.woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);

    // Prefetch likely next pages
    const prefetchLinks = ['/api/girls', '/api/matches'];
    prefetchLinks.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    });
};

// Initialize all optimizations
document.addEventListener('DOMContentLoaded', () => {
    lazyLoadImages();
    preloadResources();
});
"""
