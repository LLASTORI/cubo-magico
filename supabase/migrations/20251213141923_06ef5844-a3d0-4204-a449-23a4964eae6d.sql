
-- Add launch-specific fields to funnels table
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS launch_start_date date,
ADD COLUMN IF NOT EXISTS launch_end_date date,
ADD COLUMN IF NOT EXISTS has_fixed_dates boolean DEFAULT true;

-- Create launch_phases table
CREATE TABLE public.launch_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_type text NOT NULL,
  name text NOT NULL,
  start_date date,
  end_date date,
  primary_metric text NOT NULL DEFAULT 'spend',
  is_active boolean DEFAULT true,
  phase_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create phase_campaigns table (links Meta campaigns to phases)
CREATE TABLE public.phase_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id uuid NOT NULL REFERENCES public.launch_phases(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create launch_products table (links offer_mappings as upsell/downsell)
CREATE TABLE public.launch_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  offer_mapping_id uuid NOT NULL REFERENCES public.offer_mappings(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_type text NOT NULL DEFAULT 'main',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.launch_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for launch_phases
CREATE POLICY "Members can view launch phases" ON public.launch_phases
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage launch phases" ON public.launch_phases
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all launch phases" ON public.launch_phases
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for phase_campaigns
CREATE POLICY "Members can view phase campaigns" ON public.phase_campaigns
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage phase campaigns" ON public.phase_campaigns
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all phase campaigns" ON public.phase_campaigns
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for launch_products
CREATE POLICY "Members can view launch products" ON public.launch_products
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage launch products" ON public.launch_products
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all launch products" ON public.launch_products
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Add unique constraints
ALTER TABLE public.phase_campaigns ADD CONSTRAINT phase_campaigns_unique UNIQUE (phase_id, campaign_id);
ALTER TABLE public.launch_products ADD CONSTRAINT launch_products_unique UNIQUE (funnel_id, offer_mapping_id);

-- Create indexes
CREATE INDEX idx_launch_phases_funnel ON public.launch_phases(funnel_id);
CREATE INDEX idx_phase_campaigns_phase ON public.phase_campaigns(phase_id);
CREATE INDEX idx_launch_products_funnel ON public.launch_products(funnel_id);
