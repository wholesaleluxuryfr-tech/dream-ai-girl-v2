# Deployment Guide - Dream AI Girl

Complete guide for deploying Dream AI Girl to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Post-Deployment](#post-deployment)
8. [Monitoring](#monitoring)
9. [Rollback](#rollback)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Infrastructure Requirements

**Minimum (Development):**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- 1 Mbps bandwidth

**Recommended (Production):**
- 8 CPU cores
- 16GB RAM
- 100GB SSD storage
- 10 Mbps bandwidth
- Load balancer
- CDN configured

### Software Requirements

- Docker 24+
- Docker Compose 2.20+
- Kubernetes 1.28+ (production)
- kubectl configured
- PostgreSQL 15+
- Redis 7+
- Node.js 20+
- Python 3.11+

### External Services

- **AWS S3** - Media storage
- **CloudFront** - CDN
- **Stripe** - Payment processing
- **OpenRouter** - AI API
- **Pinecone** - Vector database
- **Sentry** - Error tracking
- **Datadog** - Monitoring

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/dream-ai-refactored.git
cd dream-ai-refactored
```

### 2. Configure Environment Variables

#### Backend (.env)

```bash
# Copy template
cp backend/.env.example backend/.env

# Edit with production values
nano backend/.env
```

**Required Variables:**

```env
# Application
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=<generate-strong-secret-key>
JWT_SECRET_KEY=<generate-jwt-secret-key>

# Database
POSTGRES_URL=postgresql://user:password@postgres:5432/dream_ai_prod
REDIS_URL=redis://redis:6379/0

# External APIs
OPENROUTER_API_KEY=sk-or-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PINECONE_API_KEY=...
ELEVENLABS_API_KEY=...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=dream-ai-media-prod
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...
MIXPANEL_TOKEN=...

# Payment Stripe Price IDs
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_ELITE_PRICE_ID=price_...
```

#### Frontend (.env.local)

```bash
# Copy template
cp frontend/.env.example frontend/.env.local

# Edit with production values
nano frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.dreamaigirl.com
NEXT_PUBLIC_WS_URL=https://chat.dreamaigirl.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 3. Generate Secrets

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Database Migration

### 1. Setup PostgreSQL

```bash
# Create database
createdb dream_ai_prod

# Or via psql
psql -U postgres
CREATE DATABASE dream_ai_prod;
CREATE USER dream_ai_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE dream_ai_prod TO dream_ai_user;
\q
```

### 2. Run Migrations

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run migrations
python -m alembic upgrade head

# Or using migration SQL files
psql -U dream_ai_user -d dream_ai_prod < shared/migrations/001_initial_schema.sql
psql -U dream_ai_user -d dream_ai_prod < shared/migrations/002_add_gamification.sql
psql -U dream_ai_user -d dream_ai_prod < shared/migrations/003_seed_scenarios.sql
psql -U dream_ai_user -d dream_ai_prod < shared/migrations/004_create_payment_tables.sql
psql -U dream_ai_user -d dream_ai_prod < shared/migrations/005_performance_indexes.sql
```

### 3. Seed Data

```bash
# Run seed script
python scripts/seed_data.py

# Or manually
psql -U dream_ai_user -d dream_ai_prod < scripts/seed_girls.sql
```

---

## Docker Deployment

### 1. Build Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Or build individually
docker build -t dream-ai-frontend:latest ./frontend
docker build -t dream-ai-backend:latest ./backend
```

### 2. Push to Registry

```bash
# Login to Docker Hub
docker login

# Tag images
docker tag dream-ai-frontend:latest yourusername/dream-ai-frontend:latest
docker tag dream-ai-backend:latest yourusername/dream-ai-backend:latest

# Push images
docker push yourusername/dream-ai-frontend:latest
docker push yourusername/dream-ai-backend:latest
```

### 3. Deploy with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart api-gateway

# Stop all services
docker-compose down
```

### 4. Docker Compose Production File

```yaml
# docker-compose.prod.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dream_ai_prod
      POSTGRES_USER: dream_ai_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dream_ai_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api-gateway:
    image: yourusername/dream-ai-backend:latest
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${POSTGRES_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    image: yourusername/dream-ai-frontend:latest
    environment:
      - NEXT_PUBLIC_API_URL=${API_URL}
    ports:
      - "3000:3000"
    restart: always

volumes:
  postgres_data:
  redis_data:
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace dream-ai-prod
kubectl config set-context --current --namespace=dream-ai-prod
```

### 2. Create Secrets

```bash
# Database credentials
kubectl create secret generic db-credentials \
  --from-literal=username=dream_ai_user \
  --from-literal=password=secure_password \
  --from-literal=database=dream_ai_prod

# API keys
kubectl create secret generic api-keys \
  --from-literal=openrouter-key=$OPENROUTER_API_KEY \
  --from-literal=stripe-secret=$STRIPE_SECRET_KEY \
  --from-literal=jwt-secret=$JWT_SECRET_KEY
```

### 3. Deploy Database

```yaml
# k8s/postgres-deployment.yaml

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: database
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

```bash
kubectl apply -f k8s/postgres-deployment.yaml
```

### 4. Deploy Backend Services

```yaml
# k8s/api-gateway-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: yourusername/dream-ai-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://$(DB_USER):$(DB_PASS)@postgres:5432/$(DB_NAME)"
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

```bash
kubectl apply -f k8s/api-gateway-deployment.yaml
```

### 5. Deploy Frontend

```yaml
# k8s/frontend-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: yourusername/dream-ai-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.dreamaigirl.com"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

```bash
kubectl apply -f k8s/frontend-deployment.yaml
```

### 6. Setup Ingress

```yaml
# k8s/ingress.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dream-ai-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - dreamaigirl.com
    - api.dreamaigirl.com
    secretName: dream-ai-tls
  rules:
  - host: dreamaigirl.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
  - host: api.dreamaigirl.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

```bash
kubectl apply -f k8s/ingress.yaml
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod
```

### Option 3: Self-Hosted

```bash
# Build production
cd frontend
npm run build

# Start with PM2
pm2 start npm --name "dream-ai-frontend" -- start
pm2 save
pm2 startup
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check backend health
curl https://api.dreamaigirl.com/health

# Check frontend
curl https://dreamaigirl.com

# Check specific services
curl https://api.dreamaigirl.com/api/v1/health
```

### 2. Run Smoke Tests

```bash
# Test authentication
curl -X POST https://api.dreamaigirl.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"testuser","password":"TestPass123!"}'

# Test matches endpoint
curl https://api.dreamaigirl.com/api/v1/matches \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Configure DNS

```bash
# Add DNS records:
# A record: dreamaigirl.com -> Load Balancer IP
# A record: api.dreamaigirl.com -> Load Balancer IP
# CNAME: www.dreamaigirl.com -> dreamaigirl.com
```

### 4. Setup SSL Certificate

```bash
# Using Let's Encrypt with cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/letsencrypt-issuer.yaml
```

### 5. Configure CDN

- Upload static assets to S3
- Create CloudFront distribution
- Update CORS settings
- Enable compression
- Set cache headers

---

## Monitoring

### 1. Setup Sentry

```bash
# Install Sentry SDK (already in requirements.txt)
pip install sentry-sdk

# Initialize in main.py
import sentry_sdk
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1,
)
```

### 2. Setup Datadog

```bash
# Install Datadog agent
DD_API_KEY=<key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure integration
sudo systemctl start datadog-agent
```

### 3. Setup Monitoring Dashboards

- **Grafana**: Metrics visualization
- **Kibana**: Log aggregation
- **Prometheus**: Metrics collection
- **Stripe Dashboard**: Payment analytics

---

## Rollback

### Docker Rollback

```bash
# List previous versions
docker images | grep dream-ai

# Deploy previous version
docker-compose down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/api-gateway

# Rollback to previous version
kubectl rollout undo deployment/api-gateway

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2

# Check rollout status
kubectl rollout status deployment/api-gateway
```

### Database Rollback

```bash
# Rollback to previous migration
python -m alembic downgrade -1

# Rollback to specific version
python -m alembic downgrade <revision_id>
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
kubectl get pods | grep postgres
docker-compose ps postgres

# Check connection string
psql $POSTGRES_URL

# Check logs
kubectl logs -f postgres-0
docker-compose logs postgres
```

#### 2. Redis Connection Failed

```bash
# Check Redis is running
redis-cli -h redis ping

# Check logs
kubectl logs -f redis-0
```

#### 3. High API Latency

```bash
# Check slow queries
SELECT * FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds';

# Check connection pool
kubectl exec -it api-gateway-pod -- python -c "from shared.utils.database import engine; print(engine.pool.status())"

# Check Redis cache hit rate
redis-cli info stats | grep keyspace
```

#### 4. Frontend Build Fails

```bash
# Clear cache
rm -rf frontend/.next
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env.local
```

#### 5. Stripe Webhook Fails

```bash
# Test webhook locally
stripe listen --forward-to localhost:8000/api/v1/payment/webhook

# Check webhook signature
kubectl logs -f api-gateway-pod | grep webhook

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET
```

### Debug Commands

```bash
# Check pod status
kubectl get pods -A

# View pod logs
kubectl logs -f <pod-name>

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/bash

# Check resource usage
kubectl top pods
kubectl top nodes

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check ingress
kubectl describe ingress dream-ai-ingress
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs (Sentry)
- Monitor API performance (Datadog)
- Review payment transactions (Stripe)

**Weekly:**
- Database VACUUM ANALYZE
- Review slow queries
- Check disk space
- Review user feedback

**Monthly:**
- Security updates
- Dependency updates
- Performance optimization
- Backup verification

### Backup Strategy

```bash
# Database backup
pg_dump -U dream_ai_user dream_ai_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated daily backups (cron)
0 2 * * * /usr/local/bin/backup_db.sh

# S3 backup
aws s3 sync /backups s3://dream-ai-backups/$(date +%Y/%m/%d)/
```

---

## Checklist

### Pre-Deployment ✅

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates configured
- [ ] CDN configured
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Deployment ✅

- [ ] Build Docker images
- [ ] Push to registry
- [ ] Deploy to Kubernetes
- [ ] Run database migrations
- [ ] Deploy frontend
- [ ] Configure DNS
- [ ] Setup SSL
- [ ] Enable monitoring

### Post-Deployment ✅

- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] SSL working
- [ ] CDN working
- [ ] Monitoring active
- [ ] Error tracking active
- [ ] Payment processing working
- [ ] Team notified

---

## Support

For deployment issues:
- **Tech Lead**: tech@dreamaigirl.com
- **DevOps**: devops@dreamaigirl.com
- **Emergency**: +33 6 XX XX XX XX

---

**Last Updated**: 2026-02-08
**Version**: 1.0.0
