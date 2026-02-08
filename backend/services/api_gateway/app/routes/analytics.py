"""
Analytics API Routes

Endpoints for tracking events and viewing metrics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta

from shared.utils.database import get_db
from ..analytics_service import AnalyticsService, MetricsService

router = APIRouter()


# ============================================================================
# REQUEST MODELS
# ============================================================================

class TrackEventRequest(BaseModel):
    event_name: str
    category: str
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    properties: Optional[Dict] = None


class PageViewRequest(BaseModel):
    user_id: Optional[int] = None
    session_id: str
    page_url: str
    referrer: Optional[str] = None


# ============================================================================
# EVENT TRACKING ENDPOINTS
# ============================================================================

@router.post("/track")
async def track_event(
    request: TrackEventRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """
    Track a custom event

    Generic event tracking endpoint
    """
    user_agent = http_request.headers.get("user-agent")
    ip_address = http_request.client.host if http_request.client else None

    success = AnalyticsService.track_event(
        db,
        event_name=request.event_name,
        category=request.category,
        user_id=request.user_id,
        session_id=request.session_id,
        properties=request.properties,
        user_agent=user_agent,
        ip_address=ip_address
    )

    return {
        "success": success,
        "event_name": request.event_name,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/track/page_view")
async def track_page_view(
    request: PageViewRequest,
    db: Session = Depends(get_db)
):
    """Track page view"""
    success = AnalyticsService.track_page_view(
        db,
        user_id=request.user_id,
        session_id=request.session_id,
        page_url=request.page_url,
        referrer=request.referrer
    )

    return {
        "success": success
    }


@router.post("/track/signup")
async def track_signup(
    user_id: int,
    session_id: str,
    signup_method: str = "email",
    db: Session = Depends(get_db)
):
    """Track user signup"""
    success = AnalyticsService.track_user_signup(
        db,
        user_id=user_id,
        session_id=session_id,
        signup_method=signup_method
    )

    return {"success": success}


@router.post("/track/match")
async def track_match(
    user_id: int,
    girl_id: str,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Track match creation"""
    success = AnalyticsService.track_match_created(
        db,
        user_id=user_id,
        girl_id=girl_id,
        session_id=session_id
    )

    return {"success": success}


