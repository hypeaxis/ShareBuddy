-- ShareBuddy Database Migration Script
-- Migration 003: Add Automated Moderation System
-- Date: 2025-12-16
-- Execute this AFTER migration_002_fix_missing_columns.sql

-- ============================================
-- OVERVIEW: Automated Moderation System
-- ============================================
-- This migration adds support for automated AI-powered content moderation
-- for newly uploaded documents. This is SEPARATE from the user reports system.
--
-- Key differences:
-- - Reports table: User-generated flags for existing approved content
-- - Moderation system: AI analysis of new uploads before approval
--
-- Design principle: MINIMAL changes to existing documents table
-- - documents.status remains: 'pending', 'approved', 'rejected' (unchanged)
-- - documents.status is the SOURCE OF TRUTH for backend queries
-- - moderation_jobs table is supplementary data for tracking AI analysis
-- - Existing backend queries (WHERE status = 'approved') won't break
-- - Trigger auto-updates documents.status when moderation completes
--
-- Flow: Upload → documents.status='pending' → moderation_jobs created → 
--       AI Analysis → moderation_jobs updated → TRIGGER updates documents.status='approved'/'rejected'

-- ============================================
-- 1. CREATE MODERATION JOBS TABLE (MAIN WORKFLOW)
-- ============================================

-- Create ENUM for moderation job status
CREATE TYPE moderation_job_status AS ENUM (
    'queued',              -- Job created, waiting for processing
    'processing',          -- AI is analyzing the document
    'completed',           -- Moderation completed (check score for result)
    'failed',              -- Technical error during processing
    'cancelled'            -- Job cancelled (document deleted, etc.)
);

