# Auth Service - Dream AI Girl

Service d'authentification et de gestion des utilisateurs. Gère les inscriptions, connexions, JWT tokens, et opérations CRUD sur les users.

## 🎯 Responsabilités

- **Authentication**: Register, Login, Refresh token, Logout
- **User Management**: Profile CRUD, Stats, Token/XP management
- **Match Management**: Swipe, Match, Unmatch avec girlfriends
- **JWT Tokens**: Génération et validation avec Redis cache
- **Gamification**: XP, Levels, Tokens

## 📋 Endpoints

### Authentication
- `POST /register` - Créer un compte
- `POST /login` - Se connecter
- `POST /refresh` - Rafraîchir le token
- `POST /logout/{user_id}` - Se déconnecter
- `POST /verify-email/{user_id}` - Vérifier email
- `POST /request-password-reset` - Demander reset password

### Users (`/users`)
- `GET /users/{user_id}` - Profil utilisateur
- `PUT /users/{user_id}` - Modifier profil
- `DELETE /users/{user_id}` - Supprimer compte
- `GET /users/{user_id}/stats` - Statistiques
- `POST /users/{user_id}/add-tokens` - Ajouter tokens (internal)
- `POST /users/{user_id}/deduct-tokens` - Déduire tokens (internal)
- `POST /users/{user_id}/add-xp` - Ajouter XP (internal)

### Matches (`/matches`)
- `GET /matches/discover` - Profils à swiper
- `POST /matches/swipe` - Swiper (like/pass)
- `GET /matches/` - Liste des matchs
- `GET /matches/{user_id}/{girl_id}` - Détails match
- `DELETE /matches/{user_id}/{girl_id}` - Unmatch
- `POST /matches/{user_id}/{girl_id}/update-affection` - Update affection (internal)

## 🔐 Security

### Password Hashing
- **Algorithme**: bcrypt avec salt automatique
- **Rounds**: 12 (équilibre sécurité/performance)
- **Validation**: Minimum 8 chars, uppercase, lowercase, digit

### JWT Tokens
- **Access Token**: 30 minutes expiration
- **Refresh Token**: 30 jours expiration
- **Algorithme**: HS256
- **Storage**: Refresh tokens stockés dans Redis

### Token Payload
```json
{
  "user_id": 123,
  "username": "john_doe",
  "subscription_tier": "premium",
  "exp": 1707408000,
  "type": "access"
}
```

## 💾 Database Schema

### User Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    photo_url VARCHAR(500),

    -- Gamification
    tokens INTEGER DEFAULT 100,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,

    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,

    -- Preferences
    preferred_language VARCHAR(5) DEFAULT 'fr',
    notifications_enabled BOOLEAN DEFAULT TRUE
);
```

### Match Table
```sql
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    girl_id VARCHAR(50) NOT NULL,
    affection INTEGER DEFAULT 20,
    matched_at TIMESTAMP DEFAULT NOW(),
    messages_count INTEGER DEFAULT 0,
    photos_received INTEGER DEFAULT 0,
    videos_received INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, girl_id)
);

CREATE INDEX idx_user_girl ON matches(user_id, girl_id);
CREATE INDEX idx_user_affection ON matches(user_id, affection);
```

## 🚀 Lancer le Service

### Développement (avec Docker Compose)

```bash
# Depuis la racine du projet
docker-compose up auth-service
```

Le service sera disponible sur `http://localhost:8001`

### Développement (local sans Docker)

```bash
cd backend/services/auth_service

# Installer dépendances
pip install -r requirements.txt

# Lancer serveur
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## 📖 Exemples d'Utilisation

### 1. Register New User

```bash
curl -X POST http://localhost:8001/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "age": 25
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "age": 25,
    "tokens": 100,
    "xp": 0,
    "level": 1,
    "subscription_tier": "free",
    ...
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:8001/login \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "john_doe",
    "password": "SecurePass123"
  }'
```

### 3. Refresh Token

```bash
curl -X POST http://localhost:8001/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

### 4. Get User Profile

```bash
curl -X GET http://localhost:8001/users/1
```

### 5. Update Profile

```bash
curl -X PUT http://localhost:8001/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "age": 26,
    "photo_url": "https://example.com/photo.jpg"
  }'
```

