-- ============================================
-- LEDGER BRL v2.1 - INTEGRAÇÃO CONTÁBIL CSV
-- ============================================

-- 1. Adicionar novos campos em ledger_events
-- source_origin: 'webhook' | 'csv'
-- confidence_level: 'real' | 'accounting'
-- reference_period: data do CSV de origem

ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS source_origin TEXT DEFAULT 'webhook';

ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'real';

ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS reference_period DATE;

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ledger_events_source_origin 
ON public.ledger_events(source_origin);

CREATE INDEX IF NOT EXISTS idx_ledger_events_confidence_level 
ON public.ledger_events(confidence_level);

CREATE INDEX IF NOT EXISTS idx_ledger_events_reference_period 
ON public.ledger_events(reference_period);

-- 3. Adicionar check constraints (usando trigger para validação)
CREATE OR REPLACE FUNCTION public.validate_ledger_events_v21()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar source_origin
  IF NEW.source_origin IS NOT NULL AND NEW.source_origin NOT IN ('webhook', 'csv') THEN
    RAISE EXCEPTION 'source_origin deve ser webhook ou csv';
  END IF;
  
  -- Validar confidence_level
  IF NEW.confidence_level IS NOT NULL AND NEW.confidence_level NOT IN ('real', 'accounting') THEN
    RAISE EXCEPTION 'confidence_level deve ser real ou accounting';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_ledger_events_v21_trigger ON public.ledger_events;
CREATE TRIGGER validate_ledger_events_v21_trigger
BEFORE INSERT OR UPDATE ON public.ledger_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_ledger_events_v21();

-- 4. Atualizar registros existentes como origem 'webhook'
UPDATE public.ledger_events 
SET source_origin = 'webhook', confidence_level = 'real'
WHERE source_origin IS NULL OR source_origin = '';

-- 5. Comentários documentacionais
COMMENT ON COLUMN public.ledger_events.source_origin IS 'Origem do evento: webhook (tempo real) ou csv (contábil)';
COMMENT ON COLUMN public.ledger_events.confidence_level IS 'Nível de confiança: real (webhook) ou accounting (CSV oficial)';
COMMENT ON COLUMN public.ledger_events.reference_period IS 'Período de referência do CSV (data de fechamento)';