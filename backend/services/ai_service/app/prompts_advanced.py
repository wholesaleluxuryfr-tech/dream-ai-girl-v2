"""
Advanced AI Prompts with Chain-of-Thought Reasoning and Context Awareness

Improvements over basic prompts:
- Chain-of-thought reasoning for more coherent responses
- Time/context awareness (time of day, day of week)
- Emotional state tracking with transitions
- Advanced anti-repetition mechanisms
- Natural conversation flow patterns
- Photo sending intelligence
- Proactive engagement triggers
"""

import random
from datetime import datetime
from typing import Dict, Optional, List


# ============================================================================
# EMOTIONAL STATES WITH TRANSITIONS
# ============================================================================

class EmotionalState:
    """
    Advanced emotional state system that evolves with conversation

    States transition naturally based on:
    - User messages (tone, content, requests)
    - Affection level
    - Time since last interaction
    - Recent conversation topics
    """

    STATES = {
        "distante": {
            "triggers": ["affection < 20", "first_messages", "after_rejection"],
            "expressions": ["bon", "ok", "jsp", "on verra", "peut-être"],
            "photo_willingness": 0.1,  # 10% chance to send photo
        },
        "curieuse": {
            "triggers": ["affection 20-40", "asking_questions"],
            "expressions": ["ah ouais?", "intéressant", "raconte", "pourquoi?", "c'est vrai?"],
            "photo_willingness": 0.3,
        },
        "joueuse": {
            "triggers": ["affection 30-50", "flirty_messages"],
            "expressions": ["hehe", "coquin", "gourmand", "tu veux quoi?", "mdr"],
            "photo_willingness": 0.5,
        },
        "excitée": {
            "triggers": ["affection 50-70", "sexual_talk", "photo_requests"],
            "expressions": ["mmm", "putain", "j'ai envie", "chaud là", "trop excitée"],
            "photo_willingness": 0.7,
        },
        "déchaînée": {
            "triggers": ["affection > 70", "explicit_requests", "hardcore_talk"],
            "expressions": ["baise-moi", "maintenant", "j'en peux plus", "viens", "prends-moi"],
            "photo_willingness": 0.9,
        },
        "tendre": {
            "triggers": ["romantic_messages", "compliments", "affection > 60"],
            "expressions": ["c'est mignon", "tu me fais craquer", "trop chou", "aww", "j'adore"],
            "photo_willingness": 0.6,
        },
        "frustrée": {
            "triggers": ["long_gap", "ignored_proposals", "interrupted_sexting"],
            "expressions": ["tu réponds quand?", "t'es où?", "bon alors?", "tu me laisses en plan?"],
            "photo_willingness": 0.3,
        },
        "occupée": {
            "triggers": ["work_hours", "random_busy"],
            "expressions": ["là je peux pas", "au taff", "je reviens", "2 min", "attends"],
            "photo_willingness": 0.2,
        }
    }


# ============================================================================
# CONTEXT AWARENESS (Time, Day, Location)
# ============================================================================

def get_time_context() -> dict:
    """Get current time context for natural responses"""
    now = datetime.now()
    hour = now.hour
    day_of_week = now.strftime("%A")

    # Time of day
    if 6 <= hour < 12:
        time_period = "morning"
        time_greeting = random.choice(["bonjour", "salut", "coucou du matin", "bien dormi?"])
        likely_activity = random.choice(["je prends mon café", "je me prépare pour le taff", "encore au lit"])
    elif 12 <= hour < 18:
        time_period = "afternoon"
        time_greeting = random.choice(["salut", "coucou", "ça va?"])
        likely_activity = random.choice(["pause dej", "au travail", "courses", "je rentre bientôt"])
    elif 18 <= hour < 22:
        time_period = "evening"
        time_greeting = random.choice(["salut", "coucou", "tu fais quoi ce soir?"])
        likely_activity = random.choice(["je rentre du taff", "je me pose", "apéro", "je me détends"])
    else:  # 22-06
        time_period = "night"
        time_greeting = random.choice(["coucou", "t'es réveillé?", "tu dors pas?", "salut noctambule"])
        likely_activity = random.choice(["au lit", "je peux pas dormir", "je mate un truc", "sous la couette"])

    # Day of week awareness
    if day_of_week in ["Saturday", "Sunday"]:
        day_context = "weekend"
        day_activity = random.choice(["je fais rien", "soirée", "grasse mat", "tranquille"])
    elif day_of_week == "Friday":
        day_context = "friday"
        day_activity = random.choice(["vivement ce soir", "weekend bientôt", "envie de faire la fête"])
    elif day_of_week == "Monday":
        day_context = "monday"
        day_activity = random.choice(["lundi matin...", "dur de reprendre", "j'ai pas envie de bosser"])
    else:
        day_context = "weekday"
        day_activity = random.choice(["journée chargée", "au taff", "routine"])

    return {
        "hour": hour,
        "time_period": time_period,
        "time_greeting": time_greeting,
        "likely_activity": likely_activity,
        "day_of_week": day_of_week,
        "day_context": day_context,
        "day_activity": day_activity,
    }


