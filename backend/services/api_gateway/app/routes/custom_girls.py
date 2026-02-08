"""
Custom Girlfriend Creator Routes

Allows Elite tier users to create personalized girlfriends
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))

from shared.utils.database import get_db
from shared.models.user import User
from shared.models.custom_girl import CustomGirl
from shared.models.match import Match

router = APIRouter()


# ============================================================================
# REQUEST MODELS
# ============================================================================

class CreateCustomGirlRequest(BaseModel):
    """Request to create custom girlfriend"""
    name: str
    age: int
    ethnicity: str
    body_type: str
    breast_size: str
    hair_color: str
    hair_length: str
    eye_color: str
    archetype: str
    personality: Optional[str] = None
    interests: Optional[List[str]] = None
    backstory: Optional[str] = None


class UpdateCustomGirlRequest(BaseModel):
    """Request to update custom girlfriend"""
    name: Optional[str] = None
    personality: Optional[str] = None
    backstory: Optional[str] = None
    is_public: Optional[bool] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_appearance_prompt(data: CreateCustomGirlRequest) -> str:
    """Generate image generation prompt from attributes"""

    # Base prompt structure
    prompt_parts = [
        "masterpiece, 8k uhd, photorealistic portrait,",
        f"{data.ethnicity} woman,",
        f"{data.age} years old,",
        f"{data.body_type} body type,",
        f"{data.breast_size} cup breasts,",
        f"{data.hair_length} {data.hair_color} hair,",
        f"{data.eye_color} eyes,",
        "natural lighting, detailed skin texture,",
        "high quality, professional photography"
    ]

    return " ".join(prompt_parts)


def generate_personality_description(data: CreateCustomGirlRequest) -> str:
    """Generate personality text from attributes"""

    personality_parts = []

    # Archetype description
    archetype_descriptions = {
        "romantique": "Elle est douce, affectueuse et adore les moments romantiques.",
        "perverse": "Elle est coquine, audacieuse et aime explorer ses fantasmes.",
        "exhib": "Elle aime se montrer et excite par le regard des autres.",
        "cougar": "Femme mature confiante qui sait ce qu'elle veut.",
        "soumise": "Elle aime plaire et obéir à son partenaire.",
        "dominante": "Elle prend le contrôle et aime dominer.",
        "nympho": "Son appétit sexuel est insatiable.",
        "timide": "Réservée et innocente, mais curieuse.",
        "fetichiste": "Elle a des fantasmes spécifiques qu'elle aime explorer.",
        "salope": "Assumée et sans tabous dans sa sexualité."
    }

    personality_parts.append(archetype_descriptions.get(
        data.archetype,
        "Elle a une personnalité unique."
    ))

    # Add custom personality
    if data.personality:
        personality_parts.append(data.personality)

    # Add backstory
    if data.backstory:
        personality_parts.append(f"Backstory: {data.backstory}")

    # Add interests
    if data.interests:
        interests_str = ", ".join(data.interests)
        personality_parts.append(f"Intérêts: {interests_str}")

    return " ".join(personality_parts)


def check_elite_tier(user: User) -> bool:
    """Check if user has Elite tier subscription"""
    return user.subscription_tier == "elite"


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("/create")
async def create_custom_girlfriend(
    request: CreateCustomGirlRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Create a new custom girlfriend (Elite tier only)

    Allows users to design their perfect girlfriend with custom attributes
    """
    user_id = req.state.user_id

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check Elite tier
    if not check_elite_tier(user):
        raise HTTPException(
            status_code=403,
            detail="Custom girlfriend creation requires Elite tier subscription"
        )

    # Check limit (Elite users can create up to 5 custom girlfriends)
    existing_count = db.query(CustomGirl).filter(
        CustomGirl.user_id == user_id
    ).count()

    if existing_count >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 custom girlfriends allowed. Delete one to create a new one."
        )

    # Generate unique girl_id
    girl_id = f"custom_{uuid.uuid4().hex[:12]}"

    # Generate appearance prompt
    appearance_prompt = generate_appearance_prompt(request)

    # Generate personality description
    personality_description = generate_personality_description(request)

    # Create custom girl
    custom_girl = CustomGirl(
        user_id=user_id,
        girl_id=girl_id,
        name=request.name,
        age=request.age,
        ethnicity=request.ethnicity,
        body_type=request.body_type,
        breast_size=request.breast_size,
        hair_color=request.hair_color,
        hair_length=request.hair_length,
        eye_color=request.eye_color,
        archetype=request.archetype,
        personality=personality_description,
        appearance_prompt=appearance_prompt,
        is_public=0
    )

    db.add(custom_girl)
    db.commit()
    db.refresh(custom_girl)

    # Auto-match user with their custom girlfriend
    match = Match(
        user_id=user_id,
        girl_id=girl_id,
        matched_at=custom_girl.created_at
    )
    db.add(match)
    db.commit()

    return {
        "success": True,
        "girl_id": girl_id,
        "custom_girl": {
            "id": custom_girl.id,
            "girl_id": custom_girl.girl_id,
            "name": custom_girl.name,
            "age": custom_girl.age,
            "archetype": custom_girl.archetype,
            "created_at": custom_girl.created_at.isoformat()
        }
    }


