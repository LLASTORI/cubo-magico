-- Add is_own_account column to social_comments
ALTER TABLE social_comments 
ADD COLUMN IF NOT EXISTS is_own_account BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_social_comments_is_own_account 
ON social_comments(is_own_account) 
WHERE is_own_account = FALSE;