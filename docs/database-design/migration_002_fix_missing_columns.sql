-- ShareBuddy Database Migration Script
-- Migration 002: Fix missing columns and inconsistencies
-- Date: 2025-12-14
-- Execute this AFTER migration_001_add_missing_features.sql

-- ============================================
-- 1. FIX VERIFIED_AUTHOR_REQUESTS TABLE
-- ============================================

-- The table uses 'admin_note' in code but 'review_notes' in migration_001
-- Let's standardize to 'admin_note' to match the code
DO $$ 
BEGIN
    -- Check if review_notes exists and admin_note doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verified_author_requests' 
        AND column_name = 'review_notes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verified_author_requests' 
        AND column_name = 'admin_note'
    ) THEN
        ALTER TABLE verified_author_requests RENAME COLUMN review_notes TO admin_note;
        RAISE NOTICE 'Renamed review_notes to admin_note in verified_author_requests';
    END IF;
    
    -- If admin_note doesn't exist at all, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verified_author_requests' 
        AND column_name = 'admin_note'
    ) THEN
        ALTER TABLE verified_author_requests ADD COLUMN admin_note TEXT;
        RAISE NOTICE 'Added admin_note column to verified_author_requests';
    END IF;
END $$;

-- Remove proof_documents column if it exists (not used in current implementation)
ALTER TABLE verified_author_requests DROP COLUMN IF EXISTS proof_documents;

-- ============================================
-- 2. ADD OAUTH ID COLUMNS TO USERS TABLE
-- ============================================

-- Add google_id and facebook_id for OAuth integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);

-- Create indexes for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;

