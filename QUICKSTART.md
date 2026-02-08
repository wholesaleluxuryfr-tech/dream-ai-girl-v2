# Quick Start Guide - Dream AI Girl

Get up and running in 5 minutes! 🚀

## Prerequisites

```bash
✅ Node.js 20+
✅ Python 3.11+
✅ PostgreSQL 15+
✅ Redis 7+
✅ Docker (optional)
```

---

## Option 1: Docker (Recommended)

**Fastest way to get started!**

```bash
# 1. Clone repository
git clone https://github.com/yourusername/dream-ai-refactored.git
cd dream-ai-refactored

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start everything with Docker
docker-compose up -d

# 4. Check services are running
docker-compose ps

# 5. Open browser
open http://localhost:3000
```

**Done! 🎉** The app is now running.

**Services:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Option 2: Local Development

### Step 1: Setup Backend (5 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Minimum Required Settings:**

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/dream_ai_dev
REDIS_URL=redis://localhost:6379/0
OPENROUTER_API_KEY=sk-or-your-key-here
STRIPE_SECRET_KEY=sk_test_your-key-here
```

**Start Services:**

```bash
# Terminal 1: PostgreSQL (if not running)
# Install: https://www.postgresql.org/download/

# Terminal 2: Redis (if not running)
redis-server

# Terminal 3: API Gateway
cd backend/services/api_gateway
python app/main.py

# Terminal 4: Chat Service (optional)
cd backend/services/chat_service
python main.py
```

### Step 2: Setup Frontend (2 minutes)

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Required Settings:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8002
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

**Start Frontend:**

```bash
npm run dev
```

### Step 3: Initialize Database (1 minute)

```bash
cd backend

# Create database
createdb dream_ai_dev

# Run migrations
psql -U postgres -d dream_ai_dev < shared/migrations/001_initial_schema.sql
psql -U postgres -d dream_ai_dev < shared/migrations/002_add_gamification.sql
psql -U postgres -d dream_ai_dev < shared/migrations/003_seed_scenarios.sql
psql -U postgres -d dream_ai_dev < shared/migrations/004_create_payment_tables.sql
psql -U postgres -d dream_ai_dev < shared/migrations/005_performance_indexes.sql

# Or using Alembic
python -m alembic upgrade head
```

### Step 4: Create Test User (30 seconds)

```bash
# Register via API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "age": 25
  }'

# Or via UI
open http://localhost:3000/register
```

**Done! 🎉**

---

## Verify Installation

### Backend Health Check

```bash
# Check API is running
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "postgres": "up",
#     "redis": "up"
#   }
# }
```

### Frontend Check

```bash
# Open in browser
open http://localhost:3000

# Should see landing page
```

### Test Key Features

1. **Register**: Create account at `/register`
2. **Login**: Sign in at `/login`
3. **Swipe**: Try swiping on matches at `/matches`
4. **Chat**: Send a message (WebSocket test)
5. **Profile**: Check your profile at `/profile`

---

## Common Commands

### Backend

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=.

# Start specific service
cd services/api_gateway && python app/main.py

# Run migrations
python -m alembic upgrade head

# Create new migration
python -m alembic revision -m "description"
```

### Frontend

```bash
# Development
npm run dev

# Build production
npm run build

# Start production
npm start

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint
```

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart service
docker-compose restart api-gateway

# Stop all
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## Project Structure

```
dream-ai-refactored/
├── backend/
│   ├── services/
│   │   ├── api_gateway/     # Main API (port 8000)
│   │   ├── auth_service/    # Auth (port 8001)
│   │   ├── chat_service/    # WebSocket (port 8002)
│   │   ├── ai_service/      # AI (port 8003)
│   │   ├── media_service/   # Media (port 8004)
│   │   └── payment_service/ # Payments (port 8006)
│   ├── shared/
│   │   ├── models/          # Database models
│   │   ├── utils/           # Utilities
│   │   └── migrations/      # SQL migrations
│   └── tests/               # Pytest tests
│
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities
│   │   └── styles/         # CSS
│   └── tests/              # Jest + Playwright
│
├── k8s/                    # Kubernetes configs
└── docs/                   # Documentation
```

---

## Key Endpoints

### API Gateway (http://localhost:8000)

```bash
# Health check
GET  /health

# API documentation
GET  /docs

# Authentication
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh

# Matches
GET  /api/v1/matches
POST /api/v1/matches/swipe

# Chat
GET  /api/v1/chat/history/{girl_id}
POST /api/v1/chat/send

# User
GET  /api/v1/users/me
PUT  /api/v1/users/me

# Payment
GET  /api/v1/payment/subscription
POST /api/v1/payment/subscribe
POST /api/v1/payment/purchase-tokens

# Gamification
GET  /api/v1/gamification/stats
GET  /api/v1/gamification/achievements
GET  /api/v1/gamification/leaderboard
```