@router.get("/list")
async def list_custom_girlfriends(
    req: Request,
    db: Session = Depends(get_db)
):
    """Get all custom girlfriends created by user"""
    user_id = req.state.user_id

    custom_girls = db.query(CustomGirl).filter(
        CustomGirl.user_id == user_id
    ).order_by(CustomGirl.created_at.desc()).all()

    return {
        "custom_girls": [
            {
                "id": girl.id,
                "girl_id": girl.girl_id,
                "name": girl.name,
                "age": girl.age,
                "ethnicity": girl.ethnicity,
                "body_type": girl.body_type,
                "hair_color": girl.hair_color,
                "hair_length": girl.hair_length,
                "eye_color": girl.eye_color,
                "archetype": girl.archetype,
                "personality": girl.personality,
                "created_at": girl.created_at.isoformat(),
                "is_public": bool(girl.is_public),
                "times_matched": girl.times_matched
            }
            for girl in custom_girls
        ],
        "count": len(custom_girls),
        "limit": 5
    }


@router.get("/{girl_id}")
async def get_custom_girlfriend(
    girl_id: str,
    req: Request,
    db: Session = Depends(get_db)
):
    """Get custom girlfriend details"""
    user_id = req.state.user_id

    custom_girl = db.query(CustomGirl).filter(
        CustomGirl.girl_id == girl_id
    ).first()

    if not custom_girl:
        raise HTTPException(status_code=404, detail="Custom girlfriend not found")

    # Check if user owns this custom girl or if it's public
    if custom_girl.user_id != user_id and not custom_girl.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": custom_girl.id,
        "girl_id": custom_girl.girl_id,
        "name": custom_girl.name,
        "age": custom_girl.age,
        "ethnicity": custom_girl.ethnicity,
        "body_type": custom_girl.body_type,
        "breast_size": custom_girl.breast_size,
        "hair_color": custom_girl.hair_color,
        "hair_length": custom_girl.hair_length,
        "eye_color": custom_girl.eye_color,
        "archetype": custom_girl.archetype,
        "personality": custom_girl.personality,
        "appearance_prompt": custom_girl.appearance_prompt,
        "created_at": custom_girl.created_at.isoformat(),
        "is_public": bool(custom_girl.is_public),
        "times_matched": custom_girl.times_matched,
        "is_owner": custom_girl.user_id == user_id
    }


