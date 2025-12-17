-- Fix for moderation trigger: Cast status values to document_status enum
-- Run this on your production database to fix the type mismatch error

CREATE OR REPLACE FUNCTION sync_moderation_to_documents()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.moderation_status = 'completed' AND NEW.moderation_score IS NOT NULL THEN
        UPDATE documents 
        SET 
            status = CASE 
                WHEN NEW.moderation_score > 0.5 THEN 'approved'::document_status
                ELSE 'rejected'::document_status
            END,
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
