/**
 * Database Migration: Create notifications table
 * Run this file to create the notifications table and related indexes
 */

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_read (read),
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_user_read (user_id, read)
);

-- Create notification preferences table (for email notification settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Email notification toggles
  email_document_approved BOOLEAN DEFAULT TRUE,
  email_new_comment BOOLEAN DEFAULT TRUE,
  email_new_qa_answer BOOLEAN DEFAULT TRUE,
  email_answer_accepted BOOLEAN DEFAULT TRUE,
  email_new_follower BOOLEAN DEFAULT TRUE,
  email_payment_success BOOLEAN DEFAULT TRUE,
  email_verified_author_status BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-create notification preferences when user is created
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_notification_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_notification_preferences();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores in-app notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: document_approved, new_comment, new_qa_answer, answer_accepted, new_follower, payment_success, verified_author_achieved';
COMMENT ON TABLE notification_preferences IS 'User preferences for email notifications';
