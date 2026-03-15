-- ============================================================
-- Migração: finance_ledger_summary → ledger-first
--
-- Antes: JOIN finance_ledger (1.850 registros) + hotmart_sales (840)
--        → apenas 693 matches. CSV-imported e novos webhooks invisíveis.
--
-- Depois: orders + ledger_events + order_items + offer_mappings + funnels
--         → todos os pedidos com ledger aparecerão (6.180 aprovados).
--
-- Resultado: Insights (useFinanceLedger) passa de 693 → 6.250 pedidos APPROVED.
--
-- Mapeamento de event_type (ledger_events):
--   sale, credit, producer  → producer_gross
--   affiliate               → affiliate_cost
--   coproducer              → coproducer_cost
--   platform_fee, tax       → platform_cost
--   refund, chargeback      → refunds
--
-- Colunas sem equivalente em orders (retornam NULL):
--   buyer_phone_*, recurrence, is_upgrade, subscriber_code,
--   checkout_origin, sale_category, raw_checkout_origin
-- ============================================================

CREATE OR REPLACE VIEW finance_ledger_summary AS
WITH main_item AS (
  -- Um registro por pedido: prioriza item_type = 'main'
  SELECT DISTINCT ON (oi.order_id)
    oi.order_id,
    oi.project_id,
    oi.product_name,
    oi.provider_product_id                      AS product_code,
    oi.provider_offer_id                        AS offer_code,
    COALESCE(oi.funnel_id, om.funnel_id)        AS funnel_id,
    f.name                                      AS funnel_name
  FROM order_items oi
  LEFT JOIN offer_mappings om
    ON  om.project_id    = oi.project_id
    AND om.codigo_oferta = oi.provider_offer_id
  LEFT JOIN funnels f ON f.id = COALESCE(oi.funnel_id, om.funnel_id)
  ORDER BY oi.order_id,
    CASE oi.item_type WHEN 'main' THEN 0 ELSE 1 END
),
ledger_agg AS (
  -- Agrega ledger_events por pedido
  SELECT
    le.order_id,
    MIN(le.occurred_at)  AS first_event_at,
    MAX(le.occurred_at)  AS last_event_at,
    COUNT(*)             AS event_count,
    SUM(CASE
      WHEN le.event_type IN ('sale', 'credit', 'producer')
        THEN COALESCE(le.amount_brl, le.amount)
      ELSE 0
    END)                 AS producer_gross,
    SUM(CASE
      WHEN le.event_type = 'affiliate'
        THEN ABS(COALESCE(le.amount_brl, le.amount))
      ELSE 0
    END)                 AS affiliate_cost,
    SUM(CASE
      WHEN le.event_type = 'coproducer'
        THEN ABS(COALESCE(le.amount_brl, le.amount))
      ELSE 0
    END)                 AS coproducer_cost,
    SUM(CASE
      WHEN le.event_type IN ('platform_fee', 'tax')
        THEN ABS(COALESCE(le.amount_brl, le.amount))
      ELSE 0
    END)                 AS platform_cost,
    SUM(CASE
      WHEN le.event_type IN ('refund', 'chargeback')
        THEN ABS(COALESCE(le.amount_brl, le.amount))
      ELSE 0
    END)                 AS refunds
  FROM ledger_events le
  GROUP BY le.order_id
)
SELECT
  o.project_id,
  o.provider_order_id                                        AS transaction_id,
  o.provider,

  mi.product_name,
  mi.product_code,
  mi.offer_code,

  o.buyer_name,
  o.buyer_email,
  NULL::text                                                 AS buyer_phone_country_code,
  NULL::text                                                 AS buyer_phone_ddd,
  NULL::text                                                 AS buyer_phone,

  o.payment_method,
  o.payment_type,
  NULL::text                                                 AS recurrence,
  NULL::boolean                                              AS is_upgrade,
  NULL::text                                                 AS subscriber_code,

  mi.funnel_id,
  mi.funnel_name,

  la.first_event_at,
  la.last_event_at,
  DATE(la.first_event_at AT TIME ZONE 'America/Sao_Paulo')  AS economic_day,

  COALESCE(la.producer_gross,   0)                          AS producer_gross,
  COALESCE(la.affiliate_cost,   0)                          AS affiliate_cost,
  COALESCE(la.coproducer_cost,  0)                          AS coproducer_cost,
  COALESCE(la.platform_cost,    0)                          AS platform_cost,
  COALESCE(la.refunds,          0)                          AS refunds,
  COALESCE(la.producer_gross,   0)
    - COALESCE(la.affiliate_cost,   0)
    - COALESCE(la.coproducer_cost,  0)
    - COALESCE(la.platform_cost,    0)
    - COALESCE(la.refunds,          0)                      AS net_revenue,

  o.provider                                                 AS provider_source,
  COALESCE(la.event_count, 0)::bigint                       AS event_count,

  o.utm_source,
  o.utm_medium,
  o.utm_campaign,
  o.utm_adset,
  o.utm_placement,
  o.utm_creative,

  o.meta_campaign_id,
  o.meta_adset_id,
  o.meta_ad_id,

  NULL::text                                                 AS checkout_origin,

  CASE o.status
    WHEN 'approved'       THEN 'APPROVED'
    WHEN 'completed'      THEN 'COMPLETE'
    WHEN 'cancelled'      THEN 'CANCELLED'
    WHEN 'refunded'       THEN 'REFUNDED'
    WHEN 'partial_refund' THEN 'APPROVED'
    ELSE UPPER(o.status)
  END                                                        AS hotmart_status,

  NULL::text                                                 AS sale_category,
  o.utm_term,
  o.utm_content,
  NULL::text                                                 AS raw_checkout_origin

FROM orders o
LEFT JOIN main_item  mi ON mi.order_id = o.id
LEFT JOIN ledger_agg la ON la.order_id = o.id;