@router.put("/{girl_id}")
async def update_custom_girlfriend(
    girl_id: str,
    update_data: UpdateCustomGirlRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """Update custom girlfriend"""
    user_id = req.state.user_id

    custom_girl = db.query(CustomGirl).filter(
        CustomGirl.girl_id == girl_id,
        CustomGirl.user_id == user_id
    ).first()

    if not custom_girl:
        raise HTTPException(
            status_code=404,
            detail="Custom girlfriend not found or you don't own it"
        )

    # Update fields
    if update_data.name:
        custom_girl.name = update_data.name

    if update_data.personality:
        custom_girl.personality = update_data.personality

    if update_data.is_public is not None:
        custom_girl.is_public = 1 if update_data.is_public else 0

    db.commit()

    return {
        "success": True,
        "message": "Custom girlfriend updated"
    }


@router.delete("/{girl_id}")
async def delete_custom_girlfriend(
    girl_id: str,
    req: Request,
    db: Session = Depends(get_db)
):
    """Delete custom girlfriend"""
    user_id = req.state.user_id

    custom_girl = db.query(CustomGirl).filter(
        CustomGirl.girl_id == girl_id,
        CustomGirl.user_id == user_id
    ).first()

    if not custom_girl:
        raise HTTPException(
            status_code=404,
            detail="Custom girlfriend not found or you don't own it"
        )

    # Delete associated match
    db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).delete()

    # Delete custom girl
    db.delete(custom_girl)
    db.commit()

    return {
        "success": True,
        "message": "Custom girlfriend deleted"
    }


# ============================================================================
# PUBLIC CUSTOM GIRLS (DISCOVERY)
# ============================================================================

@router.get("/public/list")
async def list_public_custom_girlfriends(
    req: Request,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List public custom girlfriends created by other users

    Users can match with popular custom girlfriends
    """
    custom_girls = db.query(CustomGirl).filter(
        CustomGirl.is_public == 1
    ).order_by(
        CustomGirl.times_matched.desc()
    ).offset(offset).limit(limit).all()

    return {
        "custom_girls": [
            {
                "girl_id": girl.girl_id,
                "name": girl.name,
                "age": girl.age,
                "ethnicity": girl.ethnicity,
                "body_type": girl.body_type,
                "archetype": girl.archetype,
                "times_matched": girl.times_matched,
                "created_by": "community"  # Hide creator identity for privacy
            }
            for girl in custom_girls
        ],
        "count": len(custom_girls)
    }


@router.post("/public/{girl_id}/match")
async def match_with_public_custom_girlfriend(
    girl_id: str,
    req: Request,
    db: Session = Depends(get_db)
):
    """Match with a public custom girlfriend"""
    user_id = req.state.user_id

    # Check if custom girl exists and is public
    custom_girl = db.query(CustomGirl).filter(
        CustomGirl.girl_id == girl_id,
        CustomGirl.is_public == 1
    ).first()

    if not custom_girl:
        raise HTTPException(status_code=404, detail="Public custom girlfriend not found")

    # Check if already matched
    existing_match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.girl_id == girl_id
    ).first()

    if existing_match:
        raise HTTPException(status_code=400, detail="Already matched with this girlfriend")

    # Create match
    match = Match(
        user_id=user_id,
        girl_id=girl_id
    )
    db.add(match)

    # Increment times_matched counter
    custom_girl.times_matched += 1

    db.commit()

    return {
        "success": True,
        "message": f"Matched with {custom_girl.name}!",
        "girl_id": girl_id
    }


# ============================================================================
# VALIDATION & LIMITS
# ============================================================================

@router.get("/limits")
async def get_custom_girlfriend_limits(
    req: Request,
    db: Session = Depends(get_db)
):
    """Get user's custom girlfriend creation limits"""
    user_id = req.state.user_id

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_elite = check_elite_tier(user)
    current_count = db.query(CustomGirl).filter(
        CustomGirl.user_id == user_id
    ).count()

    return {
        "has_access": is_elite,
        "tier": user.subscription_tier,
        "current_count": current_count,
        "max_count": 5 if is_elite else 0,
        "can_create": is_elite and current_count < 5
    }
