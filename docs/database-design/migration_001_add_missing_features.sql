-- ShareBuddy Database Migration Script
-- Migration 001: Add missing features (Q&A, Email Verification, Payment, OAuth)
-- Date: 2025-12-14
-- Execute this on your PostgreSQL database

-- ============================================
-- 1. ADD EMAIL VERIFICATION SYSTEM
-- ============================================

-- Add email verification columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- ============================================
-- 2. ADD Q&A SYSTEM (Separate Tables)
-- ============================================

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    is_answered BOOLEAN DEFAULT FALSE,
    accepted_answer_id UUID,
    view_count INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
    answer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for accepted answer
ALTER TABLE questions ADD CONSTRAINT fk_accepted_answer 
    FOREIGN KEY (accepted_answer_id) REFERENCES answers(answer_id) ON DELETE SET NULL;

-- Create question votes table
CREATE TABLE IF NOT EXISTS question_votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, user_id)
);

-- Create answer votes table
CREATE TABLE IF NOT EXISTS answer_votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(answer_id, user_id)
);

-- Create indexes for Q&A performance
CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_question_votes_question_id ON question_votes(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_votes_answer_id ON answer_votes(answer_id);

-- ============================================
-- 3. ADD PAYMENT SYSTEM (Stripe)
-- ============================================

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL, -- Amount in USD or VND
    currency VARCHAR(3) DEFAULT 'USD', -- USD, VND, etc.
    credits_purchased INTEGER NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed, refunded
    payment_method VARCHAR(50), -- card, bank_transfer, etc.
    stripe_payment_method_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB, -- Store additional Stripe metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_payment_intent ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Create credit packages table
CREATE TABLE IF NOT EXISTS credit_packages (
    package_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credits INTEGER NOT NULL UNIQUE,
    price_usd DECIMAL(10, 2) NOT NULL,
    price_vnd DECIMAL(12, 2),
    bonus_credits INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default credit packages
INSERT INTO credit_packages (credits, price_usd, price_vnd, bonus_credits, is_popular, display_order) VALUES
(10, 1.00, 25000, 0, FALSE, 1),
(25, 2.00, 50000, 5, FALSE, 2),
(50, 3.50, 87500, 10, TRUE, 3),
(100, 6.00, 150000, 25, FALSE, 4),
(250, 12.00, 300000, 75, FALSE, 5),
(500, 20.00, 500000, 200, TRUE, 6)
ON CONFLICT (credits) DO NOTHING;

-- ============================================
-- 4. ADD OAUTH SUPPORT
-- ============================================

-- OAuth columns already exist in users table (oauth_provider, oauth_id)
-- Just add index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- Create oauth_tokens table for refresh tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, facebook, github
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- ============================================
-- 5. ADD VERIFIED AUTHOR SYSTEM
-- ============================================

-- Create verified_author_requests table
CREATE TABLE IF NOT EXISTS verified_author_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    proof_documents TEXT[], -- Array of document URLs/paths
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verified_author_requests_user_id ON verified_author_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_author_requests_status ON verified_author_requests(status);

-- ============================================
-- 6. ADD FULL-TEXT SEARCH SUPPORT
-- ============================================

-- Add tsvector column for full-text search on documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.subject, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(NEW.university, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic search vector update
DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;
CREATE TRIGGER documents_search_vector_trigger
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION documents_search_vector_update();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN(search_vector);

-- Update existing documents to populate search_vector
UPDATE documents SET search_vector = 
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(subject, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(university, '')), 'D');

-- ============================================
-- 7. ADD RECOMMENDATION SYSTEM SUPPORT
-- ============================================

-- Create user interactions tracking for collaborative filtering
CREATE TABLE IF NOT EXISTS user_document_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- view, download, bookmark, rate, comment
    interaction_value INTEGER, -- Rating value for 'rate' type, NULL for others
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, document_id, interaction_type, created_at)
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_document_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_document_id ON user_document_interactions(document_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_document_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_document_interactions(created_at DESC);

-- Create materialized view for recommendation calculations (updated periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_similarity AS
SELECT 
    u1.user_id as user_id_1,
    u2.user_id as user_id_2,
    COUNT(*) as common_interactions,
    COALESCE(
        SUM(CASE 
            WHEN i1.interaction_type = 'rate' AND i2.interaction_type = 'rate' 
            THEN 1.0 - ABS(i1.interaction_value - i2.interaction_value) / 5.0
            ELSE 1.0
        END) / NULLIF(COUNT(*), 0),
        0
    ) as similarity_score
FROM user_document_interactions i1
JOIN user_document_interactions i2 ON i1.document_id = i2.document_id
JOIN users u1 ON i1.user_id = u1.user_id
JOIN users u2 ON i2.user_id = u2.user_id
WHERE i1.user_id < i2.user_id -- Avoid duplicates
GROUP BY u1.user_id, u2.user_id
HAVING COUNT(*) >= 3; -- At least 3 common interactions

CREATE INDEX IF NOT EXISTS idx_user_similarity_user1 ON user_similarity(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_similarity_user2 ON user_similarity(user_id_2);

-- ============================================
-- 8. ADD DOCUMENT PREVIEW SUPPORT
-- ============================================

-- Add preview/thumbnail columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS preview_pages INTEGER DEFAULT 3; -- Number of pages to preview
ALTER TABLE documents ADD COLUMN IF NOT EXISTS preview_generated BOOLEAN DEFAULT FALSE;

-- ============================================
-- 9. UPDATE NOTIFICATION TYPES
-- ============================================

-- Update notification_type enum to include new types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'question_asked';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'question_answered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'answer_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_successful';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'verified_author_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'verified_author_rejected';

-- ============================================
-- 10. ADD API KEYS FOR EXTERNAL ACCESS
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    api_key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    api_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    allowed_origins TEXT[], -- CORS allowed origins
    scopes TEXT[], -- Permissions: read:documents, write:documents, etc.
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Create API usage tracking
CREATE TABLE IF NOT EXISTS api_usage_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES api_keys(api_key_id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time INTEGER, -- milliseconds
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all tables exist
SELECT 'Migration completed successfully!' as status;

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'questions', 'answers', 'question_votes', 'answer_votes',
    'payment_transactions', 'credit_packages', 'oauth_tokens',
    'verified_author_requests', 'user_document_interactions',
    'api_keys', 'api_usage_logs'
)
ORDER BY table_name;

SELECT 'New columns in users table:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
    'email_verified', 'email_verification_token', 'email_verification_expires',
    'password_reset_token', 'password_reset_expires'
);

SELECT 'New columns in documents table:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN (
    'search_vector', 'preview_url', 'thumbnail_url', 'preview_pages', 'preview_generated'
);

-- Display credit packages
SELECT 'Credit packages available:' as info;
SELECT credits, price_usd, price_vnd, bonus_credits, is_popular 
FROM credit_packages 
WHERE is_active = TRUE 
ORDER BY display_order;
