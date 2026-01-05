-- Add column to track manually reclassified comments
ALTER TABLE public.social_comments 
ADD COLUMN IF NOT EXISTS manually_classified boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.social_comments.manually_classified IS 'Indicates if the comment was manually reclassified by a user';