-- Drop old generic oauth columns if they exist (we'll use specific ones)
-- Keep them for now for backward compatibility, but add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id_unique ON users(facebook_id) WHERE facebook_id IS NOT NULL;

-- ============================================
-- 3. ADD MISSING DOCUMENT COLUMNS
-- ============================================

-- Add file_url column (needed for document downloads)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Update file_url based on file_path if null
UPDATE documents 
SET file_url = file_path 
WHERE file_url IS NULL AND file_path IS NOT NULL;

-- Add index for thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_documents_thumbnail_url ON documents(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- ============================================
-- 4. ADD TRIGGERS FOR VERIFIED_AUTHOR_REQUESTS
-- ============================================

-- Create trigger for updated_at on verified_author_requests
DROP TRIGGER IF EXISTS trigger_verified_author_requests_updated_at ON verified_author_requests;
CREATE TRIGGER trigger_verified_author_requests_updated_at
    BEFORE UPDATE ON verified_author_requests
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. FIX OAUTH_TOKENS TABLE TRIGGERS
-- ============================================

-- Create trigger for updated_at on oauth_tokens
DROP TRIGGER IF EXISTS trigger_oauth_tokens_updated_at ON oauth_tokens;
CREATE TRIGGER trigger_oauth_tokens_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================

-- Questions table performance indexes
CREATE INDEX IF NOT EXISTS idx_questions_is_answered ON questions(is_answered);
CREATE INDEX IF NOT EXISTS idx_questions_vote_count ON questions(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_questions_view_count ON questions(view_count DESC);

-- Answers table performance indexes
CREATE INDEX IF NOT EXISTS idx_answers_is_accepted ON answers(is_accepted);
CREATE INDEX IF NOT EXISTS idx_answers_vote_count ON answers(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at DESC);

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_customer ON payment_transactions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- User document interactions for recommendation
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type ON user_document_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_doc_type ON user_document_interactions(document_id, interaction_type);

-- Documents indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_average_rating ON documents(average_rating DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_documents_download_count ON documents(download_count DESC) WHERE status = 'approved';

-- ============================================
-- 7. ADD COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- For document listing with filters
CREATE INDEX IF NOT EXISTS idx_documents_status_public_created 
    ON documents(status, is_public, created_at DESC);

-- For document search with university/subject
CREATE INDEX IF NOT EXISTS idx_documents_university_subject 
    ON documents(university, subject) WHERE status = 'approved';

-- For user activity tracking
CREATE INDEX IF NOT EXISTS idx_downloads_user_date 
    ON downloads(user_id, download_date DESC);

-- For notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
    ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 8. ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================

-- Ensure credit_cost is non-negative
ALTER TABLE documents 
    DROP CONSTRAINT IF EXISTS check_credit_cost_non_negative,
    ADD CONSTRAINT check_credit_cost_non_negative 
    CHECK (credit_cost >= 0);

-- Ensure credits in users table is non-negative
ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS check_credits_non_negative,
    ADD CONSTRAINT check_credits_non_negative 
    CHECK (credits >= 0);

-- Ensure rating values are in valid range
ALTER TABLE documents 
    DROP CONSTRAINT IF EXISTS check_average_rating_range,
    ADD CONSTRAINT check_average_rating_range 
    CHECK (average_rating >= 0 AND average_rating <= 5);

-- ============================================
-- 9. UPDATE CREDIT PACKAGES WITH REALISTIC PRICES
-- ============================================

-- Update existing credit packages with better pricing
INSERT INTO credit_packages (credits, price_usd, price_vnd, bonus_credits, is_popular, display_order) VALUES
(10, 0.99, 23000, 0, FALSE, 1),
(25, 2.49, 58000, 5, FALSE, 2),
(50, 4.99, 115000, 10, TRUE, 3),
(100, 8.99, 208000, 25, FALSE, 4),
(250, 19.99, 463000, 75, FALSE, 5),
(500, 34.99, 810000, 150, TRUE, 6)
ON CONFLICT (credits) DO UPDATE SET
    price_usd = EXCLUDED.price_usd,
    price_vnd = EXCLUDED.price_vnd,
    bonus_credits = EXCLUDED.bonus_credits,
    is_popular = EXCLUDED.is_popular,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 10. ADD VIEW FOR USER STATISTICS
-- ============================================

-- Create view for user statistics (used in profiles and recommendations)
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.is_verified_author,
    COUNT(DISTINCT d.document_id) FILTER (WHERE d.status = 'approved') as document_count,
    COALESCE(AVG(d.average_rating) FILTER (WHERE d.status = 'approved'), 0) as avg_document_rating,
    COALESCE(SUM(d.download_count) FILTER (WHERE d.status = 'approved'), 0) as total_downloads,
    COALESCE(SUM(d.view_count) FILTER (WHERE d.status = 'approved'), 0) as total_views,
    COUNT(DISTINCT f.follower_id) as follower_count,
    COUNT(DISTINCT following.following_id) as following_count,
    COUNT(DISTINCT q.question_id) as questions_asked,
    COUNT(DISTINCT a.answer_id) as answers_given,
    COUNT(DISTINCT a.answer_id) FILTER (WHERE a.is_accepted = TRUE) as accepted_answers,
    u.created_at as member_since
FROM users u
LEFT JOIN documents d ON u.user_id = d.author_id
LEFT JOIN follows f ON u.user_id = f.following_id
LEFT JOIN follows following ON u.user_id = following.follower_id
LEFT JOIN questions q ON u.user_id = q.user_id
LEFT JOIN answers a ON u.user_id = a.user_id
GROUP BY u.user_id, u.username, u.full_name, u.is_verified_author, u.created_at;

-- ============================================
-- 11. ADD FUNCTION FOR CREDIT REWARD CALCULATION
-- ============================================

-- Function to calculate credit rewards based on interaction type
CREATE OR REPLACE FUNCTION calculate_credit_reward(
    p_interaction_type VARCHAR,
    p_is_verified_author BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE
    base_reward INTEGER;
    multiplier DECIMAL(3,2);
BEGIN
    -- Base rewards for different actions
    base_reward := CASE p_interaction_type
        WHEN 'upload_approved' THEN 5
        WHEN 'question_answered' THEN 2
        WHEN 'answer_accepted' THEN 5
        WHEN 'document_downloaded' THEN 1
        WHEN 'helpful_rating' THEN 1
        ELSE 0
    END;
    
    -- Verified authors get 50% bonus
    multiplier := CASE WHEN p_is_verified_author THEN 1.5 ELSE 1.0 END;
    
    RETURN FLOOR(base_reward * multiplier);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 12. ADD FUNCTION TO AUTO-CLEANUP OLD DATA
-- ============================================

-- Function to cleanup expired tokens and old notifications
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Delete expired email verification tokens (older than 24 hours)
    UPDATE users 
    SET email_verification_token = NULL,
        email_verification_expires = NULL
    WHERE email_verification_expires < NOW() - INTERVAL '24 hours';
    
    -- Delete expired password reset tokens (older than 1 hour)
    UPDATE users 
    SET password_reset_token = NULL,
        password_reset_expires = NULL
    WHERE password_reset_expires < NOW() - INTERVAL '1 hour';
    
    -- Delete read notifications older than 30 days
    DELETE FROM notifications 
    WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old API usage logs (older than 90 days)
    DELETE FROM api_usage_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Old data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. REFRESH MATERIALIZED VIEWS
-- ============================================

-- Refresh user similarity view if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'user_similarity'
    ) THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity;
        RAISE NOTICE 'Refreshed user_similarity materialized view';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not refresh user_similarity view: %', SQLERRM;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 'Migration 002 completed successfully!' as status;

-- Check verified_author_requests structure
SELECT 'Verified Author Requests columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'verified_author_requests'
ORDER BY ordinal_position;

-- Check users OAuth columns
SELECT 'Users OAuth columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('google_id', 'facebook_id', 'oauth_provider', 'oauth_id')
ORDER BY column_name;

-- Check documents columns
SELECT 'Documents file columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('file_url', 'file_path', 'thumbnail_url', 'preview_url')
ORDER BY column_name;

-- Count indexes created
SELECT 'Total indexes on key tables:' as info;
SELECT 
    schemaname,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'documents', 'questions', 'answers', 
    'verified_author_requests', 'user_document_interactions',
    'payment_transactions'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check functions created
SELECT 'Custom functions:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_credit_reward', 'cleanup_old_data')
ORDER BY routine_name;

-- Check credit packages
SELECT 'Credit packages:' as info;
SELECT credits, price_usd, price_vnd, bonus_credits, is_popular 
FROM credit_packages 
WHERE is_active = TRUE 
ORDER BY display_order;

SELECT 'Migration verification completed!' as final_status;
