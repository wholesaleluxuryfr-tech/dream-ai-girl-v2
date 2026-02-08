"""
Centralized configuration management using Pydantic Settings.
Loads configuration from environment variables.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # ============================================
    # APPLICATION
    # ============================================
    APP_NAME: str = "Dream AI Girl"
    ENVIRONMENT: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = Field(default=True)
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")

    # ============================================
    # SECURITY
    # ============================================
    SECRET_KEY: str = Field(..., min_length=32)
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=5)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, ge=1)

    # ============================================
    # DATABASE
    # ============================================
    POSTGRES_URL: str = Field(..., description="PostgreSQL connection URL")
    REDIS_URL: str = Field(..., description="Redis connection URL")
    MONGODB_URL: Optional[str] = Field(None, description="MongoDB connection URL")

    # Database pool settings
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DB_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DB_POOL_TIMEOUT: int = Field(default=30, ge=5)
    DB_POOL_RECYCLE: int = Field(default=3600, ge=300)

    # ============================================
    # REDIS CACHE
    # ============================================
    REDIS_TTL_SHORT: int = Field(default=300, description="5 minutes")
    REDIS_TTL_MEDIUM: int = Field(default=900, description="15 minutes")
    REDIS_TTL_LONG: int = Field(default=3600, description="1 hour")
    REDIS_TTL_SESSION: int = Field(default=2592000, description="30 days")

    # ============================================
    # MICROSERVICES URLs
    # ============================================
    AUTH_SERVICE_URL: str = Field(default="http://auth-service:8001")
    CHAT_SERVICE_URL: str = Field(default="http://chat-service:8002")
    AI_SERVICE_URL: str = Field(default="http://ai-service:8003")
    MEDIA_SERVICE_URL: str = Field(default="http://media-service:8004")
    RECOMMENDATION_SERVICE_URL: str = Field(default="http://recommendation-service:8005")
    PAYMENT_SERVICE_URL: str = Field(default="http://payment-service:8006")

    # ============================================
    # AI SERVICES
    # ============================================
    # OpenRouter (chat AI)
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    OPENROUTER_MODEL: str = Field(default="mistralai/mistral-large-2")

    # Advanced AI Prompts (Chain-of-Thought reasoning, context awareness)
    USE_ADVANCED_AI_PROMPTS: bool = Field(
        default=True,
        description="Enable advanced prompts with COT reasoning and context awareness"
    )
    ADVANCED_PROMPTS_TEMPERATURE: float = Field(
        default=1.0,
        ge=0.0,
        le=2.0,
        description="Temperature for advanced prompts (higher = more creative)"
    )
    ADVANCED_PROMPTS_MAX_TOKENS: int = Field(
        default=180,
        ge=50,
        le=500,
        description="Max tokens for advanced prompt responses"
    )
    ENABLE_COT_REASONING: bool = Field(
        default=True,
        description="Include Chain-of-Thought reasoning in prompts"
    )
    ENABLE_PROACTIVE_MESSAGES: bool = Field(
        default=True,
        description="Allow AI to reach out proactively if user is inactive"
    )

    # Replicate (image generation fallback)
    REPLICATE_API_TOKEN: Optional[str] = None

    # ElevenLabs (voice TTS)
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_MODEL: str = Field(default="eleven_multilingual_v2")

    # Pinecone (vector database)
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_ENVIRONMENT: str = Field(default="us-west1-gcp")
    PINECONE_INDEX_NAME: str = Field(default="dream-ai-memories")

    # Promptchan (legacy NSFW image generation)
    PROMPTCHAN_KEY: Optional[str] = None

    # ============================================
    # MEDIA & STORAGE
    # ============================================
    # Supabase (legacy - migration to S3)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = Field(default="dream-ai-media")
    AWS_REGION: str = Field(default="us-east-1")
    AWS_CLOUDFRONT_DOMAIN: Optional[str] = None

    # Cloudflare
    CLOUDFLARE_ACCOUNT_ID: Optional[str] = None
    CLOUDFLARE_API_TOKEN: Optional[str] = None
    CLOUDFLARE_ZONE_ID: Optional[str] = None

    # ============================================
    # PAYMENT
    # ============================================
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Stripe price IDs (from Stripe dashboard)
    STRIPE_PREMIUM_PRICE_ID: str = Field(default="price_premium_monthly")
    STRIPE_ELITE_PRICE_ID: str = Field(default="price_elite_monthly")

    # Subscription prices (EUR)
    PREMIUM_PRICE_MONTHLY: float = Field(default=9.99)
    ELITE_PRICE_MONTHLY: float = Field(default=19.99)

    # ============================================
    # ANALYTICS & MONITORING
    # ============================================
    SENTRY_DSN: Optional[str] = None
    MIXPANEL_TOKEN: Optional[str] = None
    DATADOG_API_KEY: Optional[str] = None

    # ============================================
    # RATE LIMITING
    # ============================================
    RATE_LIMIT_ENABLED: bool = Field(default=True)
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60, ge=10)
    RATE_LIMIT_BURST: int = Field(default=120, ge=20)

    # ============================================
    # CORS
    # ============================================
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )

    # ============================================
    # CELERY (task queue)
    # ============================================
    RABBITMQ_URL: str = Field(
        default="amqp://dreamai:dreamai_rabbit_dev@rabbitmq:5672/",
        description="RabbitMQ connection URL"
    )
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    @field_validator('CELERY_BROKER_URL', mode='before')
    @classmethod
    def set_celery_broker(cls, v, info):
        """Set Celery broker from RabbitMQ URL if not explicitly set"""
        return v or info.data.get('RABBITMQ_URL')

    @field_validator('CELERY_RESULT_BACKEND', mode='before')
    @classmethod
    def set_celery_backend(cls, v, info):
        """Set Celery result backend from Redis URL if not explicitly set"""
        return v or info.data.get('REDIS_URL')

    # ============================================
    # GAMIFICATION
    # ============================================
    XP_PER_MESSAGE: int = Field(default=5)
    XP_PER_PHOTO_RECEIVED: int = Field(default=20)
    XP_PER_VIDEO_RECEIVED: int = Field(default=50)
    XP_FOR_DAILY_LOGIN: int = Field(default=10)
    XP_FOR_LEVEL_UP: int = Field(default=100)  # Multiplier: level * XP_FOR_LEVEL_UP

    # ============================================
    # TOKENS & PRICING
    # ============================================
    # Free user limits
    FREE_MESSAGES_PER_DAY: int = Field(default=50)
    FREE_TOKENS_PER_WEEK: int = Field(default=100)

    # Token costs
    TOKEN_COST_PHOTO: int = Field(default=5)
    TOKEN_COST_VIDEO: int = Field(default=15)
    TOKEN_COST_SKIP_LEVEL: int = Field(default=10)
    TOKEN_COST_PREMIUM_SCENARIO: int = Field(default=20)

    # Token purchase packages (tokens, price in EUR)
    TOKEN_PACKAGES: dict[str, dict] = Field(
        default={
            "small": {"tokens": 100, "price": 4.99, "bonus": 0},
            "medium": {"tokens": 250, "price": 9.99, "bonus": 25},
            "large": {"tokens": 600, "price": 19.99, "bonus": 100},
            "mega": {"tokens": 1500, "price": 39.99, "bonus": 300},
        }
    )

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get singleton settings instance"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Convenience function for testing
def reset_settings():
    """Reset settings singleton (for testing)"""
    global _settings
    _settings = None
