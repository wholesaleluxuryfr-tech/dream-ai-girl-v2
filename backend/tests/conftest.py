"""
Pytest configuration and fixtures

Shared test fixtures and configuration for all tests
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import fakeredis
import sys
import os

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../shared"))

from shared.models.user import Base, User
from shared.utils.database import get_db


# ============================================================================
# DATABASE FIXTURES
# ============================================================================

@pytest.fixture(scope="function")
def test_db():
    """Create test database with in-memory SQLite"""
    # Use in-memory SQLite for fast tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def override_get_db(test_db):
    """Override get_db dependency for tests"""
    def _override_get_db():
        try:
            yield test_db
        finally:
            pass

    return _override_get_db


# ============================================================================
# REDIS FIXTURES
# ============================================================================

@pytest.fixture(scope="function")
def test_redis():
    """Create fake Redis client for tests"""
    redis_client = fakeredis.FakeStrictRedis()
    yield redis_client
    redis_client.flushall()


# ============================================================================
# API CLIENT FIXTURES
# ============================================================================

@pytest.fixture(scope="function")
def api_client(override_get_db):
    """Create test API client"""
    from services.api_gateway.app.main import app

    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    yield client

    # Clear overrides
    app.dependency_overrides.clear()


# ============================================================================
# USER FIXTURES
# ============================================================================

@pytest.fixture
def test_user(test_db):
    """Create test user"""
    from shared.utils.security import hash_password

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("TestPass123!"),
        age=25,
        subscription_tier="free",
        tokens=100,
        xp=0,
        level=1,
        is_active=True,
        is_verified=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def premium_user(test_db):
    """Create premium user"""
    from shared.utils.security import hash_password

    user = User(
        username="premiumuser",
        email="premium@example.com",
        password_hash=hash_password("TestPass123!"),
        age=28,
        subscription_tier="premium",
        tokens=500,
        xp=1500,
        level=5,
        is_active=True,
        is_verified=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def elite_user(test_db):
    """Create elite user"""
    from shared.utils.security import hash_password

    user = User(
        username="eliteuser",
        email="elite@example.com",
        password_hash=hash_password("TestPass123!"),
        age=30,
        subscription_tier="elite",
        tokens=10000,
        xp=5000,
        level=10,
        is_active=True,
        is_verified=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    return user


# ============================================================================
# AUTH FIXTURES
# ============================================================================

@pytest.fixture
def auth_headers(test_user):
    """Get authentication headers for test user"""
    from shared.utils.security import create_access_token

    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def premium_auth_headers(premium_user):
    """Get authentication headers for premium user"""
    from shared.utils.security import create_access_token

    token = create_access_token({"sub": str(premium_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def elite_auth_headers(elite_user):
    """Get authentication headers for elite user"""
    from shared.utils.security import create_access_token

    token = create_access_token({"sub": str(elite_user.id)})
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# DATA FIXTURES
# ============================================================================

@pytest.fixture
def sample_match(test_db, test_user):
    """Create sample match"""
    from shared.models.match import Match
    from datetime import datetime

    match = Match(
        user_id=test_user.id,
        girl_id="sophie_25",
        matched_at=datetime.utcnow(),
        affection_level=50
    )
    test_db.add(match)
    test_db.commit()
    test_db.refresh(match)

    return match


@pytest.fixture
def sample_messages(test_db, test_user):
    """Create sample chat messages"""
    from shared.models.chat import ChatMessage
    from datetime import datetime, timedelta

    messages = []
    for i in range(5):
        msg = ChatMessage(
            user_id=test_user.id,
            girl_id="sophie_25",
            sender="user" if i % 2 == 0 else "girl",
            content=f"Test message {i}",
            timestamp=datetime.utcnow() - timedelta(minutes=5-i),
            is_read=True
        )
        test_db.add(msg)
        messages.append(msg)

    test_db.commit()
    return messages


# ============================================================================
# MOCK FIXTURES
# ============================================================================

@pytest.fixture
def mock_openrouter(monkeypatch):
    """Mock OpenRouter API calls"""
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self.json_data = json_data
            self.status_code = status_code

        def json(self):
            return self.json_data

    def mock_post(*args, **kwargs):
        return MockResponse({
            "choices": [{
                "message": {
                    "content": "Salut ! Comment ça va ?"
                }
            }]
        })

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)


@pytest.fixture
def mock_stripe(monkeypatch):
    """Mock Stripe API calls"""
    class MockStripe:
        class Customer:
            @staticmethod
            def create(**kwargs):
                return {"id": "cus_test123"}

        class Subscription:
            @staticmethod
            def create(**kwargs):
                return {
                    "id": "sub_test123",
                    "status": "active",
                    "current_period_start": 1234567890,
                    "current_period_end": 1234567890 + 2592000
                }

    monkeypatch.setattr("stripe", MockStripe())


# ============================================================================
# CLEANUP
# ============================================================================

@pytest.fixture(autouse=True)
def cleanup():
    """Cleanup after each test"""
    yield
    # Cleanup code here if needed
