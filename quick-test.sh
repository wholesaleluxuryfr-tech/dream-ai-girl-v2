#!/bin/bash
# Quick test deployment - Serveur Python pur (sans dépendances)

echo "🧪 QUICK TEST DEPLOYMENT"
echo "========================"
echo ""

cd "$(dirname "$0")"

# Arrêter serveurs existants
pkill -f "test_server.py" 2>/dev/null || true
pkill -f "uvicorn.*main:app" 2>/dev/null || true
sleep 1

# Lancer serveur test en arrière-plan
mkdir -p backend/logs
echo "🚀 Démarrage serveur test..."
nohup python3 backend/test_server.py 8000 > backend/logs/test-server.log 2>&1 &
SERVER_PID=$!

echo "✓ Serveur démarré (PID: $SERVER_PID)"
echo "  Logs: backend/logs/test-server.log"
echo ""

# Attendre démarrage
echo "⏳ Attente démarrage (3 secondes)..."
sleep 3

# Test health check
echo ""
echo "🏥 Test de santé..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Serveur opérationnel!"
    echo ""
    echo "📊 Réponse:"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/health
else
    echo "⚠️  Serveur en cours de démarrage..."
    echo "   Réessayez: curl http://localhost:8000/health"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ DÉPLOIEMENT TEST ACTIF"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 URL: http://localhost:8000"
echo ""
echo "🧪 Commandes test:"
echo "  curl http://localhost:8000"
echo "  curl http://localhost:8000/health"
echo "  curl http://localhost:8000/api/v1/test"
echo ""
echo "📝 Voir logs:"
echo "  tail -f backend/logs/test-server.log"
echo ""
echo "🛑 Arrêter:"
echo "  kill $SERVER_PID"
echo "  ou: pkill -f test_server.py"
echo ""

# Sauvegarder PID
echo $SERVER_PID > backend/logs/test-server.pid
