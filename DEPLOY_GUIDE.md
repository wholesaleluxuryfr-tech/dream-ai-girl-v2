# 🚀 Guide de Déploiement - Dream AI Girl

## Options de Déploiement

Choisissez l'option qui correspond à votre environnement:

### 1. 📱 Déploiement Local (Termux/PC sans GPU)
Pour tester localement sans GPU (services de base uniquement)

### 2. 🐳 Déploiement Docker (Serveur avec GPU)
Pour production complète avec tous les services

### 3. ☁️ Déploiement Cloud (AWS/GCP/Azure)
Pour scale et haute disponibilité

---

## Option 1: Déploiement Local (Termux/PC)

### Prérequis
- Python 3.11+
- pip
- Node.js 20+ (optionnel, pour frontend)

### Installation Rapide

```bash
# 1. Rendre le script exécutable
chmod +x deploy-local.sh stop-local.sh

# 2. Lancer le déploiement
./deploy-local.sh

# 3. Attendre 30 secondes que les services démarrent

# 4. Ouvrir dans le navigateur
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
# Frontend: http://localhost:3000 (si Node.js disponible)
```

### Tester l'API

```bash
# Health check
curl http://localhost:8000/health

# Devrait retourner:
# {"status":"healthy","services":{"postgres":"up","redis":"up"}}
```

### Arrêter les Services

```bash
./stop-local.sh
```

### ⚠️ Limitations
- Pas de génération d'images (SDXL nécessite GPU)
- Pas de génération de vidéos (AnimateDiff nécessite GPU)
- SQLite au lieu de PostgreSQL
- Redis optionnel (mock si absent)

---

## Option 2: Déploiement Docker (Production avec GPU)

### Prérequis

**Hardware:**
- Serveur Linux (Ubuntu 22.04 recommandé)
- GPU NVIDIA (RTX 3090/4090/A100 pour SDXL+AnimateDiff)
- 32GB RAM minimum
- 100GB SSD

**Software:**
- Docker 24+
- Docker Compose 2.x
- NVIDIA Container Runtime (pour GPU)

### 1. Setup Serveur

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Tester GPU
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### 2. Configurer Variables d'Environnement

```bash
# Copier le template
cp .env.production.example .env.production

# Éditer avec vos clés
nano .env.production
```

**Variables OBLIGATOIRES à remplir:**
- `SECRET_KEY` - Générer avec: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- `JWT_SECRET_KEY` - Générer avec: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- `POSTGRES_PASSWORD` - Mot de passe fort pour PostgreSQL
- `OPENROUTER_API_KEY` - Obtenir sur https://openrouter.ai/keys
- `STRIPE_SECRET_KEY` - Obtenir sur https://stripe.com
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` - Pour S3
- `ELEVENLABS_API_KEY` - Obtenir sur https://elevenlabs.io

### 3. Lancer tous les Services

```bash
# Build et démarrer
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Suivre les logs
docker-compose -f docker-compose.prod.yml logs -f

# Vérifier le statut
docker-compose -f docker-compose.prod.yml ps
```

### 4. Vérifier le Déploiement

```bash
# Health check API
curl http://localhost:8000/health

# Health check services GPU
curl http://localhost:8007/health  # Image generation
curl http://localhost:8008/health  # Video generation
curl http://localhost:8009/health  # Voice TTS

# Tous doivent retourner: {"status":"healthy"}
```

### 5. Accéder à l'Application

- **Frontend**: http://your-server-ip:3000
- **API**: http://your-server-ip:8000
- **API Docs**: http://your-server-ip:8000/docs

### 6. Setup Base de Données

```bash
# Entrer dans le conteneur
docker exec -it dream-ai-postgres psql -U postgres -d dream_ai_prod

# Vérifier les tables
\dt

# Devrait afficher: users, matches, chat_messages, etc.
\q
```

### Commandes Utiles

```bash
# Voir tous les services
docker-compose -f docker-compose.prod.yml ps

# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart api-gateway

# Voir les logs d'un service
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# Arrêter tout
docker-compose -f docker-compose.prod.yml down

# Arrêter et supprimer volumes (⚠️ efface données)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild après modification code
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Option 3: Déploiement Cloud

### AWS Deployment

**Services utilisés:**
- ECS/EKS pour containers
- RDS PostgreSQL
- ElastiCache Redis
- S3 + CloudFront
- EC2 avec GPU (p3.2xlarge) pour SDXL/AnimateDiff

**Guide rapide:**

```bash
# 1. Créer cluster ECS
aws ecs create-cluster --cluster-name dream-ai-prod

# 2. Créer RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier dream-ai-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR-PASSWORD

# 3. Créer S3 bucket
aws s3 mb s3://dream-ai-media

# 4. Push images Docker vers ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ECR-URL
docker tag dream-ai-api-gateway:latest YOUR-ECR-URL/dream-ai-api-gateway:latest
docker push YOUR-ECR-URL/dream-ai-api-gateway:latest

# 5. Déployer via ECS
# (Utiliser les fichiers dans k8s/ directory)
```

### GCP Deployment

