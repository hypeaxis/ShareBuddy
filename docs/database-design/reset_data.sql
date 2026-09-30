-- Complete Database Reset (Delete all data + Reset sequences)
-- This will give you a completely fresh start

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Delete all data from tables
TRUNCATE TABLE answer_votes CASCADE;
TRUNCATE TABLE answers CASCADE;
TRUNCATE TABLE api_keys CASCADE;
TRUNCATE TABLE api_usage_logs CASCADE;
TRUNCATE TABLE bookmarks CASCADE;
TRUNCATE TABLE comment_likes CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE credit_packages CASCADE;
TRUNCATE TABLE credit_transactions CASCADE;
TRUNCATE TABLE document_tags CASCADE;
TRUNCATE TABLE downloads CASCADE;
TRUNCATE TABLE follows CASCADE;
TRUNCATE TABLE moderation_jobs CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE oauth_tokens CASCADE;
TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE question_votes CASCADE;
TRUNCATE TABLE questions CASCADE;
TRUNCATE TABLE rating_likes CASCADE;
TRUNCATE TABLE ratings CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE user_document_interactions CASCADE;
TRUNCATE TABLE verified_author_requests CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Reset all sequences to start from 1
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || r.sequence_name || ' RESTART WITH 1';
    END LOOP;
END $$;

-- Verification: Show all sequences and their current values
SELECT sequence_name, last_value 
FROM information_schema.sequences s
LEFT JOIN pg_sequences ps ON s.sequence_name = ps.sequencename
WHERE s.sequence_schema = 'public'
ORDER BY sequence_name;