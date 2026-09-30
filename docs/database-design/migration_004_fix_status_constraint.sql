-- Migration 004: Fix documents_status_check constraint to include 'pending'
-- This constraint was blocking pending documents from being inserted
-- Date: 2025-12-17

BEGIN;

-- Drop the old constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- Add the new constraint with 'pending' included
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
CHECK (status = ANY (ARRAY['pending'::document_status, 'approved'::document_status, 'rejected'::document_status]));

-- Verify the constraint was created
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'documents_status_check';

COMMIT;

-- Expected output:
-- conname: documents_status_check
-- pg_get_constraintdef: CHECK ((status = ANY (ARRAY['pending'::document_status, 'approved'::document_status, 'rejected'::document_status])))
