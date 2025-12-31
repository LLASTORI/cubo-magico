-- 1. Criar feature Social Listening
INSERT INTO features (module_key, feature_key, name, description, is_active)
VALUES ('meta_ads', 'meta_ads.social_listening', 'Social Listening', 
        'Monitoramento e análise de comentários com IA', true)
ON CONFLICT (feature_key) DO NOTHING;

-- 2. Vincular aos planos Business e Ilimitado
INSERT INTO plan_features (plan_id, feature_id, enabled)
SELECT p.id, f.id, true
FROM plans p
CROSS JOIN features f
WHERE f.feature_key = 'meta_ads.social_listening'
AND p.name IN ('Business', 'Ilimitado')
ON CONFLICT (plan_id, feature_id) DO UPDATE SET enabled = true;

-- 3. Adicionar campos de resposta na tabela social_comments
ALTER TABLE social_comments
ADD COLUMN IF NOT EXISTS ai_suggested_reply text,
ADD COLUMN IF NOT EXISTS reply_status text,
ADD COLUMN IF NOT EXISTS reply_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS replied_by uuid;

-- 4. Adicionar status de ads na tabela social_posts
ALTER TABLE social_posts
ADD COLUMN IF NOT EXISTS ad_status text;

-- 5. Criar índice para otimizar queries de respostas pendentes
CREATE INDEX IF NOT EXISTS idx_social_comments_reply_status 
ON social_comments(reply_status) 
WHERE reply_status IS NOT NULL;