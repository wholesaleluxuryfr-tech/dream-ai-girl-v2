"""
Conversational AI logic using OpenRouter/Mistral

Supports both basic and advanced prompt modes:
- Basic: Simple archetype-based prompts
- Advanced: Chain-of-thought reasoning, context awareness, anti-repetition
"""

from openai import OpenAI
from typing import List, Dict, Optional
import logging
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

from shared.config.settings import get_settings
from .prompts import get_system_prompt
from .prompts_advanced import (
    get_advanced_system_prompt,
    detect_user_intent,
    get_time_context,
    should_send_photo,
    get_proactive_message
)
from .memory_system import get_memory_system

logger = logging.getLogger(__name__)
settings = get_settings()

# Use advanced prompts if enabled in settings (default: True for better quality)
USE_ADVANCED_PROMPTS = getattr(settings, 'USE_ADVANCED_AI_PROMPTS', True)

# Initialize memory system
memory_system = get_memory_system()

# Initialize OpenRouter client (compatible with OpenAI SDK)
openrouter_client = None
if settings.OPENROUTER_API_KEY:
    openrouter_client = OpenAI(
        api_key=settings.OPENROUTER_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL
    )


async def generate_ai_response(
    girl_profile: dict,
    user_message: str,
    affection: int,
    recent_messages: List[Dict[str, str]],
    memory_context: str = "",
    conversation_metadata: Optional[Dict] = None,
    user_id: Optional[int] = None,
    girl_id: Optional[str] = None
) -> str:
    """
    Generate AI girlfriend response using OpenRouter/Mistral.

    Supports both basic and advanced prompting modes with vector memory.

    Args:
        girl_profile: Dictionary with girlfriend profile
        user_message: User's message
        affection: Current affection level (0-100)
        recent_messages: List of recent messages [{sender, content}, ...]
        memory_context: Long-term memory context (optional, will use vector DB if available)
        conversation_metadata: Optional dict with conversation stats
            - length: Total conversation length
            - last_photo_messages_ago: Messages since last photo
            - time_since_last_message_hours: Hours since user's last message
        user_id: User ID for memory retrieval
        girl_id: Girl ID for memory retrieval

    Returns:
        AI-generated response text
    """
    if not openrouter_client:
        logger.error("OpenRouter client not initialized - missing API key")
        return "Hey, désolée... j'ai un problème technique là 😅"

    try:
        # ============================================================================
        # VECTOR MEMORY RETRIEVAL
        # ============================================================================

        # If memory_context not provided and we have user_id/girl_id, retrieve from vector DB
        if not memory_context and user_id and girl_id:
            memory_context = memory_system.build_memory_context(
                user_id=user_id,
                girl_id=girl_id,
                current_message=user_message,
                max_memories=5
            )
            logger.info(f"📚 Retrieved memory context: {len(memory_context)} chars")

        # ============================================================================
        # STORE USER MESSAGE AS MEMORY (if important)
        # ============================================================================

        if user_id and girl_id:
            # Check if message is worth storing
            importance_context = {'affection': affection}
            from .memory_system import MemoryImportance
            importance = MemoryImportance.score_memory(user_message, importance_context)

            if importance >= 0.5:  # Only store moderately important or higher
                memory_system.store_memory(
                    user_id=user_id,
                    girl_id=girl_id,
                    content=user_message,
                    context={
                        'affection': affection,
                        'sender': 'user',
                        **conversation_metadata
                    } if conversation_metadata else {'affection': affection}
                )
                logger.info(f"💾 Stored user message as memory (importance: {importance:.2f})")

        # ============================================================================
        # CONTINUE WITH NORMAL FLOW
        # ============================================================================
        # Build recent conversation context
        recent_context = "\n".join([
            f"{msg['sender']}: {msg['content']}"
            for msg in recent_messages[-10:]  # Last 10 messages
        ])

        # Generate system prompt (basic or advanced)
        if USE_ADVANCED_PROMPTS and conversation_metadata:
            logger.info("Using ADVANCED prompts with COT reasoning")

            system_prompt = get_advanced_system_prompt(
                girl_profile=girl_profile,
                affection=affection,
                memory_context=memory_context,
                recent_messages=recent_context,
                last_user_message=user_message,
                conversation_metadata=conversation_metadata or {}
            )

            # Advanced prompts use higher temperature for more creativity
            temperature = 1.0
            max_tokens = 180
        else:
            logger.info("Using BASIC prompts")

            system_prompt = get_system_prompt(
                girl_profile=girl_profile,
                affection=affection,
                memory_context=memory_context,
                recent_messages=recent_context
            )

            temperature = 0.9
            max_tokens = 150

        # Build messages for API
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add recent conversation context (last 5 exchanges)
        for msg in recent_messages[-5:]:
            role = "assistant" if msg["sender"] == "girl" else "user"
            messages.append({"role": role, "content": msg["content"]})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Call OpenRouter API
        logger.info(f"Calling OpenRouter with model: {settings.OPENROUTER_MODEL}, temp: {temperature}")

        response = openrouter_client.chat.completions.create(
            model=settings.OPENROUTER_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=0.95,
            frequency_penalty=0.7,  # Reduce repetition
            presence_penalty=0.6     # Encourage variety
        )

        ai_response = response.choices[0].message.content.strip()

        # Clean up response (remove any thinking tags if model leaked them)
        if "<thinking>" in ai_response:
            # Extract only the actual response after thinking
            parts = ai_response.split("</thinking>")
            if len(parts) > 1:
                ai_response = parts[-1].strip()
            else:
                # Fallback: remove thinking tag
                ai_response = ai_response.replace("<thinking>", "").replace("</thinking>", "").strip()

        logger.info(f"AI response generated: {len(ai_response)} chars")

        return ai_response

    except Exception as e:
        logger.error(f"AI response generation failed: {e}", exc_info=True)
        # Return fallback response
        fallback_responses = [
            "Mdr pardon j'étais dans mes pensées 😅",
            "Haha désolée j'ai bugué là",
            "Attends je réfléchis... 🤔",
            "Oups j'ai zappé ce que tu disais mdr"
        ]
        import random
        return random.choice(fallback_responses)