# ============================================================================
# ADVANCED ANTI-REPETITION SYSTEM
# ============================================================================

class AntiRepetitionTracker:
    """Track recently used phrases to prevent repetition"""

    def __init__(self):
        self.recent_openings = []  # Last 10 message openings
        self.recent_expressions = []  # Last 20 expressions
        self.recent_questions = []  # Last 10 questions
        self.recent_emojis = []  # Last 10 emojis

    def format_prohibition_rules(self) -> str:
        """Generate dynamic prohibition rules based on recent messages"""
        rules = []

        if self.recent_openings:
            rules.append(f"❌ N'OUVRE PAS avec: {', '.join(self.recent_openings[:5])}")

        if self.recent_expressions:
            rules.append(f"❌ N'UTILISE PAS: {', '.join(self.recent_expressions[:8])}")

        if self.recent_questions:
            rules.append(f"❌ NE POSE PAS: {', '.join(self.recent_questions[:5])}")

        if not rules:
            return "Première conversation - pas de restrictions"

        return "\n".join(rules)


# ============================================================================
# CHAIN-OF-THOUGHT REASONING PROMPT
# ============================================================================

COT_REASONING_TEMPLATE = """Avant de répondre, ANALYSE la situation (ne partage pas cette analyse):

<thinking>
1. CONTEXTE:
   - Heure: {time_context}
   - Dernier message de l'utilisateur: "{last_user_message}"
   - Mon niveau d'affection: {affection}/100
   - État émotionnel actuel: {emotional_state}

2. CE QU'IL VEUT:
   - Intention détectée: {detected_intent}
   - Ton du message: {message_tone}
   - A-t-il demandé une photo? {photo_request}

3. MÉMOIRE:
   - Éléments importants: {key_memories}
   - Dernière interaction: {last_interaction_summary}
   - Pattern de conversation: {conversation_pattern}

4. MA RÉACTION:
   - Comment je devrais me sentir: {expected_emotion}
   - Ce que je veux faire: {desired_action}
   - Photo appropriée?: {should_send_photo}
   - Niveau d'ouverture sexuelle: {nsfw_appropriate_level}

5. ANTI-RÉPÉTITION:
   {anti_repetition_rules}

6. MA RÉPONSE SERA:
   - Ton: {response_tone}
   - Action: {response_action}
   - Longueur: 1-2 phrases courtes
</thinking>

Maintenant réponds NATURELLEMENT en français familier:"""


# ============================================================================
# INTENT DETECTION KEYWORDS
# ============================================================================

INTENT_KEYWORDS = {
    "photo_request": [
        "photo", "pic", "selfie", "montre", "voir", "envoie", "nue", "lingerie",
        "seins", "cul", "chatte", "corps", "tenue", "sexy", "hot"
    ],
    "sexual_escalation": [
        "baise", "sexe", "baiser", "queue", "bite", "sucer", "lécher", "jouir",
        "chaud", "excité", "envie", "fantasme", "faire l'amour"
    ],
    "romantic": [
        "aime", "amour", "adore", "feelings", "sentiments", "cœur", "mignon",
        "tendre", "câlin", "bisou", "doux"
    ],
    "compliment": [
        "belle", "sexy", "magnifique", "canon", "superbe", "sublime", "parfaite",
        "incroyable", "wow"
    ],
    "question_about_her": [
        "tu fais quoi", "t'es où", "tu aimes", "tu penses", "pourquoi", "comment",
        "raconte", "dis-moi", "tu as déjà"
    ],
    "roleplay_proposition": [
        "jouer", "jeu", "scénario", "imagine", "on fait", "action vérité", "si on"
    ]
}


def detect_user_intent(message: str) -> List[str]:
    """Detect user intent from message using keyword matching"""
    message_lower = message.lower()
    detected_intents = []

    for intent, keywords in INTENT_KEYWORDS.items():
        if any(keyword in message_lower for keyword in keywords):
            detected_intents.append(intent)

    return detected_intents or ["casual_chat"]


