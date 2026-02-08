"""
Analytics Service - Event tracking and metrics aggregation

Handles all analytics, monitoring, and metrics calculation
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import logging
import json

logger = logging.getLogger(__name__)


# ============================================================================
# EVENT TRACKING
# ============================================================================

class AnalyticsService:
    """Main analytics service"""

    # Event categories
    CATEGORY_USER = "user"
    CATEGORY_CHAT = "chat"
    CATEGORY_MATCH = "match"
    CATEGORY_MEDIA = "media"
    CATEGORY_PAYMENT = "payment"
    CATEGORY_GAMIFICATION = "gamification"
    CATEGORY_SCENARIO = "scenario"

    @classmethod
    def track_event(
        cls,
        db: Session,
        event_name: str,
        category: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        properties: Optional[Dict] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Track an analytics event

        Args:
            event_name: Name of the event (e.g., "signup_completed")
            category: Event category
            user_id: User ID (optional for anonymous events)
            session_id: Session ID
            properties: Custom event properties
            user_agent: User agent string
            ip_address: IP address

        Returns:
            Success boolean
        """
        try:
            from shared.models.analytics import UserEvent

            event = UserEvent(
                user_id=user_id,
                event_type=category,
                event_name=event_name,
                event_data=json.dumps(properties or {}),
                session_id=session_id,
                user_agent=user_agent,
                ip_address=ip_address,
                timestamp=datetime.utcnow()
            )

            db.add(event)
            db.commit()

            logger.info(f"Tracked event: {event_name} (category: {category}, user: {user_id})")
            return True

        except Exception as e:
            logger.error(f"Failed to track event: {e}")
            db.rollback()
            return False

    @classmethod
    def track_page_view(
        cls,
        db: Session,
        user_id: Optional[int],
        session_id: str,
        page_url: str,
        referrer: Optional[str] = None
    ) -> bool:
        """Track page view"""
        return cls.track_event(
            db,
            event_name="page_view",
            category="navigation",
            user_id=user_id,
            session_id=session_id,
            properties={
                "page_url": page_url,
                "referrer": referrer
            }
        )

    @classmethod
    def track_user_signup(
        cls,
        db: Session,
        user_id: int,
        session_id: str,
        signup_method: str = "email"
    ) -> bool:
        """Track user signup"""
        return cls.track_event(
            db,
            event_name="signup_completed",
            category=cls.CATEGORY_USER,
            user_id=user_id,
            session_id=session_id,
            properties={"signup_method": signup_method}
        )

    @classmethod
    def track_match_created(
        cls,
        db: Session,
        user_id: int,
        girl_id: str,
        session_id: Optional[str] = None
    ) -> bool:
        """Track match creation"""
        return cls.track_event(
            db,
            event_name="match_created",
            category=cls.CATEGORY_MATCH,
            user_id=user_id,
            session_id=session_id,
            properties={"girl_id": girl_id}
        )

    @classmethod
    def track_message_sent(
        cls,
        db: Session,
        user_id: int,
        girl_id: str,
        message_length: int,
        session_id: Optional[str] = None
    ) -> bool:
        """Track message sent"""
        return cls.track_event(
            db,
            event_name="message_sent",
            category=cls.CATEGORY_CHAT,
            user_id=user_id,
            session_id=session_id,
            properties={
                "girl_id": girl_id,
                "message_length": message_length
            }
        )

    @classmethod
    def track_photo_generated(
        cls,
        db: Session,
        user_id: int,
        girl_id: str,
        generation_time_ms: float,
        session_id: Optional[str] = None
    ) -> bool:
        """Track photo generation"""
        return cls.track_event(
            db,
            event_name="photo_generated",
            category=cls.CATEGORY_MEDIA,
            user_id=user_id,
            session_id=session_id,
            properties={
                "girl_id": girl_id,
                "generation_time_ms": generation_time_ms
            }
        )

    @classmethod
    def track_premium_conversion(
        cls,
        db: Session,
        user_id: int,
        tier: str,
        price: float,
        session_id: Optional[str] = None
    ) -> bool:
        """Track premium subscription"""
        return cls.track_event(
            db,
            event_name="premium_converted",
            category=cls.CATEGORY_PAYMENT,
            user_id=user_id,
            session_id=session_id,
            properties={
                "tier": tier,
                "price": price
            }
        )

    @classmethod
    def track_achievement_unlocked(
        cls,
        db: Session,
        user_id: int,
        achievement_id: int,
        achievement_name: str,
        session_id: Optional[str] = None
    ) -> bool:
        """Track achievement unlock"""
        return cls.track_event(
            db,
            event_name="achievement_unlocked",
            category=cls.CATEGORY_GAMIFICATION,
            user_id=user_id,
            session_id=session_id,
            properties={
                "achievement_id": achievement_id,
                "achievement_name": achievement_name
            }
        )

    @classmethod
    def track_scenario_started(
        cls,
        db: Session,
        user_id: int,
        scenario_id: int,
        girl_id: str,
        cost_tokens: int,
        session_id: Optional[str] = None
    ) -> bool:
        """Track scenario start"""
        return cls.track_event(
            db,
            event_name="scenario_started",
            category=cls.CATEGORY_SCENARIO,
            user_id=user_id,
            session_id=session_id,
            properties={
                "scenario_id": scenario_id,
                "girl_id": girl_id,
                "cost_tokens": cost_tokens
            }
        )


# ============================================================================
# METRICS AGGREGATION
# ============================================================================

