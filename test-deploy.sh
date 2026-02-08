#!/bin/bash
# Script de test déploiement minimal (API Gateway seulement)

set -e

echo "🧪 DÉPLOIEMENT TEST - Dream AI Girl"
echo "===================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${GREEN}✓${NC} Répertoire: $PROJECT_DIR"

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗${NC} Python 3 requis"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓${NC} $PYTHON_VERSION"

# Créer environnement virtuel si absent
cd backend
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Création environnement virtuel..."
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Environnement virtuel créé"
fi

# Activer venv
source venv/bin/activate

# Installer dépendances minimales
echo ""
echo "📦 Installation dépendances..."
pip install --quiet --upgrade pip setuptools wheel 2>/dev/null || true
pip install --quiet fastapi uvicorn pydantic sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart 2>&1 | grep -v "already satisfied" || true
echo -e "${GREEN}✓${NC} Dépendances installées"

# Créer base SQLite si absente
if [ ! -f "dev.db" ]; then
    echo ""
    echo "🗄️  Initialisation base de données..."
    python3 << 'PYEOF'
from sqlalchemy import create_engine, text
import os

# Créer engine SQLite
engine = create_engine("sqlite:///./dev.db")

# Créer table users basique
with engine.connect() as conn:
    conn.execute(text("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        age INTEGER,
        subscription_tier VARCHAR(20) DEFAULT 'free',
        token_balance INTEGER DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """))
    conn.commit()
    print("✓ Table users créée")
print("✓ Base de données initialisée")
PYEOF
    echo -e "${GREEN}✓${NC} Base de données créée"
fi

# Créer un fichier main.py minimal si le service n'existe pas
if [ ! -f "services/api_gateway/app/main.py" ]; then
    echo ""
    echo "⚠️  Service API Gateway non trouvé, création version minimale..."

    mkdir -p services/api_gateway/app

    cat > services/api_gateway/app/main.py << 'APPEOF'
"""
API Gateway Minimal - Test Deployment
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os

app = FastAPI(
    title="Dream AI Girl API - Test",
    version="1.0.0-test",
    description="API Gateway de test"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Dream AI Girl API - Test Deployment",
        "version": "1.0.0-test",
        "status": "operational",
        "docs": "/docs",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api": "up",
            "database": "up" if os.path.exists("dev.db") else "down"
        }
    }

@app.get("/ping")
async def ping():
    """Ping endpoint"""
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat()}

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    age: int

@app.post("/api/v1/auth/register")
async def register(request: RegisterRequest):
    """Register endpoint de test"""
    # Validation basique
    if request.age < 18:
        raise HTTPException(status_code=400, detail="Must be 18 or older")

    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # En test, on retourne juste un token factice
    return {
        "message": "Registration successful (test mode)",
        "user_id": 1,
        "username": request.username,
        "access_token": "test-token-" + request.username,
        "token_type": "bearer"
    }

@app.get("/api/v1/test")
async def test_endpoint():
    """Test endpoint"""
    return {
        "status": "ok",
        "message": "API Gateway fonctionnel!",
        "features": [
            "Authentication (test mode)",
            "Health checks",
            "CORS enabled",
            "SQLite database"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
APPEOF

    echo -e "${GREEN}✓${NC} API Gateway minimal créé"
fi

# Arrêter processus existants
pkill -f "uvicorn.*main:app" 2>/dev/null || true
sleep 1

# Démarrer API Gateway
echo ""
echo "🚀 Démarrage API Gateway..."

cd services/api_gateway

# Lancer en arrière-plan
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../../logs/api-gateway-test.log 2>&1 &
API_PID=$!

# Sauvegarder PID
echo $API_PID > ../../logs/api-gateway-test.pid

echo -e "${GREEN}✓${NC} API Gateway démarré (PID: $API_PID)"
echo "   Logs: backend/logs/api-gateway-test.log"

# Attendre démarrage
echo ""
echo "⏳ Attente démarrage (5 secondes)..."
sleep 5

# Tester health check
echo ""
echo "🏥 Test de santé..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API Gateway: Opérationnel"

    # Afficher réponse
    echo ""
    echo "📊 Statut complet:"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/health
else
    echo -e "${YELLOW}⚠${NC}  API Gateway: Démarrage en cours..."
    echo "   Attendez 10 secondes de plus et testez: curl http://localhost:8000/health"
fi

# Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Déploiement Test Terminé!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Services actifs:"
echo "   • API Gateway: http://localhost:8000"
echo "   • API Docs: http://localhost:8000/docs"
echo "   • Health: http://localhost:8000/health"
echo ""
echo "🧪 Commandes de test:"
echo '   curl http://localhost:8000/health'
echo '   curl http://localhost:8000/api/v1/test'
echo ""
echo "📝 Logs en temps réel:"
echo "   tail -f backend/logs/api-gateway-test.log"
echo ""
echo "🛑 Pour arrêter:"
echo "   bash test-stop.sh"
echo "   ou: kill $API_PID"
echo ""
