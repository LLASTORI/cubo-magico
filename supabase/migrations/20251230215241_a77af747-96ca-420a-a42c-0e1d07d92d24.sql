-- Create table to store selected social listening pages/accounts
CREATE TABLE public.social_listening_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT,
  instagram_account_id TEXT,
  instagram_username TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_page_per_project UNIQUE (project_id, page_id)
);

-- Enable RLS
ALTER TABLE public.social_listening_pages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their project's social listening pages"
  ON public.social_listening_pages
  FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their project's social listening pages"
  ON public.social_listening_pages
  FOR ALL
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX idx_social_listening_pages_project_id ON public.social_listening_pages(project_id);
CREATE INDEX idx_social_listening_pages_active ON public.social_listening_pages(project_id, is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_social_listening_pages_updated_at
  BEFORE UPDATE ON public.social_listening_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();