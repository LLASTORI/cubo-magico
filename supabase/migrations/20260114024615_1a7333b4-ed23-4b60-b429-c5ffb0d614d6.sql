-- Create hotmart_backfill_runs table for logging backfill operations
CREATE TABLE public.hotmart_backfill_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_sales_found INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  executed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotmart_backfill_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Only project owners/members can view their backfill runs
CREATE POLICY "Users can view backfill runs for their projects"
ON public.hotmart_backfill_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM project_members WHERE project_id = hotmart_backfill_runs.project_id AND user_id = auth.uid()
  )
);

-- Policy: Only project owners/members can create backfill runs
CREATE POLICY "Users can create backfill runs for their projects"
ON public.hotmart_backfill_runs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM project_members WHERE project_id = hotmart_backfill_runs.project_id AND user_id = auth.uid()
  )
);

-- Policy: Only project owners/members can update their backfill runs
CREATE POLICY "Users can update backfill runs for their projects"
ON public.hotmart_backfill_runs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM project_members WHERE project_id = hotmart_backfill_runs.project_id AND user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_hotmart_backfill_runs_project_id ON public.hotmart_backfill_runs(project_id);
CREATE INDEX idx_hotmart_backfill_runs_status ON public.hotmart_backfill_runs(status);