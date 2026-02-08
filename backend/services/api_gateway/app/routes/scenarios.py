"""
Scenarios API Routes

Endpoints for browsing and managing roleplay scenarios
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime

from shared.utils.database import get_db
from shared.models.scenario import (
    Scenario,
    UserScenario,
    ScenarioCategory,
    ScenarioIntensity,
    ScenarioStatus
)
from shared.models.user import User

router = APIRouter()


# ============================================================================
# BROWSE SCENARIOS
# ============================================================================

@router.get("/browse")
async def browse_scenarios(
    user_id: int = Query(...),
    category: Optional[str] = Query(None),
    intensity: Optional[str] = Query(None),
    max_affection: Optional[int] = Query(None),
    include_premium: bool = Query(True),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Browse available scenarios with filters

    Args:
        user_id: User ID for checking unlocks
        category: Filter by category (romantic, spicy, hardcore, etc.)
        intensity: Filter by intensity (soft, medium, hot, extreme)
        max_affection: Only show scenarios requiring <= this affection
        include_premium: Include premium scenarios
        limit: Results per page
        offset: Pagination offset
    """
    # Build query
    query = db.query(Scenario).filter(Scenario.status == ScenarioStatus.ACTIVE)

    # Apply filters
    if category:
        try:
            cat_enum = ScenarioCategory(category)
            query = query.filter(Scenario.category == cat_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    if intensity:
        try:
            int_enum = ScenarioIntensity(intensity)
            query = query.filter(Scenario.intensity == int_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid intensity: {intensity}")

    if max_affection is not None:
        query = query.filter(Scenario.min_affection <= max_affection)

    # User premium status
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    has_premium = user.subscription_tier in ["premium", "elite"]

    if not include_premium or not has_premium:
        query = query.filter(Scenario.is_premium == False)

    # Order and paginate
    query = query.order_by(Scenario.is_featured.desc(), Scenario.display_order, Scenario.created_at.desc())
    total = query.count()
    scenarios = query.limit(limit).offset(offset).all()

    # Get user scenario status
    user_scenarios_map = {}
    if scenarios:
        scenario_ids = [s.id for s in scenarios]
        user_scenarios = db.query(UserScenario).filter(
            and_(
                UserScenario.user_id == user_id,
                UserScenario.scenario_id.in_(scenario_ids)
            )
        ).all()
        user_scenarios_map = {us.scenario_id: us for us in user_scenarios}

    # Format results
    results = []
    for scenario in scenarios:
        user_scenario = user_scenarios_map.get(scenario.id)

        results.append({
            "id": scenario.id,
            "title": scenario.title,
            "description": scenario.description,
            "icon": scenario.icon,
            "category": scenario.category.value,
            "intensity": scenario.intensity.value,
            "tags": scenario.tags,
            "min_affection": scenario.min_affection,
            "is_premium": scenario.is_premium,
            "cost_tokens": scenario.cost_tokens,
            "is_featured": scenario.is_featured,
            "play_count": scenario.play_count,
            "average_rating": scenario.average_rating,
            "thumbnail_url": scenario.thumbnail_url,
            # User-specific data
            "is_unlocked": user_scenario.is_unlocked if user_scenario else (scenario.cost_tokens == 0),
            "user_play_count": user_scenario.play_count if user_scenario else 0,
            "user_rating": user_scenario.user_rating if user_scenario else None,
            "can_play": (
                user_scenario.is_unlocked if user_scenario else (scenario.cost_tokens == 0)
            ) or (user.tokens >= scenario.cost_tokens)
        })

    return {
        "scenarios": results,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total
    }


@router.get("/{scenario_id}")
async def get_scenario_details(
    scenario_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get full scenario details"""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Get user scenario
    user_scenario = db.query(UserScenario).filter(
        and_(
            UserScenario.user_id == user_id,
            UserScenario.scenario_id == scenario_id
        )
    ).first()

    # Check user tokens
    user = db.query(User).filter(User.id == user_id).first()

    return {
        "id": scenario.id,
        "title": scenario.title,
        "description": scenario.description,
        "icon": scenario.icon,
        "category": scenario.category.value,
        "intensity": scenario.intensity.value,
        "tags": scenario.tags,
        "min_affection": scenario.min_affection,
        "is_premium": scenario.is_premium,
        "cost_tokens": scenario.cost_tokens,
        "initial_message": scenario.initial_message,
        "suggested_responses": scenario.suggested_responses,
        "is_multi_part": scenario.is_multi_part,
        "total_parts": scenario.total_parts,
        "thumbnail_url": scenario.thumbnail_url,
        "play_count": scenario.play_count,
        "average_rating": scenario.average_rating,
        # User-specific
        "is_unlocked": user_scenario.is_unlocked if user_scenario else (scenario.cost_tokens == 0),
        "can_afford": user.tokens >= scenario.cost_tokens if user else False,
        "user_play_count": user_scenario.play_count if user_scenario else 0,
        "user_rating": user_scenario.user_rating if user_scenario else None,
        "current_part": user_scenario.current_part if user_scenario else 1,
        "is_completed": user_scenario.is_completed if user_scenario else False
    }


# ============================================================================
# START/UNLOCK SCENARIO
# ============================================================================

@router.post("/{scenario_id}/start")
async def start_scenario(
    scenario_id: int,
    user_id: int,
    girl_id: str,
    db: Session = Depends(get_db)
):
    """
    Start a scenario (unlock if needed)
    """
    # Get scenario
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check premium requirement
    if scenario.is_premium and user.subscription_tier not in ["premium", "elite"]:
        raise HTTPException(status_code=403, detail="Premium subscription required")

    # Get or create user scenario
    user_scenario = db.query(UserScenario).filter(
        and_(
            UserScenario.user_id == user_id,
            UserScenario.girl_id == girl_id,
            UserScenario.scenario_id == scenario_id
        )
    ).first()

    if not user_scenario:
        user_scenario = UserScenario(
            user_id=user_id,
            girl_id=girl_id,
            scenario_id=scenario_id
        )
        db.add(user_scenario)

    # Unlock if needed
    if not user_scenario.is_unlocked:
        if scenario.cost_tokens > 0:
            if user.tokens < scenario.cost_tokens:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient tokens. Need {scenario.cost_tokens}, have {user.tokens}"
                )

            # Deduct tokens
            user.tokens -= scenario.cost_tokens

        # Unlock
        user_scenario.is_unlocked = True
        user_scenario.unlocked_at = datetime.utcnow()

    # Update play stats
    user_scenario.play_count += 1
    user_scenario.last_played_at = datetime.utcnow()
    scenario.play_count += 1

    db.commit()

    return {
        "success": True,
        "scenario": {
            "id": scenario.id,
            "title": scenario.title,
            "initial_message": scenario.initial_message,
            "context_prompt": scenario.context_prompt,
            "suggested_responses": scenario.suggested_responses
        },
        "tokens_spent": scenario.cost_tokens if not user_scenario.is_unlocked else 0,
        "tokens_remaining": user.tokens
    }


# ============================================================================
# RATE SCENARIO
# ============================================================================

@router.post("/{scenario_id}/rate")
async def rate_scenario(
    scenario_id: int,
    user_id: int,
    girl_id: str,
    rating: int = Query(..., ge=1, le=5),
    db: Session = Depends(get_db)
):
    """
    Rate a scenario (1-5 stars)
    """
    # Get user scenario
    user_scenario = db.query(UserScenario).filter(
        and_(
            UserScenario.user_id == user_id,
            UserScenario.girl_id == girl_id,
            UserScenario.scenario_id == scenario_id
        )
    ).first()

    if not user_scenario or not user_scenario.is_unlocked:
        raise HTTPException(status_code=400, detail="Must play scenario before rating")

    # Update user rating
    user_scenario.user_rating = rating

    # Recalculate scenario average
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    all_ratings = db.query(UserScenario.user_rating).filter(
        and_(
            UserScenario.scenario_id == scenario_id,
            UserScenario.user_rating.isnot(None)
        )
    ).all()

    if all_ratings:
        avg = sum(r[0] for r in all_ratings) / len(all_ratings)
        scenario.average_rating = int(avg)

    db.commit()

    return {
        "success": True,
        "user_rating": rating,
        "scenario_average": scenario.average_rating
    }


# ============================================================================
# MY SCENARIOS
# ============================================================================

@router.get("/user/{user_id}/history")
async def get_user_scenario_history(
    user_id: int,
    girl_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get user's scenario history (played/unlocked)
    """
    query = db.query(UserScenario).filter(UserScenario.user_id == user_id)

    if girl_id:
        query = query.filter(UserScenario.girl_id == girl_id)

    query = query.filter(UserScenario.is_unlocked == True)
    query = query.order_by(UserScenario.last_played_at.desc())
    user_scenarios = query.limit(limit).all()

    # Get scenario details
    scenario_ids = [us.scenario_id for us in user_scenarios]
    scenarios = db.query(Scenario).filter(Scenario.id.in_(scenario_ids)).all()
    scenarios_map = {s.id: s for s in scenarios}

    results = []
    for us in user_scenarios:
        scenario = scenarios_map.get(us.scenario_id)
        if not scenario:
            continue

        results.append({
            "scenario_id": scenario.id,
            "title": scenario.title,
            "icon": scenario.icon,
            "category": scenario.category.value,
            "intensity": scenario.intensity.value,
            "girl_id": us.girl_id,
            "play_count": us.play_count,
            "last_played": us.last_played_at.isoformat() if us.last_played_at else None,
            "user_rating": us.user_rating,
            "is_completed": us.is_completed
        })

    return {
        "scenarios": results,
        "total": len(results)
    }


# ============================================================================
# FEATURED/RECOMMENDATIONS
# ============================================================================

@router.get("/featured")
async def get_featured_scenarios(
    user_id: int = Query(...),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get featured scenarios"""
    scenarios = db.query(Scenario).filter(
        and_(
            Scenario.status == ScenarioStatus.ACTIVE,
            Scenario.is_featured == True
        )
    ).order_by(Scenario.display_order).limit(limit).all()

    # Get user data
    user = db.query(User).filter(User.id == user_id).first()
    has_premium = user.subscription_tier in ["premium", "elite"] if user else False

    # Get unlock status
    scenario_ids = [s.id for s in scenarios]
    user_scenarios = db.query(UserScenario).filter(
        and_(
            UserScenario.user_id == user_id,
            UserScenario.scenario_id.in_(scenario_ids)
        )
    ).all()
    user_scenarios_map = {us.scenario_id: us for us in user_scenarios}

    results = []
    for scenario in scenarios:
        # Skip premium if user doesn't have it
        if scenario.is_premium and not has_premium:
            continue

        user_scenario = user_scenarios_map.get(scenario.id)

        results.append({
            "id": scenario.id,
            "title": scenario.title,
            "description": scenario.description,
            "icon": scenario.icon,
            "category": scenario.category.value,
            "intensity": scenario.intensity.value,
            "min_affection": scenario.min_affection,
            "is_premium": scenario.is_premium,
            "cost_tokens": scenario.cost_tokens,
            "thumbnail_url": scenario.thumbnail_url,
            "is_unlocked": user_scenario.is_unlocked if user_scenario else (scenario.cost_tokens == 0)
        })

    return {
        "scenarios": results,
        "count": len(results)
    }
