#!/bin/bash
# Script pour arrêter les services locaux

set -e

echo "🛑 Arrêt des services Dream AI Girl"
echo "===================================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Arrêter API Gateway
if [ -f "backend/logs/api-gateway.pid" ]; then
    PID=$(cat backend/logs/api-gateway.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} API Gateway arrêté (PID: $PID)"
    else
        echo -e "${RED}✗${NC} API Gateway déjà arrêté"
    fi
    rm -f backend/logs/api-gateway.pid
fi

# Arrêter Frontend
if [ -f "backend/logs/frontend.pid" ]; then
    PID=$(cat backend/logs/frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Frontend arrêté (PID: $PID)"
    else
        echo -e "${RED}✗${NC} Frontend déjà arrêté"
    fi
    rm -f backend/logs/frontend.pid
fi

# Tuer tous les processus uvicorn et node restants (sécurité)
pkill -f "uvicorn.*main:app" 2>/dev/null && echo -e "${GREEN}✓${NC} Processus uvicorn nettoyés" || true
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}✓${NC} Processus Next.js nettoyés" || true

echo ""
echo -e "${GREEN}✓ Tous les services sont arrêtés${NC}"
