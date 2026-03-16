-- Alinha meta_ad_audiences com o schema esperado pela edge function meta-audience-api
-- Tabela estava com nomes de colunas antigas (audience_id, audience_type, approximate_count)
-- Função usa: meta_audience_id, segment_type, segment_config, sync_frequency, estimated_size, last_sync_at, error_message

ALTER TABLE public.meta_ad_audiences
  ADD COLUMN IF NOT EXISTS meta_audience_id text,
  ADD COLUMN IF NOT EXISTS segment_type text,
  ADD COLUMN IF NOT EXISTS segment_config jsonb,
  ADD COLUMN IF NOT EXISTS sync_frequency text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS estimated_size integer,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

COMMENT ON COLUMN public.meta_ad_audiences.meta_audience_id IS 'ID do Custom Audience no Meta Ads';
COMMENT ON COLUMN public.meta_ad_audiences.segment_config IS 'Configuração do segmento: { tags: string[], operator: AND|OR }';
COMMENT ON COLUMN public.meta_ad_audiences.sync_frequency IS 'Frequência de sync: manual, daily, weekly';