-- Track moderation jobs for async processing - THIS IS THE SOURCE OF TRUTH
CREATE TABLE IF NOT EXISTS moderation_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL UNIQUE REFERENCES documents(document_id) ON DELETE CASCADE,
    
    -- Moderation workflow status (separate from documents.status)
    moderation_status moderation_job_status DEFAULT 'queued',
    
    -- AI Analysis Results
    moderation_score DECIMAL(4,3), -- 0.000 to 1.000 (NULL until processed)
    moderation_flags JSONB, -- {"toxicity": 0.15, "profanity": false, "spam": false}
    extracted_text_preview TEXT, -- First ~1000 chars analyzed
    model_version VARCHAR(50), -- e.g., "tensorflow-toxicity-v1"
    
    -- Job Processing Metadata
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_jobs_status ON moderation_jobs(moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_jobs_document_id ON moderation_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_moderation_jobs_created_at ON moderation_jobs(created_at);

-- Composite index for job queue processing (queued jobs first)
CREATE INDEX IF NOT EXISTS idx_moderation_jobs_queue ON moderation_jobs(moderation_status, created_at) 
WHERE moderation_status IN ('queued', 'processing');

-- Index for moderation score analytics
CREATE INDEX IF NOT EXISTS idx_moderation_jobs_score ON moderation_jobs(moderation_score) 
WHERE moderation_score IS NOT NULL;

-- ============================================
-- 2. ADD MINIMAL COLUMNS TO DOCUMENTS TABLE
-- ============================================

-- Only add columns that need to be displayed frequently or queried often
-- Most moderation data lives in moderation_jobs table

-- Quick flag to check if document has moderation data (for JOIN optimization)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS has_moderation_data BOOLEAN DEFAULT FALSE;

-- Cached moderation score for quick display (denormalized from moderation_jobs)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(4,3);

-- Reason for rejection (cached from moderation_jobs for user-facing messages)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for documents that have moderation data
CREATE INDEX IF NOT EXISTS idx_documents_has_moderation ON documents(has_moderation_data) 
WHERE has_moderation_data = TRUE;

-- ============================================
-- 3. CREATE TRIGGERS AND FUNCTIONS
-- ============================================

-- Ensure update_updated_at function exists (should be in init_database.sql)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for moderation_jobs updated_at
DROP TRIGGER IF EXISTS trigger_moderation_jobs_updated_at ON moderation_jobs;
CREATE TRIGGER trigger_moderation_jobs_updated_at
    BEFORE UPDATE ON moderation_jobs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Function to auto-sync moderation data to documents table
-- CRITICAL: This updates documents.status which is the SOURCE OF TRUTH for backend queries
-- Backend queries like "SELECT * FROM documents WHERE status = 'approved'" rely on this
CREATE OR REPLACE FUNCTION sync_moderation_to_documents()
RETURNS TRIGGER AS $$
BEGIN
    -- When moderation completes, update documents table
    IF NEW.moderation_status = 'completed' AND NEW.moderation_score IS NOT NULL THEN
        UPDATE documents 
        SET 
            -- Update status first - this is what backend queries check
            status = CASE 
                WHEN NEW.moderation_score > 0.5 THEN 'approved'::document_status
                ELSE 'rejected'::document_status
            END,
            -- Cache moderation data for display/analytics
            moderation_score = NEW.moderation_score,
            has_moderation_data = TRUE,
            rejection_reason = CASE 
                WHEN NEW.moderation_score <= 0.5 
                THEN 'Document did not meet community guidelines (AI moderation score: ' || ROUND(NEW.moderation_score, 2) || ')'
                ELSE NULL
            END
        WHERE document_id = NEW.document_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync moderation results to documents
DROP TRIGGER IF EXISTS trigger_sync_moderation_to_documents ON moderation_jobs;
CREATE TRIGGER trigger_sync_moderation_to_documents
    AFTER UPDATE ON moderation_jobs
    FOR EACH ROW 
    WHEN (NEW.moderation_status = 'completed' AND NEW.moderation_score IS NOT NULL)
    EXECUTE FUNCTION sync_moderation_to_documents();

-- ============================================
-- 4. ADD NOTIFICATION TYPES FOR MODERATION
-- ============================================

-- Add moderation-related notification types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'document_rejected' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'document_rejected';
        RAISE NOTICE 'Added document_rejected to notification_type enum';
    END IF;
END $$;

-- ============================================
-- 5. CREATE HELPER VIEWS AND FUNCTIONS
-- ============================================

-- View to easily query documents with their moderation status
CREATE OR REPLACE VIEW documents_with_moderation AS
SELECT 
    d.*,
    mj.job_id,
    mj.moderation_status,
    mj.moderation_flags,
    mj.extracted_text_preview,
    mj.model_version,
    mj.started_at as moderation_started_at,
    mj.completed_at as moderation_completed_at
FROM documents d
LEFT JOIN moderation_jobs mj ON d.document_id = mj.document_id;

-- Function to get moderation statistics (useful for admin dashboard)
CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS TABLE (
    queued_count BIGINT,
    processing_count BIGINT,
    completed_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT,
    failed_count BIGINT,
    avg_moderation_score NUMERIC,
    total_moderated_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM moderation_jobs WHERE moderation_status = 'queued') as queued_count,
        (SELECT COUNT(*) FROM moderation_jobs WHERE moderation_status = 'processing') as processing_count,
        (SELECT COUNT(*) FROM moderation_jobs WHERE moderation_status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM moderation_jobs WHERE moderation_status = 'completed' AND moderation_score > 0.5) as approved_count,
        (SELECT COUNT(*) FROM moderation_jobs WHERE moderation_status = 'completed' AND moderation_score <= 0.5) as rejected_count,
        (SELECT COUNT(*) FROM moderation_jobs WHERE moderation_status = 'failed') as failed_count,
        (SELECT AVG(moderation_score) FROM moderation_jobs WHERE moderation_score IS NOT NULL) as avg_moderation_score,
        (SELECT COUNT(*) FROM moderation_jobs WHERE DATE(completed_at) = CURRENT_DATE) as total_moderated_today;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. DATA MIGRATION - HANDLE EXISTING DOCUMENTS
-- ============================================

-- Mark existing approved documents as having passed moderation
-- This prevents them from being re-moderated
UPDATE documents 
SET 
    moderation_score = 1.0,
    has_moderation_data = TRUE
WHERE 
    status = 'approved' 
    AND has_moderation_data = FALSE;

-- Log the migration
DO $$ 
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Marked % existing approved documents as legacy-moderated', updated_count;
END $$;

-- ============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE moderation_jobs IS 'Source of truth for document moderation workflow. Tracks AI analysis only.';
COMMENT ON COLUMN moderation_jobs.moderation_status IS 'Workflow state: queued → processing → completed';
COMMENT ON COLUMN moderation_jobs.moderation_score IS 'AI confidence score (0-1). >0.5=approve, <=0.5=reject';
COMMENT ON COLUMN moderation_jobs.moderation_flags IS 'Detailed AI results: {"toxicity": 0.15, "profanity": false, "spam": false}';
COMMENT ON COLUMN moderation_jobs.extracted_text_preview IS 'First ~1000 chars extracted from document for analysis';
COMMENT ON COLUMN moderation_jobs.model_version IS 'AI model version used (e.g., "tensorflow-toxicity-v1")';
COMMENT ON COLUMN moderation_jobs.retry_count IS 'Number of retry attempts if processing failed';

COMMENT ON COLUMN documents.status IS 'SOURCE OF TRUTH for document visibility. Backend queries filter by this. Updated by trigger when moderation completes.';
COMMENT ON COLUMN documents.has_moderation_data IS 'Quick flag to check if document has been moderated (optimization for JOINs)';
COMMENT ON COLUMN documents.moderation_score IS 'Cached score from moderation_jobs for quick display without JOIN';
COMMENT ON COLUMN documents.rejection_reason IS 'Cached rejection reason for user-facing error messages';

-- ============================================
-- 8. GRANT PERMISSIONS (ADJUST AS NEEDED)
-- ============================================

-- Grant permissions to application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE ON moderation_jobs TO sharebuddy_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sharebuddy_app;

-- ============================================
-- 9. MIGRATION COMPLETE
-- ============================================

-- Verify the migration
DO $$ 
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 003: Moderation System - COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Key Changes:';
    RAISE NOTICE '- NEW TABLE: moderation_jobs (source of truth for moderation workflow)';
    RAISE NOTICE '- NEW ENUM: moderation_job_status (queued, processing, completed, failed, cancelled)';
    RAISE NOTICE '- DOCUMENTS TABLE: Only 3 minimal columns added (has_moderation_data, moderation_score, rejection_reason)';
    RAISE NOTICE '- STATUS ENUM: UNCHANGED - still only pending/approved/rejected';
    RAISE NOTICE '- DOCUMENTS.STATUS: Remains SOURCE OF TRUTH for backend queries (WHERE status = ''approved'')';
    RAISE NOTICE '- EXISTING QUERIES: Will not break - documents.status filtering works as before';
    RAISE NOTICE '- AUTO-SYNC: Trigger automatically updates documents.status when moderation completes';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow:';
    RAISE NOTICE '1. Upload → documents.status=pending, moderation_jobs created';
    RAISE NOTICE '2. AI analysis → moderation_jobs.moderation_status=completed';
    RAISE NOTICE '3. Trigger auto-updates documents.status (SOURCE OF TRUTH):';
    RAISE NOTICE '   - Score >0.5 → documents.status=approved (visible in queries)';
    RAISE NOTICE '   - Score <=0.5 → documents.status=rejected (hidden from queries)';
    RAISE NOTICE '4. Backend continues using: SELECT * FROM documents WHERE status = ''approved''';
    RAISE NOTICE '5. Admin can takedown approved docs later (approved → rejected)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Setup Redis for job queue';
    RAISE NOTICE '2. Deploy moderation service container';
    RAISE NOTICE '3. Update backend upload endpoint to create moderation_jobs';
    RAISE NOTICE '4. Frontend can query moderation_jobs for status details';
    RAISE NOTICE '==============================================';
END $$;