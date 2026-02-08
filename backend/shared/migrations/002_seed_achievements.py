"""
Seed Achievements Data

Populates the achievements table with default achievements
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from shared.config.settings import get_settings
from shared.models.gamification import Achievement, AchievementType, RewardType

settings = get_settings()


def seed_achievements(db: Session):
    """Create all default achievements"""

    achievements_data = [
        # ============================================================================
        # MESSAGING ACHIEVEMENTS
        # ============================================================================
        {
            "name": "Premier Message",
            "description": "Envoie ton premier message",
            "icon": "💬",
            "type": AchievementType.MESSAGING,
            "requirement_count": 1,
            "requirement_field": "total_messages_sent",
            "reward_type": RewardType.TOKENS,
            "reward_value": 10,
            "reward_xp": 20,
            "rarity": "common",
            "display_order": 1
        },
        {
            "name": "Bavard",
            "description": "Envoie 50 messages",
            "icon": "💭",
            "type": AchievementType.MESSAGING,
            "requirement_count": 50,
            "requirement_field": "total_messages_sent",
            "reward_type": RewardType.TOKENS,
            "reward_value": 25,
            "reward_xp": 50,
            "rarity": "common",
            "display_order": 2
        },
        {
            "name": "Romantique",
            "description": "Envoie 200 messages",
            "icon": "💕",
            "type": AchievementType.MESSAGING,
            "requirement_count": 200,
            "requirement_field": "total_messages_sent",
            "reward_type": RewardType.TOKENS,
            "reward_value": 50,
            "reward_xp": 100,
            "rarity": "rare",
            "display_order": 3
        },
        {
            "name": "Légende de la Conversation",
            "description": "Envoie 1000 messages",
            "icon": "👑",
            "type": AchievementType.MESSAGING,
            "requirement_count": 1000,
            "requirement_field": "total_messages_sent",
            "reward_type": RewardType.TOKENS,
            "reward_value": 200,
            "reward_xp": 500,
            "rarity": "legendary",
            "display_order": 4
        },

        # ============================================================================
        # MATCHING ACHIEVEMENTS
        # ============================================================================
        {
            "name": "Premier Match",
            "description": "Fais ton premier match",
            "icon": "❤️",
            "type": AchievementType.MATCHING,
            "requirement_count": 1,
            "requirement_field": "total_matches",
            "reward_type": RewardType.TOKENS,
            "reward_value": 20,
            "reward_xp": 30,
            "rarity": "common",
            "display_order": 5
        },
        {
            "name": "Séducteur",
            "description": "Fais 5 matches",
            "icon": "😍",
            "type": AchievementType.MATCHING,
            "requirement_count": 5,
            "requirement_field": "total_matches",
            "reward_type": RewardType.TOKENS,
            "reward_value": 50,
            "reward_xp": 75,
            "rarity": "rare",
            "display_order": 6
        },
        {
            "name": "Collectionneur",
            "description": "Fais 10 matches",
            "icon": "🔥",
            "type": AchievementType.MATCHING,
            "requirement_count": 10,
            "requirement_field": "total_matches",
            "reward_type": RewardType.TOKENS,
            "reward_value": 100,
            "reward_xp": 150,
            "rarity": "epic",
            "display_order": 7
        },
        {
            "name": "Casanova",
            "description": "Fais 25 matches",
            "icon": "💋",
            "type": AchievementType.MATCHING,
            "requirement_count": 25,
            "requirement_field": "total_matches",
            "reward_type": RewardType.TOKENS,
            "reward_value": 250,
            "reward_xp": 400,
            "rarity": "legendary",
            "display_order": 8
        },

        # ============================================================================
        # PHOTO ACHIEVEMENTS
        # ============================================================================
        {
            "name": "Première Photo",
            "description": "Reçois ta première photo",
            "icon": "📸",
            "type": AchievementType.PHOTOS,
            "requirement_count": 1,
            "requirement_field": "total_photos_received",
            "reward_type": RewardType.TOKENS,
            "reward_value": 15,
            "reward_xp": 25,
            "rarity": "common",
            "display_order": 9
        },
        {
            "name": "Collectionneur de Souvenirs",
            "description": "Reçois 25 photos",
            "icon": "📷",
            "type": AchievementType.PHOTOS,
            "requirement_count": 25,
            "requirement_field": "total_photos_received",
            "reward_type": RewardType.TOKENS,
            "reward_value": 75,
            "reward_xp": 100,
            "rarity": "rare",
            "display_order": 10
        },
        {
            "name": "Galerie Privée",
            "description": "Reçois 100 photos",
            "icon": "🖼️",
            "type": AchievementType.PHOTOS,
            "requirement_count": 100,
            "requirement_field": "total_photos_received",
            "reward_type": RewardType.TOKENS,
            "reward_value": 200,
            "reward_xp": 300,
            "rarity": "epic",
            "display_order": 11
        },

        # ============================================================================
        # STREAK ACHIEVEMENTS
        # ============================================================================
        {
            "name": "Fidèle",
            "description": "Connecte-toi 3 jours d'affilée",
            "icon": "🔥",
            "type": AchievementType.STREAK,
            "requirement_count": 3,
            "requirement_field": "current_streak",
            "reward_type": RewardType.TOKENS,
            "reward_value": 30,
            "reward_xp": 40,
            "rarity": "common",
            "display_order": 12
        },
        {
            "name": "Dévoué",
            "description": "Connecte-toi 7 jours d'affilée",
            "icon": "⭐",
            "type": AchievementType.STREAK,
            "requirement_count": 7,
            "requirement_field": "current_streak",
            "reward_type": RewardType.TOKENS,
            "reward_value": 70,
            "reward_xp": 100,
            "rarity": "rare",
            "display_order": 13
        },
        {
            "name": "Accro",
            "description": "Connecte-toi 30 jours d'affilée",
            "icon": "💯",
            "type": AchievementType.STREAK,
            "requirement_count": 30,
            "requirement_field": "current_streak",
            "reward_type": RewardType.TOKENS,
            "reward_value": 300,
            "reward_xp": 500,
            "rarity": "legendary",
            "display_order": 14
        },

        # ============================================================================
        # EXPLORATION ACHIEVEMENTS
        # ============================================================================
        {
            "name": "Explorateur",
            "description": "Connecte-toi 7 jours au total",
            "icon": "🗺️",
            "type": AchievementType.EXPLORATION,
            "requirement_count": 7,
            "requirement_field": "total_days_active",
            "reward_type": RewardType.TOKENS,
            "reward_value": 50,
            "reward_xp": 60,
            "rarity": "common",
            "display_order": 15
        },
        {
            "name": "Vétéran",
            "description": "Connecte-toi 30 jours au total",
            "icon": "🎖️",
            "type": AchievementType.EXPLORATION,
            "requirement_count": 30,
            "requirement_field": "total_days_active",
            "reward_type": RewardType.TOKENS,
            "reward_value": 150,
            "reward_xp": 200,
            "rarity": "rare",
            "display_order": 16
        },
        {
            "name": "Membre Fondateur",
            "description": "Connecte-toi 100 jours au total",
            "icon": "💎",
            "type": AchievementType.EXPLORATION,
            "requirement_count": 100,
            "requirement_field": "total_days_active",
            "reward_type": RewardType.TOKENS,
            "reward_value": 500,
            "reward_xp": 1000,
            "rarity": "legendary",
            "display_order": 17
        },

        # ============================================================================
        # SPECIAL/SECRET ACHIEVEMENTS
        # ============================================================================
        {
            "name": "Nuit Blanche",
            "description": "Envoie un message entre 2h et 5h du matin",
            "icon": "🌙",
            "type": AchievementType.SPECIAL,
            "requirement_count": 1,
            "requirement_field": None,  # Manual unlock
            "reward_type": RewardType.TOKENS,
            "reward_value": 25,
            "reward_xp": 50,
            "rarity": "rare",
            "is_secret": True,
            "display_order": 18
        },
        {
            "name": "Speed Dating",
            "description": "Fais 3 matches en 1 heure",
            "icon": "⚡",
            "type": AchievementType.SPECIAL,
            "requirement_count": 1,
            "requirement_field": None,  # Manual unlock
            "reward_type": RewardType.TOKENS,
            "reward_value": 50,
            "reward_xp": 75,
            "rarity": "epic",
            "is_secret": True,
            "display_order": 19
        },
        {
            "name": "Premiers Pas",
            "description": "Complète ton profil à 100%",
            "icon": "✅",
            "type": AchievementType.SPECIAL,
            "requirement_count": 1,
            "requirement_field": None,  # Manual unlock
            "reward_type": RewardType.TOKENS,
            "reward_value": 30,
            "reward_xp": 40,
            "rarity": "common",
            "display_order": 20
        }
    ]

    # Insert achievements
    for ach_data in achievements_data:
        existing = db.query(Achievement).filter(Achievement.name == ach_data["name"]).first()
        if not existing:
            achievement = Achievement(**ach_data)
            db.add(achievement)
            print(f"✅ Created achievement: {ach_data['name']}")
        else:
            print(f"⏭️  Achievement already exists: {ach_data['name']}")

    db.commit()
    print(f"\n🎉 Seeded {len(achievements_data)} achievements!")


if __name__ == "__main__":
    # Run directly
    from shared.utils.database import get_db

    db_gen = get_db()
    db = next(db_gen)

    try:
        seed_achievements(db)
    finally:
        db.close()
