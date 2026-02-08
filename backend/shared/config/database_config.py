"""Advanced Database Configuration for Performance Optimization"""

from sqlalchemy import create_engine, event, pool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
import time
import logging
from contextlib import contextmanager
from typing import Generator

from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# CONNECTION POOLING (PgBouncer-style in-app)
# ============================================================================

def create_optimized_engine():
    """
    Creates SQLAlchemy engine with optimized connection pooling

    Performance targets:
    - Pool size: 20 connections (sufficient for 5 microservices)
    - Pool recycle: 3600s (avoid stale connections)
    - Pool pre-ping: True (check connection health)
    - Echo: False in production (avoid logging overhead)
    """

    engine_config = {
        'url': settings.DATABASE_URL,
        'poolclass': pool.QueuePool,

        # Connection pool settings
        'pool_size': 20,  # Base connections maintained
        'max_overflow': 10,  # Additional connections when needed (total max: 30)
        'pool_timeout': 30,  # Wait 30s for connection before timeout
        'pool_recycle': 3600,  # Recycle connections every hour
        'pool_pre_ping': True,  # Test connection before using (avoid stale connections)

        # Performance settings
        'echo': settings.DEBUG,  # SQL logging only in debug mode
        'echo_pool': False,  # Don't log pool checkouts
        'future': True,  # Use SQLAlchemy 2.0 style

        # Connection arguments
        'connect_args': {
            'connect_timeout': 10,
            'application_name': settings.APP_NAME,
            'options': '-c statement_timeout=30000',  # 30s query timeout
        }
    }

    engine = create_engine(**engine_config)

    # Add performance monitoring events
    setup_query_monitoring(engine)

    logger.info(f"✅ Database engine created with pool_size={engine_config['pool_size']}, max_overflow={engine_config['max_overflow']}")

    return engine


# ============================================================================
# QUERY PERFORMANCE MONITORING
# ============================================================================

def setup_query_monitoring(engine: Engine):
    """Setup events to monitor slow queries"""

    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault('query_start_time', []).append(time.time())

    @event.listens_for(engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total_time = time.time() - conn.info['query_start_time'].pop()

        # Log slow queries (>200ms)
        if total_time > 0.2:
            logger.warning(f"🐢 SLOW QUERY ({total_time:.3f}s): {statement[:200]}...")

        # Log very slow queries (>1s) with full details
        if total_time > 1.0:
            logger.error(f"🚨 VERY SLOW QUERY ({total_time:.3f}s):\n{statement}\nParameters: {parameters}")


# ============================================================================
# SESSION FACTORY WITH BEST PRACTICES
# ============================================================================

# Global engine and session factory
engine = create_optimized_engine()
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,  # Manual flush for better control
    bind=engine,
    expire_on_commit=False,  # Keep objects accessible after commit
)


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database sessions with automatic cleanup

    Usage:
        with get_db_context() as db:
            user = db.query(User).filter(User.id == 1).first()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI routes

    Usage:
        @app.get("/users/{user_id}")
        def get_user(user_id: int, db: Session = Depends(get_db)):
            return db.query(User).filter(User.id == user_id).first()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# BATCH OPERATIONS FOR BULK INSERTS
# ============================================================================

def bulk_insert_optimized(db: Session, model_class, data_list: list[dict], batch_size: int = 1000):
    """
    Optimized bulk insert with batching

    Performance: ~10x faster than individual inserts

    Args:
        db: Database session
        model_class: SQLAlchemy model
        data_list: List of dicts with column data
        batch_size: Number of records per batch

    Example:
        messages = [
            {"user_id": 1, "girl_id": "sophia", "content": "Hello"},
            {"user_id": 1, "girl_id": "sophia", "content": "How are you?"},
            # ... 1000 more
        ]
        bulk_insert_optimized(db, ChatMessage, messages)
    """

    total = len(data_list)
    for i in range(0, total, batch_size):
        batch = data_list[i:i + batch_size]
        db.bulk_insert_mappings(model_class, batch)
        db.flush()

    db.commit()
    logger.info(f"✅ Bulk inserted {total} {model_class.__name__} records in batches of {batch_size}")


