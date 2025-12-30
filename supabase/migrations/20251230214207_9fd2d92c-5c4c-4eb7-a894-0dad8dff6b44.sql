-- ============================================
-- SOCIAL LISTENING MODULE - DATABASE SCHEMA
-- ============================================

-- ENUM para classificação de comentários
CREATE TYPE comment_classification AS ENUM (
  'question',
  'commercial_interest',
  'complaint',
  'praise',
  'negative_feedback',
  'spam',
  'other'
);

-- ENUM para sentimento
CREATE TYPE comment_sentiment AS ENUM (
  'positive',
  'neutral',
  'negative'
);

-- ENUM para tipo de post
CREATE TYPE social_post_type AS ENUM (
  'organic',
  'ad'
);

-- ENUM para plataforma social
CREATE TYPE social_platform AS ENUM (
  'instagram',
  'facebook'
);

-- ENUM para status de processamento de IA
CREATE TYPE ai_processing_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- ============================================
-- TABELA: social_posts
-- Posts orgânicos e anúncios do Instagram/Facebook
-- ============================================
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Identificação Meta
  platform social_platform NOT NULL,
  post_id_meta TEXT NOT NULL,
  page_id TEXT,
  page_name TEXT,
  
  -- Tipo e vínculo com Ads
  post_type social_post_type NOT NULL DEFAULT 'organic',
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  
  -- Conteúdo
  message TEXT,
  media_type TEXT, -- photo, video, carousel, reel
  media_url TEXT,
  permalink TEXT,
  
  -- Métricas (atualizadas periodicamente)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  
  -- Timestamps
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraint única
  CONSTRAINT social_posts_unique UNIQUE (project_id, platform, post_id_meta)
);

-- ============================================
-- TABELA: social_comments
-- Comentários dos posts
-- ============================================
CREATE TABLE public.social_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  
  -- Identificação Meta
  platform social_platform NOT NULL,
  comment_id_meta TEXT NOT NULL,
  parent_comment_id UUID, -- Para replies (self-reference)
  
  -- Conteúdo
  text TEXT NOT NULL,
  author_id TEXT,
  author_username TEXT,
  author_name TEXT,
  author_profile_picture TEXT,
  
  -- Métricas do comentário
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Classificação IA
  sentiment comment_sentiment,
  classification comment_classification,
  intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
  ai_summary TEXT,
  ai_processing_status ai_processing_status DEFAULT 'pending',
  ai_processed_at TIMESTAMP WITH TIME ZONE,
  ai_error TEXT,
  
  -- Status
  is_hidden BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID,
  
  -- Timestamps
  comment_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint única
  CONSTRAINT social_comments_unique UNIQUE (project_id, platform, comment_id_meta)
);

-- Self-reference para replies
ALTER TABLE public.social_comments
ADD CONSTRAINT social_comments_parent_fkey
FOREIGN KEY (parent_comment_id) REFERENCES social_comments(id) ON DELETE SET NULL;

-- ============================================
-- TABELA: comment_metrics_daily
-- Métricas agregadas diárias por post
-- ============================================
CREATE TABLE public.comment_metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  
  -- Data
  metric_date DATE NOT NULL,
  
  -- Contagens
  total_comments INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  new_comments INTEGER DEFAULT 0,
  
  -- Distribuição por sentimento
  positive_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  
  -- Distribuição por classificação
  questions_count INTEGER DEFAULT 0,
  commercial_interest_count INTEGER DEFAULT 0,
  complaints_count INTEGER DEFAULT 0,
  praise_count INTEGER DEFAULT 0,
  
  -- Médias
  avg_sentiment_score NUMERIC(5,2),
  avg_intent_score NUMERIC(5,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint única
  CONSTRAINT comment_metrics_daily_unique UNIQUE (project_id, post_id, metric_date)
);

-- ============================================
-- TABELA: social_listening_sync_logs
-- Log de sincronizações
-- ============================================
CREATE TABLE public.social_listening_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL, -- 'posts', 'comments', 'ai_processing'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  
  posts_synced INTEGER DEFAULT 0,
  comments_synced INTEGER DEFAULT 0,
  comments_processed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_social_posts_project ON social_posts(project_id);
