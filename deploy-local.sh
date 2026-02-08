#!/bin/bash
# Script de déploiement local (Termux/Local sans Docker)
# Démarre les services essentiels sans GPU

set -e

echo "🚀 Déploiement Local Dream AI Girl"
echo "=================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Répertoire du projet
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${GREEN}✓${NC} Répertoire du projet: $PROJECT_DIR"

# Fonction pour vérifier les dépendances
check_dependencies() {
    echo ""
    echo "📋 Vérification des dépendances..."

    # Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION"
    else
        echo -e "${RED}✗${NC} Python 3.11+ requis"
        exit 1
    fi

    # pip
    if command -v pip3 &> /dev/null; then
        echo -e "${GREEN}✓${NC} pip disponible"
    else
        echo -e "${RED}✗${NC} pip requis"
        exit 1
    fi

    # Node.js (optionnel pour frontend)
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
        HAS_NODE=true
    else
        echo -e "${YELLOW}⚠${NC} Node.js non disponible (frontend désactivé)"
        HAS_NODE=false
    fi
}

# Fonction pour setup environnement
setup_environment() {
    echo ""
    echo "🔧 Configuration de l'environnement..."

    # Créer .env si absent
    if [ ! -f backend/.env ]; then
        echo -e "${YELLOW}⚠${NC} Création de backend/.env depuis .env.example..."
        cp backend/.env.example backend/.env 2>/dev/null || echo "SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
DATABASE_URL=sqlite:///./dev.db
REDIS_URL=redis://localhost:6379/0
OPENROUTER_API_KEY=your-key-here
DEBUG=True
ENVIRONMENT=development" > backend/.env
        echo -e "${GREEN}✓${NC} Fichier .env créé"
    else
        echo -e "${GREEN}✓${NC} Fichier .env existe"
    fi
}

# Fonction pour installer dépendances backend
install_backend_deps() {
    echo ""
    echo "📦 Installation des dépendances backend..."

    cd "$PROJECT_DIR/backend"

    # Créer venv si absent
    if [ ! -d "venv" ]; then
        echo "Création de l'environnement virtuel..."
        python3 -m venv venv
    fi

    # Activer venv
    source venv/bin/activate

    # Installer dépendances minimales
    echo "Installation des packages Python..."
    pip install --quiet --upgrade pip
    pip install --quiet fastapi uvicorn pydantic sqlalchemy redis python-jose passlib python-multipart

    echo -e "${GREEN}✓${NC} Dépendances backend installées"
}

# Fonction pour démarrer API Gateway
start_api_gateway() {
    echo ""
    echo "🚀 Démarrage de l'API Gateway..."

    cd "$PROJECT_DIR/backend"
    source venv/bin/activate

    # Créer répertoire logs
    mkdir -p logs

    # Démarrer API Gateway en arrière-plan
    cd services/api_gateway
    nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../../logs/api-gateway.log 2>&1 &
    API_PID=$!

    echo $API_PID > ../../logs/api-gateway.pid
    echo -e "${GREEN}✓${NC} API Gateway démarré (PID: $API_PID)"
    echo "   Logs: backend/logs/api-gateway.log"
    echo "   URL: http://localhost:8000"
}

# Fonction pour démarrer Frontend (si Node disponible)
start_frontend() {
    if [ "$HAS_NODE" = true ]; then
        echo ""
        echo "🎨 Démarrage du Frontend..."

        cd "$PROJECT_DIR/frontend"

        # Installer dépendances si nécessaire
        if [ ! -d "node_modules" ]; then
            echo "Installation des packages npm..."
            npm install --silent
        fi

        # Créer .env.local si absent
        if [ ! -f ".env.local" ]; then
            echo "NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8002" > .env.local
        fi

        # Démarrer en dev mode
        mkdir -p ../backend/logs
        nohup npm run dev > ../backend/logs/frontend.log 2>&1 &
        FRONTEND_PID=$!

        echo $FRONTEND_PID > ../backend/logs/frontend.pid
        echo -e "${GREEN}✓${NC} Frontend démarré (PID: $FRONTEND_PID)"
        echo "   Logs: backend/logs/frontend.log"
        echo "   URL: http://localhost:3000"
    fi
}

# Fonction pour afficher le statut
show_status() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✓ Déploiement terminé!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📌 Services démarrés:"
    echo "   • API Gateway: http://localhost:8000"
    echo "   • API Docs: http://localhost:8000/docs"
    if [ "$HAS_NODE" = true ]; then
        echo "   • Frontend: http://localhost:3000"
    fi
    echo ""
    echo "📝 Logs:"
    echo "   • tail -f backend/logs/api-gateway.log"
    if [ "$HAS_NODE" = true ]; then
        echo "   • tail -f backend/logs/frontend.log"
    fi
    echo ""
    echo "🛑 Pour arrêter:"
    echo "   ./stop-local.sh"
    echo ""
    echo "⚠️  Note: Services GPU (SDXL, AnimateDiff) non disponibles sur Termux"
    echo "   Pour utiliser ces services, déployez sur un serveur avec GPU"
    echo ""
}

# Fonction pour vérifier la santé
check_health() {
    echo "🏥 Vérification de la santé des services..."
    sleep 3

    if curl -s http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}✓${NC} API Gateway: OK"
    else
        echo -e "${YELLOW}⚠${NC} API Gateway: En cours de démarrage..."
    fi
}

# Exécution principale
main() {
    check_dependencies
    setup_environment
    install_backend_deps
    start_api_gateway
    start_frontend
    check_health
    show_status
}

# Lancer le déploiement
main