def detect_photo_request(message: str) -> bool:
    """
    Detect if user is requesting a photo.

    Returns True if message contains photo request keywords.
    """
    photo_keywords = [
        "photo", "pic", "image", "selfie", "montre",
        "envoie", "voir", "regarde", "mate"
    ]

    message_lower = message.lower()
    return any(keyword in message_lower for keyword in photo_keywords)


def should_send_photo_spontaneously(affection: int, message_count: int) -> bool:
    """
    Determine if girlfriend should send photo spontaneously.

    Higher affection = more likely to send photos.
    """
    import random

    # Never send spontaneously at low affection
    if affection < 40:
        return False

    # Increase probability with affection
    probability = (affection - 40) / 100  # 0% at 40, 60% at 100

    # Send photo every ~10 messages at high affection
    if message_count % 10 == 0 and affection > 60:
        return random.random() < 0.7

    return random.random() < probability


def calculate_affection_change(user_message: str, current_affection: int) -> int:
    """
    Calculate affection change based on user message.

    Returns: delta affection (-5 to +5)
    """
    message_lower = user_message.lower()

    # Positive keywords
    positive_keywords = [
        "belle", "sexy", "magnifique", "jolie", "géniale",
        "j'aime", "merci", "cool", "super", "top"
    ]

    # Negative keywords
    negative_keywords = [
        "moche", "nulle", "chiante", "relou", "con",
        "ferme", "ta gueule"
    ]

    # Flirty keywords (big affection boost)
    flirty_keywords = [
        "envie", "excite", "chaude", "désire", "fantasme",
        "baise", "suce", "chatte", "queue"
    ]

    delta = 0

    # Check positive
    if any(keyword in message_lower for keyword in positive_keywords):
        delta += 2

    # Check negative
    if any(keyword in message_lower for keyword in negative_keywords):
        delta -= 3

    # Check flirty (only if affection is already decent)
    if current_affection > 30:
        if any(keyword in message_lower for keyword in flirty_keywords):
            delta += 3

    # Small boost just for engaging
    if len(user_message) > 20:  # Longer messages show interest
        delta += 1

    # Clamp delta
    return max(-5, min(5, delta))
