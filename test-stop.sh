#!/bin/bash
# Arrêter le déploiement test

echo "🛑 Arrêt du déploiement test..."

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Arrêter via PID
if [ -f "backend/logs/api-gateway-test.pid" ]; then
    PID=$(cat backend/logs/api-gateway-test.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} API Gateway arrêté (PID: $PID)"
    else
        echo -e "${RED}✗${NC} Processus déjà arrêté"
    fi
    rm -f backend/logs/api-gateway-test.pid
fi

# Cleanup sécurité
pkill -f "uvicorn.*main:app" 2>/dev/null && echo -e "${GREEN}✓${NC} Processus uvicorn nettoyés" || true

echo ""
echo -e "${GREEN}✓ Services arrêtés${NC}"
