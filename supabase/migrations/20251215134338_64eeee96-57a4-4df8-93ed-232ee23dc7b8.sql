-- Create table for storing terms acceptances
CREATE TABLE public.terms_acceptances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version text NOT NULL DEFAULT '1.0',
    accepted_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_terms_acceptances_user_id ON public.terms_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_accepted_at ON public.terms_acceptances(accepted_at DESC);

-- Enable RLS
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own acceptances"
ON public.terms_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptance (during signup)
CREATE POLICY "Users can insert own acceptance"
ON public.terms_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super admins can view all acceptances
CREATE POLICY "Super admins can view all acceptances"
ON public.terms_acceptances
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Function to check if user has accepted current terms
CREATE OR REPLACE FUNCTION public.has_accepted_terms(_user_id uuid, _version text DEFAULT '1.0')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.terms_acceptances
    WHERE user_id = _user_id
      AND terms_version = _version
  )
$$;