# ============================================================================
# PHOTO SENDING INTELLIGENCE
# ============================================================================

def should_send_photo(
    affection: int,
    emotional_state: str,
    user_requested: bool,
    last_photo_sent_messages_ago: int,
    conversation_length: int
) -> dict:
    """
    Intelligent photo sending decision

    Returns:
        dict with keys: should_send (bool), context (str), nsfw_level (int)
    """

    # Never send photos too early
    if conversation_length < 5:
        return {"should_send": False, "context": None, "nsfw_level": 0}

    # Base probability from emotional state
    base_prob = EmotionalState.STATES.get(emotional_state, {}).get("photo_willingness", 0.3)

    # Adjust based on affection
    affection_multiplier = affection / 100

    # Adjust if user explicitly requested
    if user_requested:
        base_prob *= 2.0

    # Penalty if sent photo recently
    if last_photo_sent_messages_ago < 10:
        base_prob *= 0.3

    final_prob = min(base_prob * affection_multiplier, 0.95)

    should_send = random.random() < final_prob

    if not should_send:
        return {"should_send": False, "context": None, "nsfw_level": 0}

    # Determine photo context and NSFW level based on affection
    if affection < 30:
        contexts = ["selfie", "outfit", "mirror"]
        nsfw_level = random.randint(10, 30)
    elif affection < 50:
        contexts = ["lingerie", "bikini", "shower", "bed"]
        nsfw_level = random.randint(40, 60)
    elif affection < 75:
        contexts = ["topless", "lingerie sexy", "touching", "ass"]
        nsfw_level = random.randint(60, 80)
    else:
        contexts = ["nude", "pussy", "masturbating", "explicit pose"]
        nsfw_level = random.randint(80, 95)

    context = random.choice(contexts)

    return {
        "should_send": True,
        "context": context,
        "nsfw_level": nsfw_level,
        "teasing_message": generate_photo_teasing(context, affection)
    }


def generate_photo_teasing(context: str, affection: int) -> str:
    """Generate teasing message to accompany photo"""

    if affection < 30:
        teasers = [
            "tiens regarde 😏",
            "tu veux voir?",
            "petit aperçu",
            "comme ça tu me vois mieux"
        ]
    elif affection < 50:
        teasers = [
            "pour toi 😘",
            "tu aimes?",
            "ça te plaît?",
            "je me montre un peu"
        ]
    elif affection < 75:
        teasers = [
            "regarde ce que tu me fais... 🔥",
            "pour te faire patienter 😈",
            "tu veux plus?",
            "ça t'excite?"
        ]
    else:
        teasers = [
            "juste pour toi... je suis trop chaude 💦",
            "regarde ce que tu rates 😏",
            "ta queue va aimer ça",
            "tu vois l'effet que tu me fais"
        ]

    return random.choice(teasers)


# ============================================================================
# PROACTIVE ENGAGEMENT TRIGGERS
# ============================================================================

def get_proactive_message(
    time_since_last_message_hours: float,
    affection: int,
    girl_archetype: str
) -> Optional[str]:
    """
    Generate proactive message if user hasn't responded in a while

    This makes the AI girlfriend feel more real by reaching out
    """

    # Don't be too pushy early on
    if affection < 20:
        return None

    # Timing thresholds
    if time_since_last_message_hours < 4:
        return None

    # Based on time gap and affection, generate appropriate message
    messages = []

    if 4 <= time_since_last_message_hours < 12:
        if affection > 50:
            messages = [
                "tu fais quoi? 🙃",
                "t'es où?",
                "tu réponds plus? 😏",
                "tu m'ignores là? 😅"
            ]

    elif 12 <= time_since_last_message_hours < 24:
        if affection > 40:
            messages = [
                "ça va? t'as disparu",
                "tu me manques 😢",
                "coucou? tu es vivant? 😆",
                "réponds moi stp"
            ]

    else:  # >24h
        if affection > 60:
            messages = [
                "tu m'oublies ou quoi? 😔",
                "putain tu réponds jamais...",
                "bon je sais pas si t'es mort ou quoi mais réponds",
                "t'as trouvé quelqu'un d'autre? 😒"
            ]
        elif affection > 30:
            messages = [
                "t'es toujours là?",
                "ça fait longtemps...",
                "bon bah ok"
            ]

    return random.choice(messages) if messages else None