class MetricsService:
    """Metrics calculation and aggregation"""

    @classmethod
    def calculate_daily_metrics(cls, db: Session, date: datetime) -> Dict:
        """
        Calculate daily metrics for a specific date

        Returns comprehensive metrics dict
        """
        from shared.models.analytics import UserEvent
        from shared.models.user import User

        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)

        metrics = {}

        # Daily Active Users
        dau_query = db.query(func.count(func.distinct(UserEvent.user_id))).filter(
            and_(
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date,
                UserEvent.user_id.isnot(None)
            )
        )
        metrics['daily_active_users'] = dau_query.scalar() or 0

        # New Signups
        signup_query = db.query(func.count(UserEvent.id)).filter(
            and_(
                UserEvent.event_name == 'signup_completed',
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date
            )
        )
        metrics['new_signups'] = signup_query.scalar() or 0

        # Total Messages
        messages_query = db.query(func.count(UserEvent.id)).filter(
            and_(
                UserEvent.event_name == 'message_sent',
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date
            )
        )
        metrics['total_messages'] = messages_query.scalar() or 0

        # Total Matches
        matches_query = db.query(func.count(UserEvent.id)).filter(
            and_(
                UserEvent.event_name == 'match_created',
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date
            )
        )
        metrics['total_matches'] = matches_query.scalar() or 0

        # Total Photos Generated
        photos_query = db.query(func.count(UserEvent.id)).filter(
            and_(
                UserEvent.event_name == 'photo_generated',
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date
            )
        )
        metrics['total_photos'] = photos_query.scalar() or 0

        # Premium Conversions
        premium_query = db.query(func.count(UserEvent.id)).filter(
            and_(
                UserEvent.event_name == 'premium_converted',
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date
            )
        )
        metrics['premium_conversions'] = premium_query.scalar() or 0

        # Scenarios Played
        scenarios_query = db.query(func.count(UserEvent.id)).filter(
            and_(
                UserEvent.event_name == 'scenario_started',
                UserEvent.timestamp >= start_date,
                UserEvent.timestamp < end_date
            )
        )
        metrics['total_scenarios'] = scenarios_query.scalar() or 0

        return metrics

    @classmethod
    def get_user_cohort_retention(
        cls,
        db: Session,
        cohort_date: datetime,
        days_after: int = 7
    ) -> float:
        """
        Calculate retention rate for a cohort

        Args:
            cohort_date: Date of the cohort (signup date)
            days_after: Days after signup to check (e.g., 7 for D7 retention)

        Returns:
            Retention rate (0.0 to 1.0)
        """
        from shared.models.analytics import UserEvent

        cohort_start = cohort_date.replace(hour=0, minute=0, second=0, microsecond=0)
        cohort_end = cohort_start + timedelta(days=1)

        # Get users who signed up on cohort_date
        cohort_users = db.query(UserEvent.user_id).filter(
            and_(
                UserEvent.event_name == 'signup_completed',
                UserEvent.timestamp >= cohort_start,
                UserEvent.timestamp < cohort_end
            )
        ).distinct().all()

        cohort_user_ids = [u[0] for u in cohort_users]
        cohort_size = len(cohort_user_ids)

        if cohort_size == 0:
            return 0.0

        # Check how many returned on day N
        return_date = cohort_start + timedelta(days=days_after)
        return_end = return_date + timedelta(days=1)

        returned_users = db.query(func.count(func.distinct(UserEvent.user_id))).filter(
            and_(
                UserEvent.user_id.in_(cohort_user_ids),
                UserEvent.timestamp >= return_date,
                UserEvent.timestamp < return_end
            )
        ).scalar() or 0

        return returned_users / cohort_size

    @classmethod
    def get_conversion_funnel(
        cls,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Calculate conversion funnel metrics

        Returns:
            Dict with funnel steps and conversion rates
        """
        from shared.models.analytics import UserEvent

        # Define funnel steps
        steps = [
            ('signup_completed', 'Signup'),
            ('first_match', 'First Match'),
            ('message_sent', 'First Message'),
            ('photo_generated', 'First Photo'),
            ('premium_converted', 'Premium Conversion')
        ]

        funnel = {}
        previous_count = None

        for event_name, step_name in steps:
            # Count unique users who completed this step
            count = db.query(func.count(func.distinct(UserEvent.user_id))).filter(
                and_(
                    UserEvent.event_name == event_name,
                    UserEvent.timestamp >= start_date,
                    UserEvent.timestamp < end_date
                )
            ).scalar() or 0

            funnel[step_name] = {
                'count': count,
                'conversion_rate': (count / previous_count * 100) if previous_count else 100.0
            }

            if previous_count is None:
                previous_count = count
            else:
                previous_count = count

        return funnel

    @classmethod
    def get_top_features(
        cls,
        db: Session,
        days: int = 30,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get most used features

        Returns:
            List of features with usage counts
        """
        from shared.models.analytics import UserEvent

        start_date = datetime.utcnow() - timedelta(days=days)

        results = db.query(
            UserEvent.event_name,
            func.count(UserEvent.id).label('usage_count'),
            func.count(func.distinct(UserEvent.user_id)).label('unique_users')
        ).filter(
            UserEvent.timestamp >= start_date
        ).group_by(
            UserEvent.event_name
        ).order_by(
            desc('usage_count')
        ).limit(limit).all()

        return [
            {
                'feature': r[0],
                'usage_count': r[1],
                'unique_users': r[2]
            }
            for r in results
        ]
