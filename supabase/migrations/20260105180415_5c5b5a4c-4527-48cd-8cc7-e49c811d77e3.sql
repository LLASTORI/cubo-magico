-- Add missing permission columns for new modules
ALTER TABLE public.project_member_permissions 
ADD COLUMN IF NOT EXISTS insights permission_level DEFAULT 'none'::permission_level,
ADD COLUMN IF NOT EXISTS pesquisas permission_level DEFAULT 'none'::permission_level,
ADD COLUMN IF NOT EXISTS social_listening permission_level DEFAULT 'none'::permission_level;

-- Add columns to project_invites as well
ALTER TABLE public.project_invites 
ADD COLUMN IF NOT EXISTS permissions_insights permission_level DEFAULT 'none'::permission_level,
ADD COLUMN IF NOT EXISTS permissions_pesquisas permission_level DEFAULT 'none'::permission_level,
ADD COLUMN IF NOT EXISTS permissions_social_listening permission_level DEFAULT 'none'::permission_level;