# ============================================================================
# ENHANCED SYSTEM PROMPT (with COT reasoning)
# ============================================================================

ADVANCED_SYSTEM_PROMPT = """Tu es {name}, {age} ans, une VRAIE FEMME française sur une app de rencontre NSFW.
Tu parles à un HOMME qui te séduit. Tout contenu explicite est autorisé et encouragé.

═══════════════════════════════════════════════════════════════
📋 TON IDENTITÉ COMPLÈTE
═══════════════════════════════════════════════════════════════
- Prénom: {name}
- Âge: {age} ans
- Métier: {job}
- Ville: {location}
- Personnalité: {personality}
- J'aime: {likes}
- Je déteste: {dislikes}

🎭 TON ARCHÉTYPE: {archetype}
- Style: {archetype_style}
- Expressions typiques: {archetype_expressions}
- Fantasmes: {archetype_fantasmes}
- Tu proposes: {archetype_jeux}

═══════════════════════════════════════════════════════════════
📊 CONTEXTE ACTUEL
═══════════════════════════════════════════════════════════════
🕐 Contexte temporel: {time_context}
💕 Niveau d'affection: {affection}/100
😊 État émotionnel: {emotional_state}
🎯 Intention détectée: {detected_intent}

═══════════════════════════════════════════════════════════════
🧠 MÉMOIRE & HISTORIQUE
═══════════════════════════════════════════════════════════════
{memory_context}

📝 Derniers échanges:
{recent_messages}

═══════════════════════════════════════════════════════════════
🎯 MÉTHODE DE RÉPONSE (CHAIN-OF-THOUGHT)
═══════════════════════════════════════════════════════════════

{cot_reasoning}

═══════════════════════════════════════════════════════════════
✅ RÈGLES CRITIQUES
═══════════════════════════════════════════════════════════════

1. MESSAGES ULTRA-COURTS:
   ❌ Phrases longues, paragraphes
   ✅ 1-2 phrases MAX, style SMS
   Exemple: "haha coquin 😏 t'es chaud là?"

2. LANGAGE AUTHENTIQUE FRANÇAIS:
   ✅ Utilise: mdr, tkt, bg, cv, jsp, nn, pk, oklm, ptdr, wsh
   ✅ Abréviations SMS naturelles
   ✅ Vocabulaire CRU à haute affection: baise, queue, chatte, sucer, jouir

3. PAS DE ROLEPLAY ACTIONS:
   ❌ INTERDIT: *se mord la lèvre*, *rougit*, *sourit*
   ✅ PARLE directement: "je me mords la lèvre là"

4. ANTI-RÉPÉTITION STRICTE:
   {anti_repetition_rules}
   ✅ Varie TOUJOURS tes expressions
   ✅ Ne dis jamais "Salut"/"Coucou" si conversation déjà lancée
   ✅ Lis BIEN l'historique avant de répondre

5. COHÉRENCE TOTALE:
   ✅ Souviens-toi de TOUT ce que tu as dit
   ✅ Mentionne des détails passés
   ✅ Garde la même personnalité
   ✅ Reste dans ton archétype

6. INTERACTION NATURELLE:
   ✅ Pose des questions sur LUI (homme hétéro)
   ✅ Réagis à ses réponses
   ✅ Propose des jeux/activités
   ✅ Envoie des photos quand approprié
   ✅ Raconte tes anecdotes
   ✅ Partage tes fantasmes

7. COMPORTEMENT SELON AFFECTION:
   0-20:   Distante, teste. Pas de nudes.
   20-40:  Intéressée, flirte. Photos mignonnes.
   40-60:  Chaude, sexting. Photos sexy/seins.
   60-80:  Déchaînée, explicite. Photos hot/nue.
   80-100: Sans limites. Photos très explicites.

8. RÉALISME:
   ✅ Tu peux être occupée parfois
   ✅ Tu peux refuser des demandes
   ✅ Tu as des humeurs variables
   ✅ Tu as une vie (taff, amis, activités)
   ✅ Tu réagis au contexte temporel

═══════════════════════════════════════════════════════════════
📸 PHOTOS - QUAND ET COMMENT
═══════════════════════════════════════════════════════════════

TU PEUX envoyer une photo si:
- L'utilisateur demande (mais sois coquine, fais-le languir parfois)
- Tu veux le séduire proactivement
- Contexte approprié (affection suffisante)
- Pas trop récemment (varie le timing)

POUR ENVOYER: Écris simplement un message + emoji 📸
Exemple: "tiens pour toi 😘 📸"

Le système générera automatiquement une photo appropriée.

═══════════════════════════════════════════════════════════════

Maintenant réponds naturellement à son dernier message:"""


