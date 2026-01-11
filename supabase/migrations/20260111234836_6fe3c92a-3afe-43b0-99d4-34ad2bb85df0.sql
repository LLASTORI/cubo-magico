-- Experience Engine: Themes Table
-- Stores reusable visual themes that can be applied to multiple quizzes/surveys
CREATE TABLE public.experience_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Theme configuration (matches ExperienceTheme type)
  config JSONB NOT NULL DEFAULT '{
    "primary_color": "#6366f1",
    "text_color": "#1e293b",
    "secondary_text_color": "#64748b",
    "input_text_color": "#1e293b",
    "background_color": "#f8fafc",
    "show_progress": true,
    "one_question_per_page": true
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Experience Engine: Templates Table
-- Stores reusable layout templates that define structure and navigation
CREATE TABLE public.experience_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL = system template
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL, -- e.g., 'conversational', 'card', 'minimal', 'story', 'diagnostic'
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Template configuration
  config JSONB NOT NULL DEFAULT '{
    "layout": "centered",
    "image_position": "top",
    "progress_style": "bar",
    "navigation_style": "buttons",
    "animation": "slide",
    "cta_style": "full_width"
  }'::jsonb,
  
  -- Preview image for template selection
  preview_image_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add theme_id and template_id to quizzes table (nullable for backward compatibility)
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.experience_themes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.experience_templates(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.experience_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for experience_themes
CREATE POLICY "Members can view themes for their projects" 
ON public.experience_themes 
FOR SELECT 
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage themes" 
ON public.experience_themes 
FOR ALL 
USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all themes" 
ON public.experience_themes 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for experience_templates
CREATE POLICY "Anyone can view system templates" 
ON public.experience_templates 
FOR SELECT 
USING (is_system = true);

CREATE POLICY "Members can view templates for their projects" 
ON public.experience_templates 
FOR SELECT 
USING (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage project templates" 
ON public.experience_templates 
FOR ALL 
USING (project_id IS NOT NULL AND get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
WITH CHECK (project_id IS NOT NULL AND get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all templates" 
ON public.experience_templates 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create update timestamp triggers
CREATE TRIGGER update_experience_themes_updated_at
BEFORE UPDATE ON public.experience_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experience_templates_updated_at
BEFORE UPDATE ON public.experience_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system templates
INSERT INTO public.experience_templates (name, description, slug, is_system, config) VALUES
('Conversacional', 'Layout amigável com uma pergunta por vez, ideal para quizzes de qualificação', 'conversational', true, '{"layout": "centered", "image_position": "top", "progress_style": "bar", "navigation_style": "buttons", "animation": "slide", "cta_style": "full_width"}'),
('Card', 'Layout em cards compactos, ótimo para múltiplas opções visuais', 'card', true, '{"layout": "grid", "image_position": "left", "progress_style": "dots", "navigation_style": "cards", "animation": "fade", "cta_style": "inline"}'),
('Minimal', 'Layout minimalista e focado, sem distrações', 'minimal', true, '{"layout": "centered", "image_position": "hidden", "progress_style": "percentage", "navigation_style": "buttons", "animation": "none", "cta_style": "outline"}'),
('Story', 'Layout imersivo estilo stories, ideal para engajamento mobile', 'story', true, '{"layout": "fullscreen", "image_position": "background", "progress_style": "segments", "navigation_style": "tap", "animation": "slide-up", "cta_style": "floating"}'),
('Diagnóstico', 'Layout profissional para quizzes de avaliação e diagnóstico', 'diagnostic', true, '{"layout": "sidebar", "image_position": "right", "progress_style": "steps", "navigation_style": "numbered", "animation": "slide", "cta_style": "full_width"}');

-- Create index for faster lookups
CREATE INDEX idx_experience_themes_project_id ON public.experience_themes(project_id);
CREATE INDEX idx_experience_templates_project_id ON public.experience_templates(project_id);
CREATE INDEX idx_experience_templates_slug ON public.experience_templates(slug);
CREATE INDEX idx_quizzes_theme_id ON public.quizzes(theme_id);
CREATE INDEX idx_quizzes_template_id ON public.quizzes(template_id);