def bulk_update_optimized(db: Session, model_class, data_list: list[dict], batch_size: int = 1000):
    """
    Optimized bulk update with batching

    Args:
        data_list: List of dicts with 'id' and columns to update

    Example:
        updates = [
            {"id": 1, "is_read": True},
            {"id": 2, "is_read": True},
            # ... more
        ]
        bulk_update_optimized(db, ChatMessage, updates)
    """

    total = len(data_list)
    for i in range(0, total, batch_size):
        batch = data_list[i:i + batch_size]
        db.bulk_update_mappings(model_class, batch)
        db.flush()

    db.commit()
    logger.info(f"✅ Bulk updated {total} {model_class.__name__} records")


# ============================================================================
# QUERY OPTIMIZATION UTILITIES
# ============================================================================

def optimize_query_with_load_options(query, *relationships):
    """
    Add eager loading to avoid N+1 queries

    Example:
        from sqlalchemy.orm import joinedload

        query = db.query(User)
        query = optimize_query_with_load_options(query,
            joinedload(User.matches),
            joinedload(User.subscription)
        )
    """
    for relationship in relationships:
        query = query.options(relationship)
    return query


def paginate_query(query, page: int = 1, per_page: int = 50):
    """
    Efficient pagination with total count

    Returns: (items, total_count, has_next)

    Example:
        query = db.query(ChatMessage).filter(...)
        messages, total, has_next = paginate_query(query, page=2, per_page=100)
    """

    # Get total count efficiently
    total = query.count()

    # Get paginated items
    offset = (page - 1) * per_page
    items = query.offset(offset).limit(per_page).all()

    has_next = offset + len(items) < total

    return items, total, has_next


# ============================================================================
# CONNECTION HEALTH CHECKS
# ============================================================================

def check_db_health() -> bool:
    """Check if database is reachable and healthy"""
    try:
        with get_db_context() as db:
            db.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"❌ Database health check failed: {e}")
        return False


def get_db_stats() -> dict:
    """Get database connection pool statistics"""
    return {
        'pool_size': engine.pool.size(),
        'checked_in': engine.pool.checkedin(),
        'checked_out': engine.pool.checkedout(),
        'overflow': engine.pool.overflow(),
        'total_connections': engine.pool.size() + engine.pool.overflow(),
    }


# ============================================================================
# QUERY PROFILING (Development only)
# ============================================================================

@contextmanager
def profile_query(query_name: str):
    """
    Profile query execution time

    Usage:
        with profile_query("get_conversation_history"):
            messages = db.query(ChatMessage).filter(...).all()
    """
    start = time.time()
    try:
        yield
    finally:
        elapsed = time.time() - start
        logger.info(f"⏱️  Query '{query_name}' took {elapsed:.3f}s")


# ============================================================================
# EXAMPLE OPTIMIZED QUERIES
# ============================================================================

def get_conversation_optimized(db: Session, user_id: int, girl_id: str, limit: int = 100):
    """
    Optimized conversation history query

    - Uses idx_messages_conversation index
    - Returns only needed columns
    - Limits results efficiently
    """
    from shared.models.chat import ChatMessage

    with profile_query("get_conversation"):
        messages = (
            db.query(
                ChatMessage.id,
                ChatMessage.sender,
                ChatMessage.content,
                ChatMessage.timestamp,
                ChatMessage.media_url,
                ChatMessage.is_read
            )
            .filter(ChatMessage.user_id == user_id, ChatMessage.girl_id == girl_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(limit)
            .all()
        )

    return messages


def get_matches_with_last_message(db: Session, user_id: int):
    """
    Get user's matches with last message timestamp

    - Uses idx_matches_user_id and idx_messages_conversation
    - Single optimized query with subquery
    """
    from shared.models.match import Match
    from shared.models.chat import ChatMessage
    from sqlalchemy import select, func

    # Subquery to get last message timestamp per girl
    subq = (
        select(
            ChatMessage.girl_id,
            func.max(ChatMessage.timestamp).label('last_msg_time')
        )
        .where(ChatMessage.user_id == user_id)
        .group_by(ChatMessage.girl_id)
        .subquery()
    )

    # Main query joining matches with last message time
    matches = (
        db.query(Match, subq.c.last_msg_time)
        .outerjoin(subq, Match.girl_id == subq.c.girl_id)
        .filter(Match.user_id == user_id, Match.is_active == True)
        .order_by(subq.c.last_msg_time.desc().nullslast())
        .all()
    )

    return matches
