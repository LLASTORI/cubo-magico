-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 2: MIGRAÇÃO DO LEDGER PARA BRL NATIVO
-- Decisão B: NÃO gerar platform_fee para internacionais sem conversão
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. NOVOS CAMPOS EM ledger_events
-- ═══════════════════════════════════════════════════════════════════════════════

-- amount_brl: Valor BRL real (fonte de verdade financeira)
ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS amount_brl NUMERIC;

-- amount_accounting: Valor contábil original (USD/MXN) - apenas referência
ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS amount_accounting NUMERIC;

-- currency_accounting: Moeda do valor contábil
ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS currency_accounting TEXT;

-- conversion_rate: Taxa de conversão usada (quando aplicável)
ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC;

-- source_type: Origem do valor BRL
-- 'native_brl' = Pedido doméstico, valor já em BRL
-- 'converted' = Pedido internacional com conversão explícita
-- 'legacy' = Valor migrado de sistema anterior (auditoria)
ALTER TABLE public.ledger_events 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'legacy';

-- 2. NOVOS CAMPOS EM orders
-- ═══════════════════════════════════════════════════════════════════════════════

-- platform_fee_brl: Taxa de plataforma em BRL real
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS platform_fee_brl NUMERIC;

-- affiliate_brl: Comissão de afiliado em BRL real
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS affiliate_brl NUMERIC;

-- coproducer_brl: Comissão de coprodutor em BRL real
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coproducer_brl NUMERIC;

-- tax_brl: Impostos em BRL real (quando aplicável)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tax_brl NUMERIC;

-- ledger_status: Status da cobertura do ledger
-- 'complete' = Todos os eventos financeiros registrados em BRL
-- 'partial' = Alguns eventos ausentes (ex: platform_fee intl sem conversão)
-- 'pending' = Aguardando processamento
-- 'blocked' = Dados insuficientes para gerar ledger
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS ledger_status TEXT DEFAULT 'pending';

-- 3. ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice para consultas por status do ledger
CREATE INDEX IF NOT EXISTS idx_orders_ledger_status 
ON public.orders(ledger_status);

-- Índice para auditoria por source_type
CREATE INDEX IF NOT EXISTS idx_ledger_events_source_type 
ON public.ledger_events(source_type);

-- 4. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.ledger_events.amount_brl IS 
'Valor BRL real liquidado pela Hotmart. FONTE DE VERDADE FINANCEIRA.';

COMMENT ON COLUMN public.ledger_events.amount_accounting IS 
'Valor contábil original (USD/MXN). Apenas para referência, NÃO representa caixa.';

COMMENT ON COLUMN public.ledger_events.source_type IS 
'Origem do valor BRL: native_brl (doméstico), converted (internacional), legacy (migração)';

COMMENT ON COLUMN public.orders.ledger_status IS 
'Status da cobertura: complete, partial (ex: intl sem platform_fee), pending, blocked';

COMMENT ON COLUMN public.orders.platform_fee_brl IS 
'Taxa de plataforma em BRL. NULL para internacionais sem conversão (Decisão B).';

COMMENT ON COLUMN public.orders.affiliate_brl IS 
'Comissão de afiliado em BRL real.';

COMMENT ON COLUMN public.orders.coproducer_brl IS 
'Comissão de coprodutor em BRL real.';