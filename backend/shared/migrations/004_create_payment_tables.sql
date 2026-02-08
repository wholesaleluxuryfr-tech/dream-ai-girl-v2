-- Migration: Create payment tables for Stripe integration
-- Version: 004
-- Description: Subscriptions, transactions, invoices, payment methods

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Subscription details
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('premium', 'elite')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),

    -- Stripe references
    stripe_subscription_id VARCHAR(100) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(100) NOT NULL,

    -- Billing period
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,

    -- Cancellation
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_subscription_status ON subscriptions(user_id, status);
CREATE INDEX idx_stripe_subscription ON subscriptions(stripe_subscription_id);


-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Transaction details
    type VARCHAR(50) NOT NULL CHECK (type IN ('token_purchase', 'token_grant', 'token_spent', 'subscription_payment', 'refund')),
    amount INTEGER NOT NULL,
    description TEXT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- Payment details
    stripe_payment_intent_id VARCHAR(100) NULL,
    stripe_charge_id VARCHAR(100) NULL,
    amount_paid NUMERIC(10, 2) NULL,
    currency VARCHAR(3) DEFAULT 'eur',

    -- Metadata (JSON string)
    metadata TEXT NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_transaction_type ON transactions(user_id, type);
CREATE INDEX idx_transaction_status ON transactions(status);
CREATE INDEX idx_transaction_date ON transactions(created_at);


-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER NULL REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Stripe details
    stripe_invoice_id VARCHAR(100) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(100) NOT NULL,

    -- Invoice details
    amount_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'eur',
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

    -- PDF
    invoice_pdf TEXT NULL,

    -- Dates
    billing_period_start TIMESTAMP NULL,
    billing_period_end TIMESTAMP NULL,
    due_date TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_invoice ON invoices(user_id, status);
CREATE INDEX idx_stripe_invoice ON invoices(stripe_invoice_id);


-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Stripe details
    stripe_payment_method_id VARCHAR(100) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(100) NOT NULL,

    -- Card details
    type VARCHAR(20) NOT NULL,
    card_brand VARCHAR(20) NULL,
    card_last4 VARCHAR(4) NULL,
    card_exp_month INTEGER NULL,
    card_exp_year INTEGER NULL,

    -- Flags
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_payment_method ON payment_methods(user_id, is_default);


-- ============================================================================
-- ADD STRIPE CUSTOMER ID TO USERS TABLE
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) UNIQUE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
