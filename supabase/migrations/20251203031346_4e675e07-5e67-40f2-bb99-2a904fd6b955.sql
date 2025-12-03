-- Create funnels table
CREATE TABLE public.funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage funnels via project" 
ON public.funnels 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = funnels.project_id 
  AND projects.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_funnels_updated_at
BEFORE UPDATE ON public.funnels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add funnel_id column to offer_mappings (keeping id_funil temporarily for migration)
ALTER TABLE public.offer_mappings 
ADD COLUMN funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;

-- Unique constraint for funnel name per project
CREATE UNIQUE INDEX idx_funnels_name_project ON public.funnels(name, project_id);