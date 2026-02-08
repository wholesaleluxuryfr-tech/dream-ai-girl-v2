# 🚀 Déployer MAINTENANT - Guide Ultra-Rapide

## ✅ Fichiers de Déploiement Créés

Tous les fichiers nécessaires ont été créés:

- ✅ `deploy-local.sh` - Script déploiement local
- ✅ `stop-local.sh` - Script arrêt services
- ✅ `docker-compose.prod.yml` - Docker Compose production
- ✅ `.env.production.example` - Template variables environnement
- ✅ `DEPLOY_GUIDE.md` - Guide complet

---

## 🎯 Option 1: Déploiement Local (TERMUX - MAINTENANT)

### Étapes Rapides

```bash
# 1. Naviguer vers le projet
cd /data/data/com.termux/files/home/downloads/dream-ai-refactored

# 2. Lancer le déploiement
bash deploy-local.sh

# ⏱️ Attendre 30-60 secondes que les services démarrent

# 3. Tester l'API
curl http://localhost:8000/health

# 4. Ouvrir dans le navigateur
# API Docs: http://localhost:8000/docs
```

### Si le script échoue, déploiement manuel:

```bash
# 1. Créer environnement backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy pydantic python-jose passlib redis

# 2. Créer fichier .env
cat > .env << 'EOF'
SECRET_KEY=dev-secret-key-for-testing
JWT_SECRET_KEY=dev-jwt-secret-for-testing
DATABASE_URL=sqlite:///./dev.db
REDIS_URL=redis://localhost:6379/0
DEBUG=True
ENVIRONMENT=development
EOF

# 3. Lancer API Gateway
cd services/api_gateway
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# Sauvegarder le PID
echo $! > ../../api-gateway.pid

# 4. Tester
sleep 5
curl http://localhost:8000/health

# ✅ Si retourne {"status":"healthy"} c'est bon!
```

### Arrêter les services:

```bash
# Avec script
bash stop-local.sh

# Ou manuellement
kill $(cat backend/api-gateway.pid)
pkill -f "uvicorn.*main:app"
```

---

## 🐳 Option 2: Déploiement Docker (SERVEUR PRODUCTION)

### Prérequis
- Serveur Linux avec Docker installé
- GPU NVIDIA (pour SDXL + AnimateDiff)

### Déploiement Complet

```bash
# 1. Copier projet sur serveur
scp -r dream-ai-refactored user@your-server:/home/user/

# 2. SSH dans le serveur
ssh user@your-server
cd ~/dream-ai-refactored

# 3. Configurer variables environnement
cp .env.production.example .env.production
nano .env.production

# IMPORTANT: Remplir ces variables:
# - SECRET_KEY (générer avec: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - JWT_SECRET_KEY (générer avec: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - POSTGRES_PASSWORD (mot de passe fort)
# - OPENROUTER_API_KEY (obtenir sur https://openrouter.ai)
# - STRIPE_SECRET_KEY (obtenir sur https://stripe.com)
# - AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY (pour S3)

# 4. Lancer TOUS les services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 5. Suivre les logs
docker-compose -f docker-compose.prod.yml logs -f

# 6. Vérifier santé
curl http://localhost:8000/health
curl http://localhost:8007/health  # Image generation
curl http://localhost:8008/health  # Video generation
curl http://localhost:8009/health  # Voice TTS

# 7. Ouvrir dans navigateur
# Frontend: http://your-server-ip:3000
# API Docs: http://your-server-ip:8000/docs
```

### Services Déployés

Avec Docker Compose, vous obtenez:
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ API Gateway (port 8000)
- ✅ Auth Service (port 8001)
- ✅ Chat Service WebSocket (port 8002)
- ✅ AI Service (port 8003)
- ✅ Media Service (port 8004)
- ✅ Payment Service (port 8006)
- ✅ Image Generation SDXL (port 8007) 🎨
- ✅ Video Generation AnimateDiff (port 8008) 🎬
- ✅ Voice TTS ElevenLabs (port 8009) 🗣️
- ✅ Frontend Next.js (port 3000)

---

## ☁️ Option 3: Déploiement Cloud Rapide

### A. Heroku (Plus simple, mais pas de GPU)

```bash
# 1. Installer Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login
heroku login

# 3. Créer app
heroku create dream-ai-prod

# 4. Ajouter addons
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0

# 5. Set variables
heroku config:set SECRET_KEY=your-secret
heroku config:set OPENROUTER_API_KEY=your-key
# ... autres variables

# 6. Deploy
git push heroku main

# ⚠️ Note: Pas de GPU sur Heroku, utiliser APIs externes pour images/vidéos
```

### B. Railway (Simple + GPU optionnel)