@router.post("/track/message")
async def track_message(
    user_id: int,
    girl_id: str,
    message_length: int,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Track message sent"""
    success = AnalyticsService.track_message_sent(
        db,
        user_id=user_id,
        girl_id=girl_id,
        message_length=message_length,
        session_id=session_id
    )

    return {"success": success}


# ============================================================================
# METRICS ENDPOINTS
# ============================================================================

@router.get("/metrics/daily")
async def get_daily_metrics(
    date: Optional[str] = Query(None),  # YYYY-MM-DD format
    db: Session = Depends(get_db)
):
    """
    Get daily metrics for a specific date

    If no date provided, returns today's metrics
    """
    if date:
        try:
            target_date = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.utcnow()

    metrics = MetricsService.calculate_daily_metrics(db, target_date)

    return {
        "date": target_date.date().isoformat(),
        "metrics": metrics
    }


@router.get("/metrics/weekly")
async def get_weekly_metrics(
    weeks: int = Query(4, ge=1, le=52),
    db: Session = Depends(get_db)
):
    """
    Get weekly metrics for the last N weeks
    """
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    weekly_data = []

    for week_offset in range(weeks):
        week_start = today - timedelta(days=(week_offset + 1) * 7)
        week_end = week_start + timedelta(days=7)

        # Calculate metrics for the week
        week_metrics = {
            'week_start': week_start.date().isoformat(),
            'week_end': week_end.date().isoformat()
        }

        # Aggregate daily metrics for the week
        total_dau = 0
        total_signups = 0
        total_messages = 0
        total_matches = 0

        for day in range(7):
            day_date = week_start + timedelta(days=day)
            day_metrics = MetricsService.calculate_daily_metrics(db, day_date)

            total_dau += day_metrics.get('daily_active_users', 0)
            total_signups += day_metrics.get('new_signups', 0)
            total_messages += day_metrics.get('total_messages', 0)
            total_matches += day_metrics.get('total_matches', 0)

        week_metrics.update({
            'total_active_users': total_dau,
            'new_signups': total_signups,
            'total_messages': total_messages,
            'total_matches': total_matches
        })

        weekly_data.append(week_metrics)

    return {
        "weeks": weeks,
        "data": list(reversed(weekly_data))  # Oldest to newest
    }


@router.get("/metrics/retention")
async def get_retention_metrics(
    cohort_date: str = Query(...),  # YYYY-MM-DD
    db: Session = Depends(get_db)
):
    """
    Get retention metrics for a cohort

    Returns D1, D7, D30 retention rates
    """
    try:
        cohort = datetime.fromisoformat(cohort_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    retention_d1 = MetricsService.get_user_cohort_retention(db, cohort, days_after=1)
    retention_d7 = MetricsService.get_user_cohort_retention(db, cohort, days_after=7)
    retention_d30 = MetricsService.get_user_cohort_retention(db, cohort, days_after=30)

    return {
        "cohort_date": cohort_date,
        "retention": {
            "d1": round(retention_d1 * 100, 2),
            "d7": round(retention_d7 * 100, 2),
            "d30": round(retention_d30 * 100, 2)
        }
    }


@router.get("/metrics/funnel")
async def get_conversion_funnel(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get conversion funnel metrics for the last N days
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    funnel = MetricsService.get_conversion_funnel(db, start_date, end_date)

    return {
        "period": {
            "start": start_date.date().isoformat(),
            "end": end_date.date().isoformat(),
            "days": days
        },
        "funnel": funnel
    }


@router.get("/metrics/top_features")
async def get_top_features(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=5, le=50),
    db: Session = Depends(get_db)
):
    """
    Get most used features
    """
    features = MetricsService.get_top_features(db, days=days, limit=limit)

    return {
        "period_days": days,
        "features": features
    }


@router.get("/metrics/overview")
async def get_metrics_overview(
    db: Session = Depends(get_db)
):
    """
    Get comprehensive metrics overview

    Returns today's metrics, week-over-week comparison, and key stats
    """
    today = datetime.utcnow()
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

    # Today's metrics
    today_metrics = MetricsService.calculate_daily_metrics(db, today)

    # Yesterday's metrics for comparison
    yesterday_metrics = MetricsService.calculate_daily_metrics(db, yesterday)

    # Week ago for WoW comparison
    week_ago_metrics = MetricsService.calculate_daily_metrics(db, week_ago)

    # Calculate changes
    def calculate_change(current, previous):
        if previous == 0:
            return 0.0
        return ((current - previous) / previous) * 100

    return {
        "today": {
            "date": today.date().isoformat(),
            "dau": today_metrics.get('daily_active_users', 0),
            "signups": today_metrics.get('new_signups', 0),
            "messages": today_metrics.get('total_messages', 0),
            "matches": today_metrics.get('total_matches', 0),
            "photos": today_metrics.get('total_photos', 0),
            "premium_conversions": today_metrics.get('premium_conversions', 0),
            "scenarios": today_metrics.get('total_scenarios', 0)
        },
        "day_over_day": {
            "dau_change": calculate_change(
                today_metrics.get('daily_active_users', 0),
                yesterday_metrics.get('daily_active_users', 0)
            ),
            "signups_change": calculate_change(
                today_metrics.get('new_signups', 0),
                yesterday_metrics.get('new_signups', 0)
            ),
            "messages_change": calculate_change(
                today_metrics.get('total_messages', 0),
                yesterday_metrics.get('total_messages', 0)
            )
        },
        "week_over_week": {
            "dau_change": calculate_change(
                today_metrics.get('daily_active_users', 0),
                week_ago_metrics.get('daily_active_users', 0)
            ),
            "signups_change": calculate_change(
                today_metrics.get('new_signups', 0),
                week_ago_metrics.get('new_signups', 0)
            )
        }
    }


# ============================================================================
# USER-SPECIFIC ANALYTICS
# ============================================================================

@router.get("/user/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get user's activity summary for the last N days
    """
    from shared.models.analytics import UserEvent

    start_date = datetime.utcnow() - timedelta(days=days)

    # Count events by type
    events_by_type = db.query(
        UserEvent.event_name,
        func.count(UserEvent.id).label('count')
    ).filter(
        and_(
            UserEvent.user_id == user_id,
            UserEvent.timestamp >= start_date
        )
    ).group_by(UserEvent.event_name).all()

    activity_summary = {event[0]: event[1] for event in events_by_type}

    # Get recent events
    recent_events = db.query(UserEvent).filter(
        UserEvent.user_id == user_id
    ).order_by(UserEvent.timestamp.desc()).limit(20).all()

    return {
        "user_id": user_id,
        "period_days": days,
        "total_events": sum(activity_summary.values()),
        "activity_by_type": activity_summary,
        "recent_events": [
            {
                "event_name": e.event_name,
                "event_type": e.event_type,
                "timestamp": e.timestamp.isoformat()
            }
            for e in recent_events
        ]
    }