### WebSocket (ws://localhost:8002)

```javascript
// Connect to chat
const socket = io('http://localhost:8002');

// Send message
socket.emit('send_message', {
  girl_id: 'sophie_25',
  content: 'Hello!'
});

// Receive message
socket.on('receive_message', (data) => {
  console.log(data);
});
```

---

## Environment Variables

### Critical Backend Variables

```env
# Security (REQUIRED)
SECRET_KEY=<generate-with-python>
JWT_SECRET_KEY=<generate-with-python>

# Database (REQUIRED)
POSTGRES_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0

# AI APIs (REQUIRED for chat)
OPENROUTER_API_KEY=sk-or-...

# Payment (REQUIRED for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional but recommended
SENTRY_DSN=https://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Critical Frontend Variables

```env
# API URLs (REQUIRED)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8002

# Stripe (REQUIRED for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional
NEXT_PUBLIC_SENTRY_DSN=https://...
```

---

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Check dependencies
pip install -r requirements.txt

# Check database connection
psql $POSTGRES_URL

# Check Redis connection
redis-cli ping
```

### Frontend won't start

```bash
# Check Node version
node --version  # Should be 20+

# Clear cache
rm -rf .next node_modules package-lock.json

# Reinstall
npm install

# Check environment
cat .env.local
```

### Database issues

```bash
# Recreate database
dropdb dream_ai_dev
createdb dream_ai_dev

# Run migrations again
psql -U postgres -d dream_ai_dev < shared/migrations/*.sql
```

### Port already in use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
PORT=8001 python app/main.py
```

### Docker issues

```bash
# Clean everything
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose up -d --build --force-recreate
```

---

## Testing

### Run All Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Test Specific Features

```bash
# Test auth
pytest tests/test_auth.py

# Test chat
pytest tests/test_chat.py

# Test specific test
pytest tests/test_auth.py::TestUserRegistration::test_register_new_user
```

---

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:

```bash
# Backend: Auto-reloads on file changes
uvicorn main:app --reload

# Frontend: Auto-reloads on file changes
npm run dev
```

### Debug Mode

```bash
# Backend: Enable debug logs
DEBUG=True python app/main.py

# Frontend: See detailed errors
NODE_ENV=development npm run dev
```

### Database GUI

```bash
# Use pgAdmin, DBeaver, or psql
psql -U postgres -d dream_ai_dev

# Useful queries
\dt                    # List tables
\d users               # Describe table
SELECT * FROM users;   # Query data
```

### Redis CLI

```bash
# Connect to Redis
redis-cli

# Useful commands
KEYS *                 # List all keys
GET key                # Get value
DEL key                # Delete key
FLUSHALL               # Clear all
```

---

## Next Steps

### 1. Read Documentation

- [README.md](README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture details
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [TESTING.md](TESTING.md) - Testing guide

### 2. Explore Codebase

```bash
# Backend services
ls backend/services/

# Frontend pages
ls frontend/src/app/

# Database models
ls backend/shared/models/

# Tests
ls backend/tests/
ls frontend/tests/
```

### 3. Make Your First Change

```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Make changes
# Edit files...

# 3. Run tests
pytest
npm test

# 4. Commit
git add .
git commit -m "Add my feature"

# 5. Push
git push origin feature/my-feature
```

### 4. Join the Team

- Slack: #dream-ai-dev
- Email: tech@dreamaigirl.com
- Docs: https://docs.dreamaigirl.com

---

## Getting Help

### Resources

- **Documentation**: Read the guides in `/docs`
- **API Docs**: http://localhost:8000/docs
- **Issues**: Check existing GitHub issues
- **Team**: Ask in Slack #dream-ai-dev

### Common Questions

**Q: Where do I add a new API endpoint?**
A: `backend/services/api_gateway/app/routes/`

**Q: Where do I add a new page?**
A: `frontend/src/app/[pagename]/page.tsx`

**Q: Where are database models?**
A: `backend/shared/models/`

**Q: How do I run migrations?**
A: `python -m alembic upgrade head`

**Q: Where are tests?**
A: `backend/tests/` and `frontend/tests/`

---

## Cheat Sheet

```bash
# Quick commands reference

# Start everything (Docker)
docker-compose up -d

# Start backend (local)
cd backend && python services/api_gateway/app/main.py

# Start frontend (local)
cd frontend && npm run dev

# Run all tests
pytest && npm test

# Check health
curl localhost:8000/health

# View logs
docker-compose logs -f
tail -f backend/logs/*.log

# Database
psql $POSTGRES_URL
redis-cli

# Git workflow
git checkout -b feature/name
git add . && git commit -m "msg"
git push origin feature/name
```

---

## Success! 🎉

You should now have Dream AI Girl running locally!

**Next**: Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand how everything works.

**Questions?** Contact: tech@dreamaigirl.com

---

**Last Updated**: 2026-02-08
**Version**: 1.0.0
