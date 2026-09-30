/**
 * Migration 006: Update notification_type enum to support all notification types
 * This migration extends the notification_type enum to include new notification types
 * for document rejection, Q&A answers, payment success, and verified author status changes.
 */

-- First, we need to create a new enum type and migrate data
-- Since PostgreSQL doesn't support ALTER TYPE ADD VALUE with specific position,
-- we'll create a new enum and swap them

-- Create new notification_type enum with all values
CREATE TYPE notification_type_new AS ENUM (
  'new_document',
  'new_follower',
  'new_comment',
  'new_rating',
  'document_approved',
  'document_rejected',
  'document_moderation',
  'new_qa_answer',
  'answer_accepted',
  'payment_successful',
  'verified_author_achieved',
  'verified_author_approved',
  'verified_author_rejected'
);

-- Alter the notifications table to use the new enum
ALTER TABLE notifications 
  ALTER COLUMN type TYPE notification_type_new USING type::text::notification_type_new;

-- Drop the old enum
DROP TYPE notification_type;

-- Rename the new enum to the original name
ALTER TYPE notification_type_new RENAME TO notification_type;