**Services utilisés:**
- GKE (Kubernetes Engine)
- Cloud SQL (PostgreSQL)
- Memorystore (Redis)
- Cloud Storage + CDN
- GPU instances pour SDXL

**Guide rapide:**

```bash
# 1. Créer cluster GKE avec GPU
gcloud container clusters create dream-ai-cluster \
  --accelerator type=nvidia-tesla-t4,count=1 \
  --machine-type n1-standard-4 \
  --num-nodes 3

# 2. Déployer les manifests
kubectl apply -f k8s/
```

### Vercel (Frontend uniquement)

Pour déployer juste le frontend sur Vercel:

```bash
cd frontend

# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod
```

**Variables d'environnement Vercel:**
- `NEXT_PUBLIC_API_URL` - URL de votre API backend
- `NEXT_PUBLIC_WS_URL` - URL WebSocket
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Clé Stripe

---

## GPU Setup (SDXL + AnimateDiff)

### Option A: Serveur GPU dédié

**Providers recommandés:**
- **RunPod**: $0.39/h (RTX 4090)
- **Vast.ai**: $0.25/h (RTX 4090)
- **Lambda Labs**: $1.10/h (A100)

```bash
# 1. Louer instance GPU
# 2. SSH dans l'instance
# 3. Installer Docker + NVIDIA Runtime
# 4. Cloner repo
git clone https://github.com/youruser/dream-ai-refactored.git
cd dream-ai-refactored

# 5. Lancer services GPU uniquement
docker-compose -f docker-compose.prod.yml up -d image-generation video-generation

# 6. Exposer via tunnel (si pas d'IP publique)
# Utiliser ngrok ou cloudflare tunnel
```

### Option B: GPU Local

Si vous avez une carte NVIDIA locale:

```bash
# 1. Installer CUDA 12.1
# 2. Installer NVIDIA Container Toolkit
# 3. Lancer services GPU
docker-compose -f docker-compose.prod.yml up -d image-generation video-generation
```

### Option C: Sans GPU (APIs externes)

Si pas de GPU, continuer à utiliser les APIs externes:
- Promptchan/SinKin pour images
- Pas de vidéos (ou utiliser Replicate API)

---

## Post-Déploiement

### 1. Créer Utilisateur Admin

```bash
# Via API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@dreamaigirl.com",
    "password": "SecurePassword123!",
    "age": 25
  }'
```

### 2. Setup Stripe Webhooks

```bash
# 1. Aller sur Stripe Dashboard
# 2. Developers > Webhooks
# 3. Ajouter endpoint: https://yourdomain.com/api/v1/payment/webhook
# 4. Sélectionner événements:
#    - payment_intent.succeeded
#    - customer.subscription.created
#    - customer.subscription.updated
#    - customer.subscription.deleted
# 5. Copier signing secret dans STRIPE_WEBHOOK_SECRET
```

### 3. Setup DNS

```bash
# A Records
api.yourdomain.com -> Server IP
chat.yourdomain.com -> Server IP
www.yourdomain.com -> Server IP

# CNAME (si CloudFront)
media.yourdomain.com -> d1234.cloudfront.net
```

### 4. Setup HTTPS (Let's Encrypt)

```bash
# Installer Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtenir certificats
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renouvellement
sudo certbot renew --dry-run
```

### 5. Setup Monitoring

```bash
# Activer Prometheus + Grafana dans docker-compose
# Uncomment les lignes prometheus et grafana

# Redémarrer
docker-compose -f docker-compose.prod.yml up -d

# Accéder Grafana: http://localhost:3001
# Login: admin / admin
```

---

## Troubleshooting

### Services ne démarrent pas

```bash
# Voir logs détaillés
docker-compose -f docker-compose.prod.yml logs api-gateway

# Vérifier santé
docker-compose -f docker-compose.prod.yml ps

# Rebuild depuis zéro
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

### GPU non détecté

```bash
# Tester GPU
nvidia-smi

# Tester Docker GPU
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# Redémarrer Docker
sudo systemctl restart docker
```

### Base de données vide

```bash
# Exécuter migrations
docker exec -it dream-ai-postgres psql -U postgres -d dream_ai_prod -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### Ports déjà utilisés

```bash
# Trouver processus sur port 8000
lsof -i :8000

# Tuer processus
kill -9 <PID>
```

---

## Maintenance

### Backup Base de Données

```bash
# Backup
docker exec dream-ai-postgres pg_dump -U postgres dream_ai_prod > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i dream-ai-postgres psql -U postgres dream_ai_prod < backup_20260208.sql
```

### Mise à Jour

```bash
# 1. Pull nouveau code
git pull origin main

# 2. Rebuild services modifiés
docker-compose -f docker-compose.prod.yml up -d --build api-gateway

# 3. Vérifier
curl http://localhost:8000/health
```

---

## Support

**Documentation:**
- QUICKSTART.md - Guide démarrage rapide
- ARCHITECTURE.md - Architecture détaillée
- API_DOCUMENTATION.md - Référence API
- SDXL_SETUP.md - Setup génération images

**Problèmes:**
- GitHub Issues: https://github.com/youruser/dream-ai-refactored/issues
- Email: tech@dreamaigirl.com

---

**Dernière mise à jour:** 2026-02-08