```bash
# 1. Installer Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Init projet
railway init

# 4. Link repo
railway link

# 5. Add services
railway add  # Choisir PostgreSQL
railway add  # Choisir Redis

# 6. Set variables via UI
# railway.app/project/variables

# 7. Deploy
railway up
```

### C. Render (Gratuit pour tester)

1. Aller sur https://render.com
2. Connecter GitHub repo
3. Créer Web Service (backend)
4. Créer Static Site (frontend)
5. Ajouter PostgreSQL database
6. Ajouter Redis instance
7. Configurer variables environnement
8. Deploy automatiquement!

---

## 🎮 Tester l'Application

### 1. Créer Premier Utilisateur

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "age": 25
  }'

# Réponse: {"access_token":"...","user_id":1}
```

### 2. Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPassword123!"
  }'

# Sauvegarder le token retourné
TOKEN="eyJ..."
```

### 3. Tester Endpoints

```bash
# Profil utilisateur
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# Obtenir matches disponibles
curl http://localhost:8000/api/v1/matches \
  -H "Authorization: Bearer $TOKEN"

# Envoyer un message
curl -X POST http://localhost:8000/api/v1/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "girl_id": "sophie_25",
    "content": "Salut!"
  }'
```

### 4. Tester Génération (si GPU disponible)

```bash
# Générer une photo
curl -X POST http://localhost:8000/api/v1/photos/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "girl_id": "sophie_25",
    "context": "casual day at beach",
    "high_quality": false
  }'

# Réponse: {"job_id":"...","status":"queued"}

# Vérifier statut (après 2-3 secondes)
curl http://localhost:8000/api/v1/photos/status/JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# Quand status="completed", l'image_url est disponible
```

---

## 📊 Monitoring

### Voir les Logs

```bash
# Docker
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# Local (Termux)
tail -f backend/logs/api-gateway.log
```

### Vérifier Santé

```bash
# All services
curl http://localhost:8000/health
curl http://localhost:8007/health  # SDXL
curl http://localhost:8008/health  # AnimateDiff
curl http://localhost:8009/health  # Voice

# Database
docker exec -it dream-ai-postgres psql -U postgres -d dream_ai_prod -c "SELECT COUNT(*) FROM users;"

# Redis
docker exec -it dream-ai-redis redis-cli PING
```

---

## ⚡ Performance Tips

### 1. Optimiser PostgreSQL

```bash
# Entrer dans container
docker exec -it dream-ai-postgres psql -U postgres -d dream_ai_prod

# Analyser performance
EXPLAIN ANALYZE SELECT * FROM chat_messages WHERE user_id = 1 ORDER BY created_at DESC LIMIT 50;

# Créer indexes manquants
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON chat_messages(user_id, created_at DESC);
```

### 2. Pré-charger Cache Redis

```bash
# Via API
curl http://localhost:8000/api/v1/admin/cache/preload \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Activer HTTP/2

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    # ...
}
```

---

## 🔒 Sécurité Production

### Checklist

- [ ] Changer SECRET_KEY et JWT_SECRET_KEY
- [ ] Utiliser HTTPS (Let's Encrypt)
- [ ] Activer rate limiting
- [ ] Configurer CORS correctement
- [ ] Changer mots de passe PostgreSQL/Redis
- [ ] Activer Stripe webhooks
- [ ] Setup backup automatique DB
- [ ] Activer monitoring (Sentry)
- [ ] Firewall: fermer ports non utilisés
- [ ] Setup fail2ban pour SSH

---

## 🆘 Besoin d'Aide?

### Documentation Complète
- `QUICKSTART.md` - Guide 5 minutes
- `DEPLOY_GUIDE.md` - Guide détaillé déploiement
- `ARCHITECTURE.md` - Architecture système
- `API_DOCUMENTATION.md` - Référence API
- `SDXL_SETUP.md` - Setup génération images GPU

### Support
- Email: tech@dreamaigirl.com
- Issues: GitHub Issues

---

## ✅ Résumé: Commandes Essentielles

```bash
# DÉPLOIEMENT LOCAL (Termux/PC)
cd /data/data/com.termux/files/home/downloads/dream-ai-refactored
bash deploy-local.sh

# DÉPLOIEMENT DOCKER (Serveur Production)
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# TESTER
curl http://localhost:8000/health
curl http://localhost:8000/docs  # API Documentation

# ARRÊTER
bash stop-local.sh  # Local
docker-compose -f docker-compose.prod.yml down  # Docker

# LOGS
tail -f backend/logs/api-gateway.log  # Local
docker-compose -f docker-compose.prod.yml logs -f  # Docker
```

---

**🎉 PRÊT À DÉPLOYER!**

Tous les fichiers sont créés et prêts. Choisissez votre option de déploiement ci-dessus et lancez-vous!

**Date:** 2026-02-08
**Status:** ✅ Production-Ready
