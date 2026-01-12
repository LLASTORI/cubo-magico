-- Create project_settings table for financial epoch and other settings
CREATE TABLE IF NOT EXISTS public.project_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  financial_core_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view settings for their projects"
ON public.project_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_settings.project_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update settings for their own projects"
ON public.project_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_settings.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert settings for their own projects"
ON public.project_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_settings.project_id
    AND p.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_project_settings_updated_at
BEFORE UPDATE ON public.project_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize settings for all existing projects with today's date
INSERT INTO public.project_settings (project_id, financial_core_start_date)
SELECT id, CURRENT_DATE
FROM public.projects
ON CONFLICT (project_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.project_settings IS 'Project-level settings including financial core epoch date';
COMMENT ON COLUMN public.project_settings.financial_core_start_date IS 'The date from which Core financial data is the source of truth. Data before this date is considered legacy.';