### 6. Discover Profiles to Swipe

```bash
curl -X GET "http://localhost:8001/matches/discover?user_id=1&limit=10"
```

Response:
```json
{
  "profiles": [
    {
      "girl_id": "emma",
      "name": "Emma",
      "age": 23,
      "location": "Paris",
      "tagline": "Romantique et passionnée",
      "photo_url": "...",
      "custom": false
    },
    ...
  ],
  "total": 10
}
```

### 7. Swipe (Like)

```bash
curl -X POST http://localhost:8001/matches/swipe \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "girl_id": "emma",
    "action": "like"
  }'
```

Response:
```json
{
  "action": "match",
  "message": "It's a match! 💕",
  "match": {
    "id": 1,
    "user_id": 1,
    "girl_id": "emma",
    "affection": 20,
    "matched_at": "2026-02-08T19:00:00Z",
    ...
  },
  "xp_earned": 5
}
```

## 🎮 Gamification System

### XP (Experience Points)

**Earning XP:**
- Send message: **5 XP**
- Receive photo: **20 XP**
- Receive video: **50 XP**
- Daily login: **10 XP**

**Leveling Up:**
- Level 1 → 2: 100 XP
- Level 2 → 3: 200 XP
- Level N → N+1: N × 100 XP

Formula: `xp_needed = current_level × 100`

### Tokens

**Starting Balance**: 100 tokens

**Token Costs:**
- Generate photo: **5 tokens**
- Generate video: **15 tokens**
- Skip action level: **10 tokens**
- Premium scenario: **20 tokens**

**Earning Tokens:**
- Purchase packages (4.99€ - 39.99€)
- Daily login bonus: **10 tokens**
- Achievements
- Referrals: **50 tokens**

## 📊 Caching Strategy

### Redis Cache Keys

```
user_profile:{user_id}       TTL: 15 min (read-heavy)
user_active:{user_id}         TTL: 1 hour
user_stats:{user_id}          TTL: 5 min (changes frequently)
refresh_token:{user_id}       TTL: 30 days
```

### Cache Invalidation

Cache is invalidated on:
- Profile update
- Account deletion
- Token/XP changes
- Logout

## 🔄 Integration avec Autres Services

### Called By
- **API Gateway**: Toutes les routes publiques
- **Chat Service**: Update affection, deduct tokens for photos
- **Payment Service**: Add tokens on purchase
- **Media Service**: Deduct tokens for generation

### Calls To
- Aucun (service autonome)

## 🧪 Tests

```bash
# Unit tests
pytest tests/unit

# Integration tests
pytest tests/integration

# Test registration
pytest tests/test_auth.py::test_register -v
```

## 🐛 Troubleshooting

### "Username already exists"
Le username doit être unique. Essayer un autre username.

### "Invalid username/email or password"
Vérifier les credentials. Le système ne révèle pas si c'est le username ou le password qui est incorrect (sécurité).

### "Invalid or expired token"
Le access token expire après 30 minutes. Utiliser le refresh token pour obtenir un nouveau access token.

### "Insufficient tokens"
L'utilisateur n'a pas assez de tokens. Il doit en acheter ou attendre le daily bonus.

## 📈 Performance

### Optimizations
- ✅ Connection pooling PostgreSQL
- ✅ Redis cache pour profils (15min TTL)
- ✅ Index sur username, email, user_id+girl_id
- ✅ Batch queries pour stats
- ✅ Async SQLAlchemy

### Metrics
- **Registration**: < 500ms
- **Login**: < 300ms
- **Profile fetch (cached)**: < 50ms
- **Profile fetch (DB)**: < 200ms
- **Swipe/Match**: < 300ms

## 🔒 Security Best Practices

✅ **Implemented:**
- Password hashing avec bcrypt
- JWT tokens avec expiration
- Refresh token rotation
- Rate limiting (via API Gateway)
- SQL injection protection (SQLAlchemy ORM)
- CORS configuré

⏳ **TODO:**
- Email verification avec codes
- Password reset via email
- 2FA (Two-Factor Authentication)
- Account lockout après failed attempts
- GDPR compliance (data export/deletion)

---

**Status**: ✅ Implémenté et fonctionnel
**Prochaine étape**: Implémenter Chat Service avec WebSocket
