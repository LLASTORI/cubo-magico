-- Backfill: criar ledger_events para todos os orders approved sem ledger
--
-- Contexto: 674 orders approved em 6 projetos não tinham ledger_events,
-- tornando ~R$130.000 invisíveis nos relatórios financeiros.
--
-- Causas identificadas:
-- 1. Race condition de coprodução (fix: UNIQUE(order_id, provider_event_id))
-- 2. Falha em order_items abortava antes do ledger (fix: non-fatal)
-- 3. Webhook legado (pré-sistema ledger-first) não criava ledger_events
-- 4. source 'CO_PRODUCER' (com underscore) não tratado
-- 5. Commissions USD sem currency_conversion (Decision B — apenas sale/coproducer com conversão)
--
-- Este script foi executado via MCP em 2026-03-15 e está aqui para documentação.
-- Total criado: ~1.302 ledger_events em 6 projetos.
-- Após execução: 0 orders approved sem ledger.
--
-- NOTA: Este script é IDEMPOTENTE via ON CONFLICT (order_id, provider_event_id) DO NOTHING

-- ============================================================
-- FASE 1: Commissions BRL nativas (MARKETPLACE, PRODUCER, COPRODUCER, AFFILIATE)
-- ============================================================
INSERT INTO ledger_events (
  order_id, project_id, provider, event_type, actor, actor_name,
  amount, amount_brl, amount_accounting, currency_accounting,
  conversion_rate, source_type, currency,
  provider_event_id, occurred_at, raw_payload
)
SELECT
  o.id, o.project_id, 'hotmart',
  CASE upper(comm->>'source')
    WHEN 'MARKETPLACE' THEN 'platform_fee'
    WHEN 'PRODUCER'    THEN 'sale'
    WHEN 'COPRODUCER'  THEN 'coproducer'
    WHEN 'CO_PRODUCER' THEN 'coproducer'
    WHEN 'AFFILIATE'   THEN 'affiliate'
  END,
  CASE upper(comm->>'source')
    WHEN 'MARKETPLACE' THEN 'platform'
    WHEN 'PRODUCER'    THEN 'producer'
    WHEN 'COPRODUCER'  THEN 'coproducer'
    WHEN 'CO_PRODUCER' THEN 'coproducer'
    WHEN 'AFFILIATE'   THEN 'affiliate'
  END,
  CASE upper(comm->>'source') WHEN 'MARKETPLACE' THEN 'hotmart' ELSE NULL END,
  CASE upper(comm->>'source')
    WHEN 'PRODUCER' THEN  (comm->>'value')::numeric
    ELSE                 -(comm->>'value')::numeric
  END,
  (comm->>'value')::numeric,
  (comm->>'value')::numeric,
  'BRL', 1, 'native_brl', 'BRL',
  (o.raw_payload->'data'->'purchase'->>'transaction') || '_' ||
    CASE upper(comm->>'source')
      WHEN 'MARKETPLACE' THEN 'platform_fee_platform'
      WHEN 'PRODUCER'    THEN 'sale_producer'
      WHEN 'COPRODUCER'  THEN 'coproducer_coproducer'
      WHEN 'CO_PRODUCER' THEN 'coproducer_coproducer'
      WHEN 'AFFILIATE'   THEN 'affiliate_affiliate'
    END,
  COALESCE(o.approved_at, o.ordered_at),
  jsonb_build_object('backfill', true, 'reason', 'orders_without_ledger_recovery',
    'original_event', o.raw_payload->>'event', 'backfill_date', NOW())
FROM orders o,
  jsonb_array_elements(o.raw_payload->'data'->'commissions') AS comm
WHERE o.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM ledger_events le WHERE le.order_id = o.id)
  AND upper(comm->>'currency_value') = 'BRL'
  AND (comm->>'value')::numeric > 0
  AND upper(comm->>'source') IN ('MARKETPLACE', 'PRODUCER', 'COPRODUCER', 'CO_PRODUCER', 'AFFILIATE')
  AND o.raw_payload->'data'->'purchase'->>'transaction' IS NOT NULL
ON CONFLICT (order_id, provider_event_id) DO NOTHING;

