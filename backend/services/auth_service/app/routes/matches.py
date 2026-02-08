"""Match management routes - swipe, match, unmatch"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List
import sys
import os
import logging
import random

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.config.settings import get_settings
from shared.utils.database import get_db
from shared.models.user import User
from shared.models.match import Match, MatchCreate, MatchResponse
from shared.models.custom_girl import CustomGirl

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# Hardcoded girlfriend profiles (extracted from monolith)
# In production, these would be in a separate girlfriends database table
GIRLS_PROFILES = {
    "emma": {"name": "Emma", "age": 23, "location": "Paris", "tagline": "Romantique et passionnée"},
    "chloe": {"name": "Chloé", "age": 21, "location": "Lyon", "tagline": "Coquine et spontanée"},
    "lea": {"name": "Léa", "age": 25, "location": "Marseille", "tagline": "Aventurière et sexy"},
    "sarah": {"name": "Sarah", "age": 24, "location": "Bordeaux", "tagline": "Douce et sensuelle"},
    "manon": {"name": "Manon", "age": 22, "location": "Toulouse", "tagline": "Timide mais curieuse"},
    "clara": {"name": "Clara", "age": 26, "location": "Nice", "tagline": "Dominante et exigeante"},
    "julie": {"name": "Julie", "age": 23, "location": "Nantes", "tagline": "Nympho insatiable"},
}


@router.get("/discover")
async def get_discover_profiles(
    user_id: int = Query(...),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get profiles to swipe on (Tinder-like discovery).

    Returns girls that user hasn't seen or matched with yet.
    """
    # Check user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get girl IDs user has already interacted with
    seen_girl_ids = db.query(Match.girl_id).filter(Match.user_id == user_id).all()
    seen_girl_ids = [girl_id[0] for girl_id in seen_girl_ids]

    # Get available girls (predefined + custom)
    available_girls = []

    # Add predefined girls
    for girl_id, profile in GIRLS_PROFILES.items():
        if girl_id not in seen_girl_ids:
            available_girls.append({
                "girl_id": girl_id,
                "name": profile["name"],
                "age": profile["age"],
                "location": profile["location"],
                "tagline": profile["tagline"],
                "photo_url": f"https://placeholder.com/400x600?text={profile['name']}",
                "custom": False
            })

    # Add custom girls (public ones from other users)
    custom_girls = db.query(CustomGirl).filter(
        CustomGirl.is_public == 1,
        ~CustomGirl.girl_id.in_(seen_girl_ids)
    ).limit(limit).all()

    for custom_girl in custom_girls:
        available_girls.append({
            "girl_id": custom_girl.girl_id,
            "name": custom_girl.name,
            "age": custom_girl.age,
            "location": "Custom",
            "tagline": custom_girl.archetype or "Personnalisée",
            "photo_url": f"https://placeholder.com/400x600?text={custom_girl.name}",
            "custom": True,
            "creator_id": custom_girl.user_id
        })

    # Shuffle and limit
    random.shuffle(available_girls)
    available_girls = available_girls[:limit]

    logger.info(f"Discover profiles for user {user_id}: {len(available_girls)} profiles")

    return {
        "profiles": available_girls,
        "total": len(available_girls)
    }


@router.post("/swipe")
async def swipe_profile(
    user_id: int,
    girl_id: str,
    action: str,
    db: Session = Depends(get_db)
):
    """
    Swipe on a profile (like or pass).

    - action: "like" or "pass"

    If action is "like", creates a match automatically (since AI girls always match).
    """
    if action not in ["like", "pass"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'like' or 'pass'"
        )

    # Check user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already matched/passed
    existing = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already interacted with this profile"
        )

    if action == "pass":
        # Just log the pass (don't create match with 0 affection)
        logger.info(f"User {user_id} passed on {girl_id}")
        return {
            "action": "pass",
            "message": "Profile passed"
        }

    # Create match (AI girls always match)
    try:
        new_match = Match(
            user_id=user_id,
            girl_id=girl_id,
            affection=20,  # Starting affection
            matched_at=datetime.utcnow(),
            messages_count=0,
            photos_received=0,
            videos_received=0,
            last_interaction_at=datetime.utcnow()
        )

        db.add(new_match)
        db.commit()
        db.refresh(new_match)

        logger.info(f"User {user_id} matched with {girl_id}")

        # Add XP for first match
        user.xp += settings.XP_PER_MESSAGE
        db.commit()

        return {
            "action": "match",
            "message": "It's a match! 💕",
            "match": MatchResponse.model_validate(new_match),
            "xp_earned": settings.XP_PER_MESSAGE
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Match creation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Match creation failed"
        )


@router.get("/", response_model=List[MatchResponse])
async def get_matches(
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get all user matches.

    Returns list of girlfriends user has matched with, sorted by last interaction.
    """
    # Check user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get matches
    matches = db.query(Match).filter(
        Match.user_id == user_id
    ).order_by(desc(Match.last_interaction_at)).all()

    return [MatchResponse.model_validate(match) for match in matches]


@router.get("/{user_id}/{girl_id}")
async def get_match_details(
    user_id: int,
    girl_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed info about a specific match.

    Returns match details with girlfriend profile info.
    """
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Get girl profile info
    girl_info = GIRLS_PROFILES.get(girl_id)
    if not girl_info:
        # Try custom girl
        custom_girl = db.query(CustomGirl).filter(CustomGirl.girl_id == girl_id).first()
        if custom_girl:
            girl_info = {
                "name": custom_girl.name,
                "age": custom_girl.age,
                "location": "Custom",
                "tagline": custom_girl.archetype or "Personnalisée"
            }

    return {
        "match": MatchResponse.model_validate(match),
        "girl_info": girl_info
    }


@router.delete("/{user_id}/{girl_id}")
async def unmatch(
    user_id: int,
    girl_id: str,
    db: Session = Depends(get_db)
):
    """
    Unmatch with a girlfriend.

    Deletes the match (but keeps chat history for now).
    """
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    try:
        db.delete(match)
        db.commit()

        logger.info(f"User {user_id} unmatched with {girl_id}")

        return {
            "message": "Unmatched successfully",
            "girl_id": girl_id
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Unmatch failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unmatch failed"
        )


@router.post("/{user_id}/{girl_id}/update-affection")
async def update_affection(
    user_id: int,
    girl_id: str,
    delta: int,
    db: Session = Depends(get_db)
):
    """
    Update match affection level.

    Internal endpoint called by chat service when messages are sent.
    """
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Update affection (clamp between 0-100)
    match.affection = max(0, min(100, match.affection + delta))
    match.last_interaction_at = datetime.utcnow()
    db.commit()

    logger.info(f"Updated affection for user {user_id} with {girl_id}: {match.affection} (delta: {delta})")

    return {
        "affection": match.affection,
        "delta": delta
    }