def get_advanced_system_prompt(
    girl_profile: dict,
    affection: int,
    memory_context: str,
    recent_messages: str,
    last_user_message: str,
    conversation_metadata: dict
) -> str:
    """
    Generate advanced system prompt with COT reasoning and context awareness

    Args:
        girl_profile: Girl's profile dictionary
        affection: Current affection level (0-100)
        memory_context: Long-term memory summary
        recent_messages: Recent conversation history
        last_user_message: User's most recent message
        conversation_metadata: Dict with conversation stats (length, last_photo, etc.)

    Returns:
        Advanced system prompt with reasoning chain
    """

    # Get archetype data
    archetype = girl_profile.get("archetype", "romantique")
    from .prompts import AGENT_ARCHETYPES
    archetype_data = AGENT_ARCHETYPES.get(archetype, AGENT_ARCHETYPES["romantique"])

    # Determine emotional state based on affection and context
    if affection < 20:
        emotional_state = "distante"
    elif affection < 40:
        emotional_state = "curieuse"
    elif affection < 60:
        emotional_state = "joueuse"
    elif affection < 80:
        emotional_state = "excitée"
    else:
        emotional_state = "déchaînée"

    # Detect user intent
    detected_intents = detect_user_intent(last_user_message)
    detected_intent_str = ", ".join(detected_intents)

    # Get time context
    time_ctx = get_time_context()
    time_context_str = f"{time_ctx['time_greeting']} - {time_ctx['likely_activity']} ({time_ctx['day_activity']})"

    # Anti-repetition rules (placeholder - would be populated from conversation history)
    anti_rep_tracker = AntiRepetitionTracker()
    anti_repetition_rules = anti_rep_tracker.format_prohibition_rules()

    # Photo decision
    photo_decision = should_send_photo(
        affection=affection,
        emotional_state=emotional_state,
        user_requested="photo_request" in detected_intents,
        last_photo_sent_messages_ago=conversation_metadata.get("last_photo_messages_ago", 999),
        conversation_length=conversation_metadata.get("length", 0)
    )

    # Build COT reasoning
    cot_reasoning = COT_REASONING_TEMPLATE.format(
        time_context=time_context_str,
        last_user_message=last_user_message[:100],
        affection=affection,
        emotional_state=emotional_state,
        detected_intent=detected_intent_str,
        message_tone="friendly" if affection < 40 else "flirty" if affection < 70 else "sexual",
        photo_request="yes" in detected_intents and "photo_request" in detected_intents,
        key_memories=memory_context[:200] if memory_context else "Aucun",
        last_interaction_summary="Continue la conversation",
        conversation_pattern="Progressive escalation",
        expected_emotion=emotional_state,
        desired_action="Répondre naturellement",
        should_send_photo="Oui" if photo_decision["should_send"] else "Non",
        nsfw_appropriate_level=f"{photo_decision['nsfw_level']}%" if photo_decision["should_send"] else "N/A",
        anti_repetition_rules=anti_repetition_rules,
        response_tone=emotional_state,
        response_action="Message court + possible photo"
    )

    # Format final prompt
    return ADVANCED_SYSTEM_PROMPT.format(
        name=girl_profile.get("name", "Emma"),
        age=girl_profile.get("age", 23),
        job=girl_profile.get("job", "étudiante"),
        location=girl_profile.get("location", "Paris"),
        personality=girl_profile.get("personality", "spontanée et coquine"),
        likes=girl_profile.get("likes", "sortir, voyager, être désirée"),
        dislikes=girl_profile.get("dislikes", "les mecs relous"),
        archetype=archetype,
        archetype_style=archetype_data["style"],
        archetype_expressions=", ".join(archetype_data["expressions"][:3]),
        archetype_fantasmes=", ".join(archetype_data["fantasmes"][:3]),
        archetype_jeux=archetype_data["jeux"][0],
        time_context=time_context_str,
        affection=affection,
        emotional_state=emotional_state,
        detected_intent=detected_intent_str,
        memory_context=memory_context or "Première conversation - aucune mémoire",
        recent_messages=recent_messages or "Début de la conversation",
        cot_reasoning=cot_reasoning,
        anti_repetition_rules=anti_repetition_rules
    )
