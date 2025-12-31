-- Tabela para base de conhecimento da IA
CREATE TABLE public.ai_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Contexto do negócio
  business_name TEXT,
  business_description TEXT,
  target_audience TEXT,
  products_services TEXT,
  tone_of_voice TEXT DEFAULT 'profissional e amigável',
  
  -- Categorias personalizadas de classificação
  custom_categories JSONB DEFAULT '[
    {"key": "product_question", "label": "Dúvida de Produto", "description": "Perguntas sobre características, uso ou funcionamento do produto"},
    {"key": "purchase_question", "label": "Dúvida de Compra/Preço", "description": "Perguntas sobre preço, formas de pagamento, frete"},
    {"key": "praise", "label": "Elogio", "description": "Feedback positivo, agradecimentos"},
    {"key": "complaint", "label": "Crítica/Reclamação", "description": "Insatisfação, problemas, reclamações"},
    {"key": "contact_request", "label": "Pedido de Contato", "description": "Solicitação de contato direto, DM, WhatsApp"},
    {"key": "friend_tag", "label": "Marcação de Amigo", "description": "Apenas marcando outras pessoas sem contexto comercial"},
    {"key": "spam", "label": "Spam", "description": "Conteúdo irrelevante, propaganda, bots"},
    {"key": "other", "label": "Outro", "description": "Não se encaixa em nenhuma categoria"}
  ]'::jsonb,
  
  -- FAQs e informações úteis
  faqs JSONB DEFAULT '[]'::jsonb,
  
  -- Keywords de interesse comercial
  commercial_keywords TEXT[] DEFAULT ARRAY['preço', 'valor', 'quanto custa', 'comprar', 'quero', 'onde compro', 'link', 'tem disponível'],
  
  -- Keywords negativas (spam, irrelevante)
  spam_keywords TEXT[] DEFAULT ARRAY['ganhe dinheiro', 'clique aqui', 'sorteio', 'promoção fake'],
  
  -- Configurações de processamento
  auto_classify_new_comments BOOLEAN DEFAULT false,
  min_intent_score_for_crm INTEGER DEFAULT 50,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view ai knowledge base"
  ON public.ai_knowledge_base FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage ai knowledge base"
  ON public.ai_knowledge_base FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all ai knowledge base"
  ON public.ai_knowledge_base FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_ai_knowledge_base_updated_at
  BEFORE UPDATE ON public.ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar social_comments com nova coluna de classification mais flexível
ALTER TABLE public.social_comments 
  ADD COLUMN IF NOT EXISTS classification_key TEXT;

-- Atualizar social_posts com informações adicionais
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS is_ad BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_project_id ON public.ai_knowledge_base(project_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_classification_key ON public.social_comments(classification_key);
CREATE INDEX IF NOT EXISTS idx_social_posts_media_type ON public.social_posts(media_type);