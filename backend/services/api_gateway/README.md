# API Gateway - Dream AI Girl

Point d'entrée unique pour toutes les requêtes client. Route les requêtes vers les microservices appropriés.

## 🎯 Responsabilités

- **Routing**: Distribue les requêtes vers les microservices
- **Authentication**: Valide les JWT tokens
- **Rate Limiting**: Protection contre abus (60-120 req/min selon tier)
- **Logging**: Trace toutes les requêtes/réponses
- **CORS**: Gestion des origins autorisées
- **Health Checks**: Monitoring de l'infrastructure

## 📋 Endpoints Disponibles

### Authentication (`/api/v1/auth`)
- `POST /register` - Créer un compte
- `POST /login` - Se connecter
- `POST /refresh` - Rafraîchir le token
- `POST /logout` - Se déconnecter
- `GET /me` - Info utilisateur courant

### Users (`/api/v1/users`)
- `GET /profile` - Profil utilisateur
- `PUT /profile` - Modifier profil
- `GET /stats` - Statistiques utilisateur
- `DELETE /account` - Supprimer compte

### Chat (`/api/v1/chat`)
- `GET /rooms` - Liste des conversations
- `GET /{girl_id}/messages` - Historique messages
- `POST /{girl_id}/send` - Envoyer message
- `POST /{girl_id}/mark-read` - Marquer lu

### Matches (`/api/v1/matches`)
- `GET /discover` - Profils à swiper
- `POST /swipe` - Swiper (like/pass)
- `GET /list` - Liste des matchs
- `DELETE /{girl_id}` - Unmatch

### Media (`/api/v1/media`)
- `POST /generate-photo` - Générer photo (5 tokens)
- `POST /generate-video` - Générer vidéo (15 tokens, Premium+)
- `GET /photos/{girl_id}` - Photos reçues
- `GET /videos/{girl_id}` - Vidéos générées
- `GET /task/{task_id}` - Status génération

### Stories (`/api/v1/stories`)
- `GET /` - Stories actives
- `GET /{girl_id}` - Stories d'une fille
- `POST /{story_id}/view` - Marquer vue

### Payment (`/api/v1/payment`)
- `GET /subscription` - Info abonnement
- `POST /subscribe` - S'abonner (Premium/Elite)
- `POST /cancel-subscription` - Annuler abonnement
- `GET /tokens` - Balance tokens
- `POST /purchase-tokens` - Acheter tokens
- `GET /plans` - Plans disponibles (public)
- `GET /token-packages` - Packages tokens (public)

### Monitoring
- `GET /health` - Health check
- `GET /ping` - Simple ping
- `GET /` - Root info

## 🚀 Lancer le Service

### Développement (avec Docker Compose)

```bash
# Depuis la racine du projet
docker-compose up api-gateway
```

Le service sera disponible sur `http://localhost:8000`

### Développement (local sans Docker)

```bash
cd backend/services/api_gateway

# Installer dépendances
pip install -r requirements.txt

# Lancer serveur
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📖 Documentation Interactive

Avec `DEBUG=true`, accédez à:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 Authentication

La plupart des endpoints nécessitent un JWT token dans le header:

```bash
Authorization: Bearer <access_token>
```

### Exemple: Register + Login

```bash
# 1. Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "age": 25
  }'

# Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}

# 2. Utiliser le token
curl -X GET http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer eyJhbGc..."
```

## ⚡ Rate Limiting

Limites par minute selon tier:
- **Free**: 60 requêtes/min
- **Premium**: 120 requêtes/min
- **Elite**: Illimité

Headers de réponse:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1707408000
```

Si limite dépassée:
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the rate limit of 60 requests per minute",
  "retry_after": 60
}
```

## 📊 Logging & Monitoring

Chaque requête log:
- Request ID unique
- Method + Path
- Duration (ms)
- Status code
- User ID (si authentifié)

Headers de réponse:
```
X-Request-ID: 1707408000123
X-Process-Time: 0.0523
```

Alertes automatiques si:
- Requête > 1 seconde
- Erreur 5xx
- Service unavailable

## 🔄 Proxy vers Microservices

L'API Gateway proxy les requêtes vers:

| Route | Microservice | Port |
|-------|-------------|------|
| `/api/v1/auth/*` | auth-service | 8001 |
| `/api/v1/users/*` | auth-service | 8001 |
| `/api/v1/chat/*` | chat-service | 8002 |
| `/api/v1/matches/*` | auth-service | 8001 |
| `/api/v1/media/*` | media-service | 8004 |
| `/api/v1/stories/*` | media-service | 8004 |
| `/api/v1/payment/*` | payment-service | 8006 |

## 🛡️ Middleware Stack

Ordre d'exécution:
1. **CORS** - Allow origins
2. **Trusted Host** (production seulement)
3. **Logging** - Log request/response
4. **Rate Limiter** - Check limits
5. **Auth** - Validate JWT token
6. **Route Handler** - Execute endpoint
7. **Logging** - Log completion

## 🏥 Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T18:30:00.000Z",
  "services": {
    "postgres": "up",
    "redis": "up"
  },
  "version": "1.0.0",
  "environment": "development"
}
```

## 🚨 Error Handling

Tous les erreurs retournent un format standardisé:

```json
{
  "error": "Error type",
  "message": "Descriptive error message",
  "timestamp": "2026-02-08T18:30:00.000Z"
}
```

Status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error
- `503` - Service Unavailable (microservice down)
- `504` - Gateway Timeout (microservice timeout)

## 🧪 Tests

```bash
# Unit tests
pytest tests/unit

# Integration tests
pytest tests/integration

# Load testing
locust -f tests/load/locustfile.py --host=http://localhost:8000
```

## 📝 Variables d'Environnement

Voir `.env.example` à la racine du projet.

Variables critiques:
- `SECRET_KEY` - Clé secrète app
- `JWT_SECRET_KEY` - Clé JWT
- `POSTGRES_URL` - Database URL
- `REDIS_URL` - Cache URL
- `AUTH_SERVICE_URL` - URL auth service
- `CHAT_SERVICE_URL` - URL chat service
- `AI_SERVICE_URL` - URL AI service
- `MEDIA_SERVICE_URL` - URL media service
- `PAYMENT_SERVICE_URL` - URL payment service

## 🔧 Troubleshooting

### Service Unavailable (503)
Un microservice est down. Vérifier:
```bash
docker-compose ps
docker-compose logs <service-name>
```

### Gateway Timeout (504)
Un microservice est trop lent. Vérifier les logs du service concerné.

### Unauthorized (401)
Token invalide ou expiré. Refresh le token:
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "..."}'
```

### Rate Limit (429)
Trop de requêtes. Attendre 60 secondes ou upgrader vers Premium.

## 📈 Performance

Objectifs:
- **Latency p95**: < 200ms (sans génération AI)
- **Throughput**: > 1000 req/s
- **Uptime**: 99.9%

Optimisations:
- Connection pooling (PostgreSQL, Redis)
- HTTP client avec keep-alive (httpx)
- Async/await partout
- Cache Redis pour user info
- Rate limiting avec sliding window

---

**Status**: ✅ Implémenté et fonctionnel
**Prochaine étape**: Implémenter les microservices (auth-service, chat-service, etc.)
