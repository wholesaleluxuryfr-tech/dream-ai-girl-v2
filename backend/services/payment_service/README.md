# Payment Service

Microservice handling all payment operations with Stripe integration.

## Features

- ✅ Subscription management (Premium/Elite tiers)
- ✅ Token purchases (one-time payments)
- ✅ Webhook handling for Stripe events
- ✅ Payment history and invoicing
- ✅ Secure payment processing with Stripe

## Subscription Plans

### Premium - 9.99€/month
- 3 girlfriends actives
- Messages illimités
- 500 tokens/semaine
- Photos HD
- Priorité génération
- Pas de publicité
- Messages vocaux

### Elite - 19.99€/month
- Girlfriends illimitées
- Messages illimités
- Tokens illimités
- Génération vidéo
- Custom girlfriend
- Support prioritaire
- Accès beta features
- Badge Elite

## Token Packages

| Package | Tokens | Bonus | Price |
|---------|--------|-------|-------|
| Small   | 100    | 0     | 4.99€ |
| Medium  | 250    | 25    | 9.99€ |
| Large   | 600    | 100   | 19.99€|
| Mega    | 1500   | 300   | 39.99€|

## API Endpoints

### Subscriptions
- `GET /subscription` - Get current subscription
- `POST /subscribe` - Create new subscription
- `POST /cancel-subscription` - Cancel subscription

### Tokens
- `GET /tokens` - Get token balance and transaction history
- `POST /purchase-tokens` - Purchase token package

### Plans & Packages
- `GET /plans` - Get available subscription plans
- `GET /token-packages` - Get available token packages

### Webhooks
- `POST /webhook` - Handle Stripe webhook events

## Setup

### 1. Stripe Configuration

Create products and prices in Stripe Dashboard:
```bash
# Premium subscription
stripe products create --name="Premium" --description="Premium tier subscription"
stripe prices create --product=<product_id> --unit-amount=999 --currency=eur --recurring='{"interval": "month"}'

# Elite subscription
stripe products create --name="Elite" --description="Elite tier subscription"
stripe prices create --product=<product_id> --unit-amount=1999 --currency=eur --recurring='{"interval": "month"}'
```

### 2. Environment Variables

Add to `.env`:
```env
# Stripe keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe price IDs
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_ELITE_PRICE_ID=price_...
```

### 3. Database Migration

Run the payment tables migration:
```bash
psql $POSTGRES_URL < backend/shared/migrations/004_create_payment_tables.sql
```

### 4. Webhook Configuration

Configure webhook in Stripe Dashboard:
- URL: `https://api.dreamaigirl.com/payment/webhook`
- Events to listen:
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

## Running the Service

### Development
```bash
cd backend/services/payment_service
python main.py
```

### Production (with Docker)
```bash
docker-compose up payment-service
```

Service runs on port 8003.

## Webhook Events Handled

### customer.subscription.updated
- Updates subscription status in database
- Updates billing period dates

### customer.subscription.deleted
- Marks subscription as canceled
- Revokes premium features

### invoice.payment_succeeded
- Grants weekly tokens for recurring payments
- Records successful payment

### invoice.payment_failed
- Marks subscription as past_due
- Sends payment failure notification

## Token Usage

Tokens are used for:
- Photo generation: 5 tokens
- Video generation: 15 tokens
- Skip level in game: 10-50 tokens
- Unlock premium scenario: 20 tokens

## Testing

### Test Stripe Integration

Use Stripe test cards:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires 3DS: 4000 0025 0000 3155
```

### Test Subscription Flow
```bash
# Create subscription
curl -X POST http://localhost:8003/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "tier": "premium",
    "payment_method_id": "pm_test_..."
  }'

# Cancel subscription
curl -X POST http://localhost:8003/cancel-subscription \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'
```

### Test Token Purchase
```bash
curl -X POST http://localhost:8003/purchase-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "package_id": "medium",
    "payment_method_id": "pm_test_..."
  }'
```

## Security

- All Stripe API calls use secret key (server-side only)
- Webhook signatures verified using webhook secret
- Payment methods stored securely in Stripe (not in database)
- PCI-DSS compliant via Stripe

## Monitoring

Key metrics to track:
- Subscription conversion rate
- Churn rate
- Average revenue per user (ARPU)
- Token purchase frequency
- Failed payment rate

## Support

For payment issues, users can contact:
- Email: support@dreamaigirl.com
- In-app support (Premium/Elite users)
