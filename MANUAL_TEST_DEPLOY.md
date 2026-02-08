# 🧪 Test Deployment Manuel - Instructions

## ✅ Fichiers Prêts

Tous les fichiers nécessaires sont créés:
- ✅ `backend/test_server.py` - Serveur Python minimal (sans dépendances)
- ✅ `backend/.env` - Configuration dev
- ✅ `quick-test.sh` - Script automatique

---

## 🚀 Méthode 1: Lancement Rapide (Recommandé)

### Commandes à Exécuter

```bash
# 1. Aller dans le répertoire du projet
cd /data/data/com.termux/files/home/downloads/dream-ai-refactored

# 2. Arrêter les serveurs existants (si présents)
pkill -f "test_server.py"
sleep 1

# 3. Démarrer le serveur de test
python3 backend/test_server.py 8000 &

# Note: Le & à la fin lance en arrière-plan
# Le serveur s'affichera et restera actif
```

### Résultat Attendu

Vous devriez voir:

```
============================================================
🚀 Dream AI Girl - Test Server
============================================================

✓ Server running on: http://localhost:8000
✓ Health check: http://localhost:8000/health
✓ Test endpoint: http://localhost:8000/api/v1/test

📝 Logs:
```

---

## 🧪 Méthode 2: Tester sans Arrière-Plan

Si vous voulez voir les logs en temps réel:

```bash
cd /data/data/com.termux/files/home/downloads/dream-ai-refactored

# Lancer en premier plan (voir les logs)
python3 backend/test_server.py 8000

# Le serveur affichera chaque requête reçue
# Appuyez sur Ctrl+C pour arrêter
```

---

## ✅ Vérifier que ça Fonctionne

### Test 1: Health Check

Dans un **nouveau terminal Termux**:

```bash
curl http://localhost:8000/health
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T...",
  "services": {
    "api": "up",
    "mode": "test"
  },
  "note": "Test deployment - Python HTTP server"
}
```

### Test 2: Root Endpoint

```bash
curl http://localhost:8000/
```

**Réponse attendue:**
```json
{
  "message": "Dream AI Girl API - Test Server",
  "version": "1.0.0-test",
  "status": "operational",
  "docs": "/docs",
  "endpoints": [
    "GET /",
    "GET /health",
    "GET /ping",
    "GET /api/v1/test",
    "POST /api/v1/auth/register (test)"
  ],
  "timestamp": "2026-02-08T..."
}
```

### Test 3: Test Endpoint

```bash
curl http://localhost:8000/api/v1/test
```

**Réponse attendue:**
```json
{
  "status": "ok",
  "message": "API Gateway fonctionnel! ✓",
  "features": [
    "✓ API REST basique",
    "✓ Health checks",
    "✓ CORS enabled",
    "✓ JSON responses",
    "✓ Mode test (sans DB)"
  ],
  "next_steps": [
    "1. Tester: curl http://localhost:8000/health",
    "2. Voir docs: http://localhost:8000/docs (si FastAPI)",
    "3. Déployer production: docker-compose up"
  ]
}
```

### Test 4: Register Endpoint (POST)

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!","age":25}'
```

**Réponse attendue:**
```json
{
  "message": "Registration successful (test mode)",
  "user_id": 1,
  "username": "testuser",
  "access_token": "test-token-testuser",
  "token_type": "bearer",
  "note": "Mode test - pas de vraie authentification"
}
```

---

## 🌐 Ouvrir dans le Navigateur

Si vous êtes sur Termux avec accès à un navigateur:

1. Ouvrir Chrome ou votre navigateur
2. Aller à: `http://localhost:8000`
3. Vous verrez les infos de l'API en JSON

---

## 🛑 Arrêter le Serveur

### Si lancé en arrière-plan (&):

```bash
# Trouver le PID
ps aux | grep test_server.py

# Ou plus simple:
pkill -f test_server.py
```

### Si lancé en premier plan:

Appuyez sur **Ctrl + C**

---

## 📊 Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/` | GET | Info API |
| `/health` | GET | Health check |
| `/ping` | GET | Ping test |
| `/api/v1/test` | GET | Test complet |
| `/api/v1/auth/register` | POST | Register (test mode) |

---

## ⚠️ Limitations du Mode Test

Ce serveur de test est **minimal** et destiné à **vérifier le déploiement** uniquement:

- ❌ Pas de vraie base de données
- ❌ Pas d'authentification réelle
- ❌ Pas de WebSocket
- ❌ Pas de génération d'images/vidéos/voix
- ✅ Mais prouve que l'API peut démarrer et répondre!

Pour un déploiement **complet avec toutes les features**, utilisez Docker:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎯 Prochaines Étapes

Une fois le test validé (serveur répond aux curl):

1. **Installer FastAPI pour version complète:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn sqlalchemy pydantic python-jose passlib
   ```

2. **Lancer l'API Gateway complète:**
   ```bash
   cd services/api_gateway
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Ou déployer en production avec Docker:**
   Voir `DEPLOY_GUIDE.md`

---

## 🆘 Dépannage

### Erreur "Address already in use"

```bash
# Port 8000 déjà utilisé
pkill -f test_server.py
# ou
lsof -ti:8000 | xargs kill -9

# Puis relancer
python3 backend/test_server.py 8000 &
```

### Erreur "curl: command not found"

Installer curl sur Termux:
```bash
pkg install curl
```

### Le serveur ne répond pas

Vérifier qu'il tourne:
```bash
ps aux | grep test_server.py

# Si rien, le relancer:
python3 backend/test_server.py 8000 &
```

---

## ✅ Checklist de Validation

- [ ] Serveur démarre sans erreur
- [ ] `curl http://localhost:8000/health` retourne "healthy"
- [ ] `curl http://localhost:8000/` retourne les infos API
- [ ] `curl http://localhost:8000/api/v1/test` retourne "ok"
- [ ] POST register retourne un token test

**Si tous les checks passent: ✅ DÉPLOIEMENT TEST RÉUSSI!**

---

## 📞 Support

Si problème:
1. Vérifier logs serveur (s'affichent dans le terminal)
2. Vérifier Python version: `python3 --version` (doit être 3.8+)
3. Consulter `DEPLOY_GUIDE.md` pour déploiement complet
4. Contacter: tech@dreamaigirl.com

---

**Date:** 2026-02-08
**Version:** Test Deployment v1.0
