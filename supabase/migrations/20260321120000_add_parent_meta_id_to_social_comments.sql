-- Add parent_meta_id to social_comments to track parent comment Meta ID for replies
ALTER TABLE social_comments ADD COLUMN IF NOT EXISTS parent_meta_id TEXT;

CREATE INDEX IF NOT EXISTS social_comments_parent_meta_id_idx
  ON social_comments(project_id, parent_meta_id)
  WHERE parent_meta_id IS NOT NULL;
