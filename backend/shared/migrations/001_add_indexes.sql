-- Database Performance Optimization Migration
-- Adds critical indexes for all high-frequency queries

-- ============================================================================
-- USER QUERIES
-- ============================================================================

-- User authentication (login by username/email)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User profile queries (active users, last login)
CREATE INDEX IF NOT EXISTS idx_users_active_last_login ON users(is_active, last_login DESC) WHERE is_active = true;

-- User stats (leaderboard, XP queries)
CREATE INDEX IF NOT EXISTS idx_users_xp_level ON users(xp DESC, level DESC);


-- ============================================================================
-- MATCH QUERIES
-- ============================================================================

-- Most frequent: Get user's matches
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id, created_at DESC);

-- Get specific match (user + girl)
CREATE INDEX IF NOT EXISTS idx_matches_user_girl ON matches(user_id, girl_id);

-- Get matches by affection level (ranking)
CREATE INDEX IF NOT EXISTS idx_matches_affection ON matches(user_id, affection DESC);

-- Active matches only
CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(user_id, is_active, created_at DESC) WHERE is_active = true;


-- ============================================================================
-- CHAT MESSAGE QUERIES
-- ============================================================================

-- Most critical: Get conversation history
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(user_id, girl_id, timestamp DESC);

-- Unread messages count
CREATE INDEX IF NOT EXISTS idx_messages_unread ON chat_messages(user_id, girl_id, is_read, timestamp DESC) WHERE is_read = false;

-- Message search by content (full-text search)
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON chat_messages USING gin(to_tsvector('french', content));

-- Media messages (photos/videos in chat)
CREATE INDEX IF NOT EXISTS idx_messages_media ON chat_messages(user_id, girl_id, timestamp DESC) WHERE media_url IS NOT NULL;

-- Composite index for pagination
CREATE INDEX IF NOT EXISTS idx_messages_pagination ON chat_messages(user_id, girl_id, id DESC);


-- ============================================================================
-- MEMORY QUERIES
-- ============================================================================

-- Get memories for a specific girl
CREATE INDEX IF NOT EXISTS idx_memories_girl ON memories(user_id, girl_id, importance DESC, created_at DESC);

-- Search memories by tag
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING gin(tags);

-- Memory search (full-text)
CREATE INDEX IF NOT EXISTS idx_memories_content_fts ON memories USING gin(to_tsvector('french', content));


-- ============================================================================
-- MEDIA QUERIES (Photos, Videos)
-- ============================================================================

-- Get user's received photos from girl
CREATE INDEX IF NOT EXISTS idx_photos_user_girl ON received_photos(user_id, girl_id, received_at DESC);

-- NSFW filter
CREATE INDEX IF NOT EXISTS idx_photos_nsfw ON received_photos(user_id, girl_id, is_nsfw, received_at DESC);

-- Photo context (selfie, lingerie, nude, etc.)
CREATE INDEX IF NOT EXISTS idx_photos_context ON received_photos(user_id, context, received_at DESC);

-- Generated videos
CREATE INDEX IF NOT EXISTS idx_videos_user_girl ON generated_videos(user_id, girl_id, generated_at DESC);

-- Video status (pending/completed/failed)
CREATE INDEX IF NOT EXISTS idx_videos_status ON generated_videos(user_id, status, generated_at DESC);


-- ============================================================================
-- PROFILE PHOTOS (Girl profiles)
-- ============================================================================

-- Get girl's profile photos
CREATE INDEX IF NOT EXISTS idx_profile_photos_girl ON profile_photos(girl_id, is_primary DESC, created_at DESC);

-- Primary photos only
CREATE INDEX IF NOT EXISTS idx_profile_photos_primary ON profile_photos(girl_id) WHERE is_primary = true;


-- ============================================================================
-- CUSTOM GIRLS
-- ============================================================================

-- User's custom created girls
CREATE INDEX IF NOT EXISTS idx_custom_girls_user ON custom_girls(user_id, created_at DESC);

-- Active custom girls
CREATE INDEX IF NOT EXISTS idx_custom_girls_active ON custom_girls(user_id, is_active) WHERE is_active = true;


-- ============================================================================
-- STORIES
-- ============================================================================

-- Active stories (not expired)
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(girl_id, expires_at DESC) WHERE expires_at > NOW();

-- Story views by user
CREATE INDEX IF NOT EXISTS idx_story_views_user ON story_views(user_id, viewed_at DESC);


-- ============================================================================
-- SUBSCRIPTION & PAYMENTS
-- ============================================================================

-- Active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id, status, ends_at DESC) WHERE status = 'active';

-- Subscription expiry (for renewal reminders)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(ends_at ASC) WHERE status = 'active';

-- Token transactions (purchase history)
CREATE INDEX IF NOT EXISTS idx_token_transactions ON token_transactions(user_id, created_at DESC);


-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- User events (tracking)
CREATE INDEX IF NOT EXISTS idx_user_events_user_date ON user_events(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type, event_date DESC);

-- Session logs
CREATE INDEX IF NOT EXISTS idx_session_logs_user ON session_logs(user_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_date ON session_logs(session_start DESC);


-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Get latest message per conversation (for conversation list)
CREATE INDEX IF NOT EXISTS idx_messages_latest_per_conversation ON chat_messages(user_id, girl_id, timestamp DESC, id DESC);

-- Match with latest message timestamp (for sorting conversations)
CREATE INDEX IF NOT EXISTS idx_matches_with_messages ON matches(user_id, last_message_at DESC NULLS LAST);

-- Photos by affection level (unlock higher NSFW at higher affection)
CREATE INDEX IF NOT EXISTS idx_photos_affection ON received_photos(user_id, girl_id, received_at DESC) INCLUDE (is_nsfw);


-- ============================================================================
-- PARTIAL INDEXES (for specific filtered queries)
-- ============================================================================

-- Only messages from AI (for regeneration feature)
CREATE INDEX IF NOT EXISTS idx_messages_ai_only ON chat_messages(user_id, girl_id, timestamp DESC)
WHERE sender = 'ai';

-- Only messages with reactions
CREATE INDEX IF NOT EXISTS idx_messages_with_reactions ON chat_messages(user_id, reaction, timestamp DESC)
WHERE reaction IS NOT NULL;

-- Failed video generations (for retry)
CREATE INDEX IF NOT EXISTS idx_videos_failed ON generated_videos(user_id, task_id, generated_at DESC)
WHERE status = 'failed';


-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for query planner
ANALYZE users;
ANALYZE matches;
ANALYZE chat_messages;
ANALYZE memories;
ANALYZE received_photos;
ANALYZE generated_videos;
ANALYZE profile_photos;
ANALYZE subscriptions;


-- ============================================================================
-- EXPLAIN: How to verify index usage
-- ============================================================================

-- Example: Check if index is used for conversation history query
-- EXPLAIN ANALYZE SELECT * FROM chat_messages
-- WHERE user_id = 1 AND girl_id = 'sophia'
-- ORDER BY timestamp DESC LIMIT 100;

-- Expected: Should use "idx_messages_conversation" with Index Scan

COMMENT ON INDEX idx_messages_conversation IS 'Critical: Used for loading conversation history (most frequent query)';
COMMENT ON INDEX idx_matches_user_girl IS 'Used for checking if match exists and getting affection level';
COMMENT ON INDEX idx_photos_user_girl IS 'Used for photo gallery loading';
