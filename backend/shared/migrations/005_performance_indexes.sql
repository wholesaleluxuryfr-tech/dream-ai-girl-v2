-- Migration: Add performance indexes
-- Version: 005
-- Description: Comprehensive indexes for optimal query performance

-- ============================================================================
-- USER TABLE INDEXES
-- ============================================================================

-- Email and username lookups (frequently used for auth)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- Subscription tier filtering
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier) WHERE subscription_tier != 'free';

-- Active users only
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, last_login_at) WHERE is_active = true;


-- ============================================================================
-- MATCHES TABLE INDEXES
-- ============================================================================

-- User's matches (most common query)
CREATE INDEX IF NOT EXISTS idx_matches_user_girl ON matches(user_id, girl_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_date ON matches(user_id, matched_at DESC);

-- Affection level queries
CREATE INDEX IF NOT EXISTS idx_matches_affection ON matches(user_id, affection_level DESC);

-- Composite index for filtering + sorting
CREATE INDEX IF NOT EXISTS idx_matches_user_active_date ON matches(user_id, matched_at DESC) WHERE girl_id IS NOT NULL;


-- ============================================================================
-- CHAT MESSAGES TABLE INDEXES
-- ============================================================================

-- Conversation history (most frequent query)
CREATE INDEX IF NOT EXISTS idx_chat_user_girl_time ON chat_messages(user_id, girl_id, timestamp DESC);

-- Unread messages count
CREATE INDEX IF NOT EXISTS idx_chat_unread ON chat_messages(user_id, is_read, timestamp DESC) WHERE is_read = false;

-- Last message in conversation
CREATE INDEX IF NOT EXISTS idx_chat_last_message ON chat_messages(user_id, girl_id, timestamp DESC) INCLUDE (content, sender);

-- Pagination support
CREATE INDEX IF NOT EXISTS idx_chat_id_timestamp ON chat_messages(id, timestamp DESC);


-- ============================================================================
-- MEMORIES TABLE INDEXES
-- ============================================================================

-- User's girl memories
CREATE INDEX IF NOT EXISTS idx_memories_user_girl ON memories(user_id, girl_id, created_at DESC);

-- Memory importance
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, girl_id, importance DESC);


-- ============================================================================
-- MEDIA TABLES INDEXES
-- ============================================================================

-- Profile photos
CREATE INDEX IF NOT EXISTS idx_profile_photos_girl ON profile_photos(girl_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_photos_unlocked ON profile_photos(girl_id, is_locked) WHERE is_locked = false;

-- Generated photos
CREATE INDEX IF NOT EXISTS idx_generated_photos_user ON profile_photos(user_id, girl_id, created_at DESC);

-- Videos
CREATE INDEX IF NOT EXISTS idx_videos_user_girl ON profile_videos(user_id, girl_id, created_at DESC);


-- ============================================================================
-- STORIES TABLE INDEXES
-- ============================================================================

-- Active stories
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(girl_id, expires_at) WHERE expires_at > NOW();

-- Story views
CREATE INDEX IF NOT EXISTS idx_story_views_user ON watch_videos(user_id, video_id, watched_at DESC);


-- ============================================================================
-- GAMIFICATION INDEXES
-- ============================================================================

-- User level and XP
CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON user_levels(user_id, current_xp);

-- Leaderboard (most expensive query - optimize heavily)
CREATE INDEX IF NOT EXISTS idx_leaderboard_global ON user_levels(current_level DESC, current_xp DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON user_levels(weekly_xp DESC, user_id);

-- User achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at DESC) WHERE unlocked_at IS NOT NULL;

-- Daily streaks
CREATE INDEX IF NOT EXISTS idx_daily_rewards_streak ON daily_rewards(user_id, current_streak DESC, last_claim_date);


-- ============================================================================
-- SCENARIOS TABLE INDEXES
-- ============================================================================

-- Category and difficulty filtering
CREATE INDEX IF NOT EXISTS idx_scenarios_category_difficulty ON scenarios(category, difficulty);

-- Popular scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_popular ON scenarios(times_played DESC, id);

-- User's locked scenarios
CREATE INDEX IF NOT EXISTS idx_user_scenarios_locked ON user_scenarios(user_id, scenario_id, is_locked) WHERE is_locked = true;


-- ============================================================================
-- PAYMENT/SUBSCRIPTION INDEXES
-- ============================================================================

-- Active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id, status, current_period_end) WHERE status IN ('active', 'trialing');

-- Subscription expiration (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiring ON subscriptions(current_period_end) WHERE status = 'active';

-- Transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, status, created_at DESC);


-- ============================================================================
-- CUSTOM GIRLS TABLE INDEXES
-- ============================================================================

-- User's custom girlfriends
CREATE INDEX IF NOT EXISTS idx_custom_girls_user ON custom_girls(user_id, created_at DESC);

-- Public custom girls (discovery)
CREATE INDEX IF NOT EXISTS idx_custom_girls_public ON custom_girls(is_public, times_matched DESC) WHERE is_public = 1;


-- ============================================================================
-- ANALYTICS INDEXES
-- ============================================================================

-- Event tracking
CREATE INDEX IF NOT EXISTS idx_events_user_type_time ON events(user_id, event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_funnel ON events(event_type, timestamp DESC) WHERE event_type IN ('signup', 'first_match', 'first_message', 'premium_upgrade');

-- Session tracking
CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON sessions(user_id, start_time DESC);


-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Update statistics for query planner
ANALYZE users;
ANALYZE matches;
ANALYZE chat_messages;
ANALYZE memories;
ANALYZE profile_photos;
ANALYZE user_levels;
ANALYZE subscriptions;
ANALYZE transactions;

-- Vacuum to reclaim space
VACUUM (ANALYZE) users;
VACUUM (ANALYZE) matches;
VACUUM (ANALYZE) chat_messages;


-- ============================================================================
-- QUERY PLAN OPTIMIZATION HINTS
-- ============================================================================

-- Enable parallel query execution for large scans
ALTER TABLE chat_messages SET (parallel_workers = 4);
ALTER TABLE events SET (parallel_workers = 4);

-- Set statistics target for better query planning
ALTER TABLE chat_messages ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE matches ALTER COLUMN user_id SET STATISTICS 1000;


-- ============================================================================
-- MAINTENANCE RECOMMENDATIONS
-- ============================================================================

-- Schedule these operations during low-traffic periods:

-- Daily:
-- VACUUM ANALYZE chat_messages;
-- REINDEX INDEX CONCURRENTLY idx_chat_user_girl_time;

-- Weekly:
-- VACUUM FULL chat_messages;  -- Only if needed
-- REINDEX DATABASE dream_ai_db CONCURRENTLY;

-- Monitor index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0
-- ORDER BY idx_tup_read DESC;

-- Find missing indexes:
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
-- ORDER BY abs(correlation) DESC;
