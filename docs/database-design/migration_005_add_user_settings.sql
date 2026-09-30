-- Add settings columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_follow_activity BOOLEAN DEFAULT true;

-- Set defaults for existing users
UPDATE users 
SET 
  email_notifications = COALESCE(email_notifications, true),
  is_public_profile = COALESCE(is_public_profile, true),
  allow_follow_activity = COALESCE(allow_follow_activity, true)
WHERE 
  email_notifications IS NULL 
  OR is_public_profile IS NULL 
  OR allow_follow_activity IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_is_public_profile
ON users(is_public_profile) WHERE is_public_profile = true;

CREATE INDEX IF NOT EXISTS idx_users_allow_follow_activity
ON users(allow_follow_activity) WHERE allow_follow_activity = true;