CREATE INDEX idx_social_posts_campaign ON social_posts(project_id, campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_social_posts_published ON social_posts(project_id, published_at DESC);

CREATE INDEX idx_social_comments_project ON social_comments(project_id);
CREATE INDEX idx_social_comments_post ON social_comments(post_id);
CREATE INDEX idx_social_comments_sentiment ON social_comments(project_id, sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX idx_social_comments_classification ON social_comments(project_id, classification) WHERE classification IS NOT NULL;
CREATE INDEX idx_social_comments_intent ON social_comments(project_id, intent_score DESC) WHERE intent_score IS NOT NULL;
CREATE INDEX idx_social_comments_ai_pending ON social_comments(project_id, ai_processing_status) WHERE ai_processing_status = 'pending';
CREATE INDEX idx_social_comments_timestamp ON social_comments(project_id, comment_timestamp DESC);

CREATE INDEX idx_comment_metrics_daily_date ON comment_metrics_daily(project_id, metric_date DESC);

CREATE INDEX idx_social_sync_logs_project ON social_listening_sync_logs(project_id, created_at DESC);

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_comments_updated_at
  BEFORE UPDATE ON public.social_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comment_metrics_daily_updated_at
  BEFORE UPDATE ON public.comment_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_listening_sync_logs ENABLE ROW LEVEL SECURITY;

-- social_posts
CREATE POLICY "Members can view social posts"
  ON public.social_posts FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage social posts"
  ON public.social_posts FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all social posts"
  ON public.social_posts FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- social_comments
CREATE POLICY "Members can view social comments"
  ON public.social_comments FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage social comments"
  ON public.social_comments FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all social comments"
  ON public.social_comments FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- comment_metrics_daily
CREATE POLICY "Members can view comment metrics"
  ON public.comment_metrics_daily FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage comment metrics"
  ON public.comment_metrics_daily FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all comment metrics"
  ON public.comment_metrics_daily FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- social_listening_sync_logs
CREATE POLICY "Members can view sync logs"
  ON public.social_listening_sync_logs FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage sync logs"
  ON public.social_listening_sync_logs FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all sync logs"
  ON public.social_listening_sync_logs FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- FUNÇÃO: Agregar métricas diárias
-- ============================================
CREATE OR REPLACE FUNCTION public.aggregate_comment_metrics_daily(p_project_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO comment_metrics_daily (
    project_id,
    post_id,
    metric_date,
    total_comments,
    total_replies,
    new_comments,
    positive_count,
    neutral_count,
    negative_count,
    questions_count,
    commercial_interest_count,
    complaints_count,
    praise_count,
    avg_sentiment_score,
    avg_intent_score
  )
  SELECT
    p_project_id,
    c.post_id,
    p_date,
    COUNT(*) FILTER (WHERE c.parent_comment_id IS NULL),
    COUNT(*) FILTER (WHERE c.parent_comment_id IS NOT NULL),
    COUNT(*) FILTER (WHERE DATE(c.comment_timestamp) = p_date),
    COUNT(*) FILTER (WHERE c.sentiment = 'positive'),
    COUNT(*) FILTER (WHERE c.sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE c.sentiment = 'negative'),
    COUNT(*) FILTER (WHERE c.classification = 'question'),
    COUNT(*) FILTER (WHERE c.classification = 'commercial_interest'),
    COUNT(*) FILTER (WHERE c.classification = 'complaint'),
    COUNT(*) FILTER (WHERE c.classification = 'praise'),
    CASE 
      WHEN COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL) > 0 THEN
        (COUNT(*) FILTER (WHERE c.sentiment = 'positive') * 1.0 +
         COUNT(*) FILTER (WHERE c.sentiment = 'neutral') * 0.5 +
         COUNT(*) FILTER (WHERE c.sentiment = 'negative') * 0.0) /
        COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL) * 100
      ELSE NULL
    END,
    AVG(c.intent_score) FILTER (WHERE c.intent_score IS NOT NULL)
  FROM social_comments c
  WHERE c.project_id = p_project_id
    AND DATE(c.comment_timestamp) <= p_date
    AND c.is_deleted = false
  GROUP BY c.post_id
  ON CONFLICT (project_id, post_id, metric_date)
  DO UPDATE SET
    total_comments = EXCLUDED.total_comments,
    total_replies = EXCLUDED.total_replies,
    new_comments = EXCLUDED.new_comments,
    positive_count = EXCLUDED.positive_count,
    neutral_count = EXCLUDED.neutral_count,
    negative_count = EXCLUDED.negative_count,
    questions_count = EXCLUDED.questions_count,
    commercial_interest_count = EXCLUDED.commercial_interest_count,
    complaints_count = EXCLUDED.complaints_count,
    praise_count = EXCLUDED.praise_count,
    avg_sentiment_score = EXCLUDED.avg_sentiment_score,
    avg_intent_score = EXCLUDED.avg_intent_score,
    updated_at = now();
END;
$$;