-- ============================================================
-- FASE 2: PRODUCER USD com currency_conversion
-- ============================================================
INSERT INTO ledger_events (
  order_id, project_id, provider, event_type, actor, actor_name,
  amount, amount_brl, amount_accounting, currency_accounting,
  conversion_rate, source_type, currency,
  provider_event_id, occurred_at, raw_payload
)
SELECT
  o.id, o.project_id, 'hotmart', 'sale', 'producer', NULL,
  (comm->'currency_conversion'->>'converted_value')::numeric,
  (comm->'currency_conversion'->>'converted_value')::numeric,
  (comm->>'value')::numeric,
  'USD',
  (comm->'currency_conversion'->>'conversion_rate')::numeric,
  'converted', o.currency,
  (o.raw_payload->'data'->'purchase'->>'transaction') || '_sale_producer',
  COALESCE(o.approved_at, o.ordered_at),
  jsonb_build_object('backfill', true, 'reason', 'orders_without_ledger_recovery',
    'original_event', o.raw_payload->>'event', 'backfill_date', NOW())
FROM orders o,
  jsonb_array_elements(o.raw_payload->'data'->'commissions') AS comm
WHERE o.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM ledger_events le WHERE le.order_id = o.id)
  AND upper(comm->>'source') = 'PRODUCER'
  AND upper(comm->>'currency_value') != 'BRL'
  AND comm->'currency_conversion'->>'converted_value' IS NOT NULL
  AND o.raw_payload->'data'->'purchase'->>'transaction' IS NOT NULL
ON CONFLICT (order_id, provider_event_id) DO NOTHING;

-- ============================================================
-- FASE 3: COPRODUCER USD com currency_conversion
-- ============================================================
INSERT INTO ledger_events (
  order_id, project_id, provider, event_type, actor, actor_name,
  amount, amount_brl, amount_accounting, currency_accounting,
  conversion_rate, source_type, currency,
  provider_event_id, occurred_at, raw_payload
)
SELECT
  o.id, o.project_id, 'hotmart', 'coproducer', 'coproducer', NULL,
  -(comm->'currency_conversion'->>'converted_value')::numeric,
   (comm->'currency_conversion'->>'converted_value')::numeric,
   (comm->>'value')::numeric,
  'USD',
  (comm->'currency_conversion'->>'conversion_rate')::numeric,
  'converted', o.currency,
  (o.raw_payload->'data'->'purchase'->>'transaction') || '_coproducer_coproducer',
  COALESCE(o.approved_at, o.ordered_at),
  jsonb_build_object('backfill', true, 'reason', 'orders_without_ledger_recovery',
    'original_event', o.raw_payload->>'event', 'backfill_date', NOW())
FROM orders o,
  jsonb_array_elements(o.raw_payload->'data'->'commissions') AS comm
WHERE o.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM ledger_events le WHERE le.order_id = o.id)
  AND upper(comm->>'source') IN ('COPRODUCER', 'CO_PRODUCER')
  AND upper(comm->>'currency_value') != 'BRL'
  AND comm->'currency_conversion'->>'converted_value' IS NOT NULL
  AND o.raw_payload->'data'->'purchase'->>'transaction' IS NOT NULL
ON CONFLICT (order_id, provider_event_id) DO NOTHING;

-- ============================================================
-- FASE 4: Pré-sistema (Nov 2025, sem event no payload, usar producer_net)
-- ============================================================
INSERT INTO ledger_events (
  order_id, project_id, provider, event_type, actor, actor_name,
  amount, amount_brl, amount_accounting, currency_accounting,
  conversion_rate, source_type, currency,
  provider_event_id, occurred_at, raw_payload
)
SELECT
  o.id, o.project_id, 'hotmart', 'sale', 'producer', NULL,
  o.producer_net::numeric,
  o.producer_net::numeric,
  o.producer_net::numeric,
  'BRL', 1, 'native_brl', 'BRL',
  o.provider_order_id || '_sale_producer',
  COALESCE(o.approved_at, o.ordered_at),
  jsonb_build_object('backfill', true, 'reason', 'pre_system_orders_recovery',
    'note', 'No webhook payload — synthesized from orders.producer_net', 'backfill_date', NOW())
FROM orders o
WHERE o.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM ledger_events le WHERE le.order_id = o.id)
  AND o.raw_payload->>'event' IS NULL
  AND o.producer_net IS NOT NULL AND o.producer_net::numeric > 0
ON CONFLICT (order_id, provider_event_id) DO NOTHING;

-- ============================================================
-- FASE 5: Atualizar ledger_status nas orders backfilladas
-- ============================================================
UPDATE orders
SET ledger_status = 'complete', updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT le.order_id
  FROM ledger_events le
  WHERE le.raw_payload->>'backfill' = 'true'
)
AND (ledger_status IS NULL OR ledger_status != 'complete');
