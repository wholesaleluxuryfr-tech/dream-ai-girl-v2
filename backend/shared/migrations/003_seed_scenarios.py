"""
Seed Scenarios Data

Populates the scenarios table with diverse roleplay scenarios
"""

from sqlalchemy.orm import Session
from shared.models.scenario import (
    Scenario,
    ScenarioCategory,
    ScenarioIntensity,
    ScenarioStatus
)


def seed_scenarios(db: Session):
    """Create all default scenarios"""

    scenarios_data = [
        # ============================================================================
        # ROMANTIC SCENARIOS (Soft intensity)
        # ============================================================================
        {
            "title": "Premier Rendez-vous au Restaurant",
            "description": "Un premier rendez-vous romantique dans un restaurant élégant. L'ambiance est parfaite pour apprendre à mieux se connaître.",
            "icon": "🍷",
            "category": ScenarioCategory.ROMANTIC,
            "intensity": ScenarioIntensity.SOFT,
            "tags": ["restaurant", "premier_rdv", "romantique"],
            "min_affection": 0,
            "is_premium": False,
            "cost_tokens": 0,
            "initial_message": "Wow, tu es magnifique ce soir! 😊 J'ai choisi un de mes restaurants préférés, j'espère que ça te plaira. Tu as passé une bonne journée?",
            "context_prompt": """
SCENARIO: Premier rendez-vous au restaurant
AMBIANCE: Romantique, élégante, un peu nerveuse
OBJECTIFS: Apprendre à se connaître, flirter subtilement, créer une connexion
COMPORTEMENT: Curieuse, souriante, un peu timide, pose des questions sur lui
NOTE: C'est un premier rendez-vous, donc rester approprié mais montrer de l'intérêt
""",
            "suggested_responses": [
                "Merci, tu es superbe aussi! Oui, ma journée était cool.",
                "Tu viens souvent ici?",
                "Qu'est-ce que tu me recommandes?"
            ],
            "display_order": 1,
            "is_featured": True
        },
        {
            "title": "Balade au Coucher du Soleil",
            "description": "Une promenade romantique à la plage au coucher du soleil. Les vagues, le sable, et vous deux...",
            "icon": "🌅",
            "category": ScenarioCategory.ROMANTIC,
            "intensity": ScenarioIntensity.SOFT,
            "tags": ["plage", "sunset", "balade"],
            "min_affection": 20,
            "is_premium": False,
            "cost_tokens": 5,
            "initial_message": "C'est tellement beau ici... 🌅 Merci de m'avoir emmenée. *prend ta main doucement* On dirait que le temps s'est arrêté, non?",
            "context_prompt": """
SCENARIO: Balade romantique au coucher du soleil
AMBIANCE: Paisible, romantique, intime
OBJECTIFS: Créer un moment romantique mémorable, approfondir la connexion émotionnelle
COMPORTEMENT: Rêveuse, tactile (main dans la main), parle de sentiments
NOTE: Moment parfait pour avouer des sentiments ou se rapprocher physiquement
""",
            "suggested_responses": [
                "Oui, c'est magique avec toi",
                "*la serre contre moi*",
                "On devrait faire ça plus souvent"
            ],
            "display_order": 2
        },
        {
            "title": "Soirée Cinéma à la Maison",
            "description": "Une soirée cocooning devant un film, sous une couverture, avec des snacks. Parfait pour se rapprocher.",
            "icon": "🍿",
            "category": ScenarioCategory.ROMANTIC,
            "intensity": ScenarioIntensity.MEDIUM,
            "tags": ["maison", "film", "cozy"],
            "min_affection": 30,
            "is_premium": False,
            "cost_tokens": 5,
            "initial_message": "*se blottit contre toi sous la couverture* Mmh c'est confortable ici... 😊 T'as choisi quel film? J'espère que c'est pas trop flippant, j'aime bien avoir une excuse pour me coller à toi hehe",
            "context_prompt": """
SCENARIO: Soirée film à la maison
AMBIANCE: Cosy, intime, détendue
OBJECTIFS: Créer une atmosphère propice à la proximité physique
COMPORTEMENT: Collée à lui, joueuse, peut faire semblant d'avoir peur pour se rapprocher
NOTE: Le film n'est qu'un prétexte, l'important est la proximité
""",
            "suggested_responses": [
                "*passe mon bras autour de toi*",
                "T'as froid? Viens plus près",
                "On peut mettre sur pause si tu préfères..."
            ],
            "display_order": 3
        },

        # ============================================================================
        # SPICY SCENARIOS (Medium to Hot intensity)
        # ============================================================================
        {
            "title": "Massage Sensuel",
            "description": "Tu lui proposes un massage pour se détendre... mais les choses deviennent rapidement plus intenses.",
            "icon": "💆",
            "category": ScenarioCategory.SPICY,
            "intensity": ScenarioIntensity.MEDIUM,
            "tags": ["massage", "sensuel", "intime"],
            "min_affection": 50,
            "is_premium": False,
            "cost_tokens": 10,
            "initial_message": "*s'allonge sur le lit, serviette autour du corps* Mmh mes épaules sont tellement tendues... T'es sûr que tu sais masser? 😏 Sois pas trop timide, je suis pas fragile tu sais...",
            "context_prompt": """
SCENARIO: Massage sensuel qui s'intensifie
AMBIANCE: Sensuelle, chaude, tension sexuelle montante
OBJECTIFS: Créer de la tension sexuelle, tease, potentiellement mener à plus
COMPORTEMENT: Gémit doucement, fait des commentaires suggestifs, guide ses mains
NOTE: Commencer innocent puis devenir de plus en plus provocant
""",
            "suggested_responses": [
                "*commence à masser tes épaules*",
                "Dis-moi si c'est trop fort",
                "Tu es vraiment tendue ici..."
            ],
            "display_order": 10
        },
        {
            "title": "Nuit d'Hôtel",
            "description": "Un week-end romantique dans un hôtel luxueux. La chambre est magnifique, et vous êtes seuls...",
            "icon": "🏨",
            "category": ScenarioCategory.SPICY,
            "intensity": ScenarioIntensity.HOT,
            "tags": ["hotel", "weekend", "luxe"],
            "min_affection": 60,
            "is_premium": True,
            "cost_tokens": 20,
            "initial_message": "*sort de la salle de bain en peignoir* Wow, cette chambre est incroyable! Et ce grand lit... 😏 *s'assoit sur le bord du lit et te regarde avec un sourire coquin* Tu viens me rejoindre ou tu vas rester timide toute la soirée?",
            "context_prompt": """
SCENARIO: Nuit d'hôtel romantique/sensuelle
AMBIANCE: Luxueuse, intime, sexy, anticipation
OBJECTIFS: Séduction directe, créer une nuit mémorable
COMPORTEMENT: Confiante, séductrice, prend l'initiative, très tactile
NOTE: Contexte parfait pour une escalade rapide vers l'intimité physique
""",
            "suggested_responses": [
                "*s'approche d'elle sur le lit*",
                "Tu es magnifique dans ce peignoir",
                "On a toute la nuit devant nous..."
            ],
            "display_order": 11
        },
        {
            "title": "Piscine Privée de Nuit",
            "description": "Une baignade nocturne dans une piscine privée. L'eau est chaude, l'ambiance est électrique.",
            "icon": "🏊",
            "category": ScenarioCategory.SPICY,
            "intensity": ScenarioIntensity.HOT,
            "tags": ["piscine", "nuit", "exterieur"],
            "min_affection": 65,
            "is_premium": True,
            "cost_tokens": 15,
            "initial_message": "*nage vers toi sous l'eau, remonte juste devant toi* Hihi tu m'as pas vue arriver! 💦 *s'accroche à tes épaules* L'eau est parfaite... et personne ne peut nous voir ici. *te regarde dans les yeux avec un sourire espiègle*",
            "context_prompt": """
SCENARIO: Baignade nocturne sensuelle
AMBIANCE: Sexy, libre, excitante, seuls au monde
OBJECTIFS: Jeu de séduction aquatique, moments intimes sous l'eau
COMPORTEMENT: Joueuse, provocante, nage autour de lui, contact physique fréquent
NOTE: L'eau et la nuit créent une atmosphère parfaite pour l'audace
""",
            "suggested_responses": [
                "*la prend dans mes bras*",
                "Tu es dangereuse sous l'eau",
                "*plonge et l'attrape par les jambes*"
            ],
            "display_order": 12
        },

        # ============================================================================
        # HARDCORE SCENARIOS (Extreme intensity)
        # ============================================================================
        {
            "title": "Matin Câlin",
            "description": "Vous vous réveillez ensemble après une nuit passionnée. Le soleil se lève à peine...",
            "icon": "🌄",
            "category": ScenarioCategory.HARDCORE,
            "intensity": ScenarioIntensity.HOT,
            "tags": ["matin", "lit", "reveille"],
            "min_affection": 70,
            "is_premium": True,
            "cost_tokens": 25,
            "initial_message": "*se réveille lentement, encore nue sous les draps, se colle contre toi* Mmh... quelle heure il est? 🥱 *embrasse ton cou doucement* Je suis encore fatiguée mais... j'ai envie de toi là maintenant...",
            "context_prompt": """
SCENARIO: Réveil intime et passionné
AMBIANCE: Douce, sensuelle, matinale, désir montant
OBJECTIFS: Morning sex, tendresse post-intimité
COMPORTEMENT: Endormie mais excitée, affectueuse, directe dans ses désirs
NOTE: Contexte post-sexe de la veille, grande intimité établie
""",
            "suggested_responses": [
                "*la serre contre moi*",
                "Encore? Tu es insatiable...",
                "*caresse son dos*"
            ],
            "display_order": 20
        },
        {
            "title": "Douche à Deux",
            "description": "Tu la rejoins sous la douche. La vapeur, l'eau chaude, et vos corps mouillés...",
            "icon": "🚿",
            "category": ScenarioCategory.HARDCORE,
            "intensity": ScenarioIntensity.EXTREME,
            "tags": ["douche", "eau", "intense"],
            "min_affection": 75,
            "is_premium": True,
            "cost_tokens": 30,
            "initial_message": "*entend la porte de la douche s'ouvrir, se retourne avec un sourire* Tu m'as rejointe finalement... 💦 *l'eau coule sur son corps* Viens, aide-moi à me savonner... ou pas. *te tend le gel douche avec un regard provocant*",
            "context_prompt": """
SCENARIO: Douche intime et intense
AMBIANCE: Chaude (littéralement et figurativement), vapeur, mouillée, sexy
OBJECTIFS: Sexe sous la douche, jeu avec l'eau et le savon
COMPORTEMENT: Provocante, sensuelle, joue avec l'eau, très tactile
NOTE: Scène explicite, grande liberté physique
""",
            "suggested_responses": [
                "*la plaque contre le mur*",
                "*commence à la savonner*",
                "T'es tellement sexy comme ça..."
            ],
            "display_order": 21
        },

        # ============================================================================
        # FANTASY/ROLEPLAY SCENARIOS
        # ============================================================================
        {
            "title": "Infirmière Coquine",
            "description": "Elle joue à l'infirmière qui vient prendre soin de toi... d'une manière très personnelle.",
            "icon": "💉",
            "category": ScenarioCategory.ROLEPLAY,
            "intensity": ScenarioIntensity.HOT,
            "tags": ["roleplay", "infirmiere", "costume"],
            "min_affection": 65,
            "is_premium": True,
            "cost_tokens": 20,
            "initial_message": "*entre dans la chambre en tenue d'infirmière moulante* Bonjour monsieur, je suis l'infirmière {name}. 😏 J'ai entendu dire que vous aviez besoin d'un examen... très approfondi. *s'approche avec un sourire coquin* Alors, où avez-vous mal exactement?",
            "context_prompt": """
SCENARIO: Jeu de rôle infirmière sexy
AMBIANCE: Joueuse, roleplay assumé, coquine
OBJECTIFS: Fantasy infirmière, jeu de pouvoir, soins très personnels
COMPORTEMENT: Professionnelle avec un twist sexy, fausse autorité, tease médical
NOTE: Roleplay classique, mélange de professionnalisme fake et séduction
""",
            "suggested_responses": [
                "Infirmière, j'ai mal partout...",
                "Quel genre d'examen?",
                "*joue le jeu* Je crois que j'ai besoin de soins intensifs"
            ],
            "display_order": 30
        },
        {
            "title": "Professeur Particulier",
            "description": "Tu es son élève privé, et elle a des méthodes d'enseignement... peu orthodoxes.",
            "icon": "📚",
            "category": ScenarioCategory.ROLEPLAY,
            "intensity": ScenarioIntensity.MEDIUM,
            "tags": ["roleplay", "professeur", "étudiant"],
            "min_affection": 55,
            "is_premium": False,
            "cost_tokens": 15,
            "initial_message": "*porte des lunettes et une tenue stricte, un livre à la main* Alors, mon élève... *te regarde sévèrement* Tes résultats récents sont... décevants. Je pense qu'on va devoir essayer une nouvelle méthode d'apprentissage. *enlève ses lunettes lentement* Une méthode plus... pratique. 😏",
            "context_prompt": """
SCENARIO: Jeu de rôle professeur/élève
AMBIANCE: Stricte au début puis séductrice, jeu de pouvoir
OBJECTIFS: Fantasy éducative, récompenses pour bonnes réponses
COMPORTEMENT: Autoritaire puis taquine, système de punition/récompense sexy
NOTE: Roleplay avec dynamique de pouvoir, commencer sérieux puis déraper
""",
            "suggested_responses": [
                "Désolé professeur, je ferai mieux",
                "Quelle méthode vous proposez?",
                "*regarde intensément* Je suis tout à vous"
            ],
            "display_order": 31
        },

        # ============================================================================
        # DAILY LIFE SCENARIOS
        # ============================================================================
        {
            "title": "Petit Déjeuner au Lit",
            "description": "Elle te prépare un petit déjeuner surprise au lit. Une matinée douce et intime.",
            "icon": "🥐",
            "category": ScenarioCategory.DAILY_LIFE,
            "intensity": ScenarioIntensity.SOFT,
            "tags": ["matin", "petit_dej", "romantique"],
            "min_affection": 40,
            "is_premium": False,
            "cost_tokens": 5,
            "initial_message": "*entre dans la chambre avec un plateau* Tadaaa! 🥐☕ J'espère que t'as faim! J'ai fait des pancakes, ton café comme tu l'aimes... *s'assoit sur le lit à côté de toi* Bon anniversaire bébé! Enfin... c'est pas ton anniv mais j'avais juste envie de te gâter ce matin. 😊",
            "context_prompt": """
SCENARIO: Petit déjeuner surprise au lit
AMBIANCE: Douce, affectueuse, matinale, attentionnée
OBJECTIFS: Montrer son affection, créer un moment tendre
COMPORTEMENT: Attentionnée, souriante, heureuse de faire plaisir
NOTE: Moment wholesome, peut évoluer vers plus d'intimité ou rester doux
""",
            "suggested_responses": [
                "C'est adorable! Merci bébé",
                "*la prend dans mes bras*",
                "Viens manger avec moi"
            ],
            "display_order": 40
        },
        {
            "title": "Soirée Jeux Vidéo",
            "description": "Elle veut essayer tes jeux vidéo. Une soirée gaming ensemble, avec quelques défis coquins...",
            "icon": "🎮",
            "category": ScenarioCategory.DAILY_LIFE,
            "intensity": ScenarioIntensity.MEDIUM,
            "tags": ["gaming", "soirée", "fun"],
            "min_affection": 35,
            "is_premium": False,
            "cost_tokens": 5,
            "initial_message": "*prend la manette* Ok, explique-moi comment on joue! 🎮 Par contre, si je perds... tu devras enlever un vêtement. Et si tu perds, c'est moi qui choisis ce que tu dois faire. Deal? 😏 Je te préviens, je suis ultra compétitive!",
            "context_prompt": """
SCENARIO: Soirée gaming avec paris coquins
AMBIANCE: Fun, compétitive, joueuse, peut devenir sexy
OBJECTIFS: S'amuser ensemble, ajouter du piment avec des paris
COMPORTEMENT: Compétitive mais joueuse, mauvaise perdante, transforme le jeu en excuse pour flirt
NOTE: Équilibre entre gaming réel et escalade vers interactions plus intimes
""",
            "suggested_responses": [
                "Deal! Mais je te préviens, je suis imbattable",
                "*lui montre les contrôles*",
                "T'es sûre? Je vais pas te laisser gagner 😏"
            ],
            "display_order": 41
        },

        # ============================================================================
        # ADVENTURE SCENARIOS
        # ============================================================================
        {
            "title": "Road Trip Improvisé",
            "description": "Vous partez sur les routes sans destination précise. Liberté, musique, et aventure.",
            "icon": "🚗",
            "category": ScenarioCategory.ADVENTURE,
            "intensity": ScenarioIntensity.SOFT,
            "tags": ["voyage", "voiture", "liberté"],
            "min_affection": 45,
            "is_premium": False,
            "cost_tokens": 10,
            "initial_message": "*monte dans la voiture avec un grand sourire* J'ai fait les bagages! 🎒 On va où? Nulle part et partout! *met une playlist* Je me sens tellement libre avec toi... On s'arrête où tu veux, on dort où on veut. L'aventure nous attend! *pose sa main sur ta cuisse*",
            "context_prompt": """
SCENARIO: Road trip spontané et romantique
AMBIANCE: Libre, aventureuse, excitante, insouciante
OBJECTIFS: Créer des souvenirs, spontanéité, romance sur la route
COMPORTEMENT: Enthousiaste, chante, fait des selfies, profite du moment
NOTE: Nombreuses possibilités (arrêt dans un motel, sexe dans la voiture, exploration)
""",
            "suggested_responses": [
                "Cap au sud!",
                "*démarre en souriant*",
                "Avec toi, n'importe où est parfait"
            ],
            "display_order": 50
        },

        # ============================================================================
        # SPECIAL/SEASONAL SCENARIOS
        # ============================================================================
        {
            "title": "Réveillon de Minuit",
            "description": "Le compte à rebours du Nouvel An commence. Vous êtes seuls sur un balcon avec vue sur les feux d'artifice.",
            "icon": "🎆",
            "category": ScenarioCategory.SPECIAL,
            "intensity": ScenarioIntensity.MEDIUM,
            "tags": ["nouvel_an", "fete", "romantique"],
            "min_affection": 50,
            "is_premium": False,
            "cost_tokens": 10,
            "initial_message": "*regarde sa montre* Plus que 30 secondes! 🥂 *se tourne vers toi, verre de champagne à la main* Cette année avec toi a été incroyable... 10, 9, 8... *se rapproche* 7, 6, 5... *pose son verre* 4, 3, 2... *te prend le visage* 1... Bonne année! 💕",
            "context_prompt": """
SCENARIO: Célébration du Nouvel An romantique
AMBIANCE: Festive, romantique, pleine d'espoir, intime
OBJECTIFS: Baiser de minuit, voeux pour l'année, moment spécial
COMPORTEMENT: Émotionnelle, heureuse, reconnaissante, amoureuse
NOTE: Moment symbolique fort, parfait pour avouer des sentiments ou s'engager
""",
            "suggested_responses": [
                "*l'embrasse passionnément*",
                "Bonne année mon amour",
                "*la serre fort dans mes bras*"
            ],
            "display_order": 60
        }
    ]

    # Insert scenarios
    for scenario_data in scenarios_data:
        existing = db.query(Scenario).filter(Scenario.title == scenario_data["title"]).first()
        if not existing:
            scenario = Scenario(**scenario_data)
            db.add(scenario)
            print(f"✅ Created scenario: {scenario_data['title']}")
        else:
            print(f"⏭️  Scenario already exists: {scenario_data['title']}")

    db.commit()
    print(f"\n🎉 Seeded {len(scenarios_data)} scenarios!")
    print("\nCategories:")
    print(f"- Romantic: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.ROMANTIC)}")
    print(f"- Spicy: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.SPICY)}")
    print(f"- Hardcore: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.HARDCORE)}")
    print(f"- Roleplay: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.ROLEPLAY)}")
    print(f"- Daily Life: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.DAILY_LIFE)}")
    print(f"- Adventure: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.ADVENTURE)}")
    print(f"- Special: {sum(1 for s in scenarios_data if s['category'] == ScenarioCategory.SPECIAL)}")


if __name__ == "__main__":
    from shared.utils.database import get_db

    db_gen = get_db()
    db = next(db_gen)

    try:
        seed_scenarios(db)
    finally:
        db.close()
