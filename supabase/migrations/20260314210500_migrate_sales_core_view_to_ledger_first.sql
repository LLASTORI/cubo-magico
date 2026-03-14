-- ============================================================
-- Migração: sales_core_view → ledger-first
-- Substitui leitura de sales_core_events por orders + order_items
-- + offer_mappings + funnels.
--
-- Mapeamentos críticos:
--   event_type:    approved/completed → 'purchase'
--                  refunded           → 'refund'
--                  cancelled          → 'cancellation'
--                  partial_refund     → 'refund'
--   hotmart_status: approved → 'APPROVED', completed → 'COMPLETE', etc.
--   is_active:     sempre true (ledger-first não tem soft-delete)
--   gross_amount:  COALESCE(customer_paid_brl, customer_paid)
--                  (customer_paid_brl só é populado pelo CSV import;
--                   webhook popula customer_paid em BRL para Hotmart BR)
-- ============================================================

CREATE OR REPLACE VIEW sales_core_view AS
WITH main_item AS (
  SELECT DISTINCT ON (oi.order_id)
    oi.order_id,
    oi.product_name,
    oi.provider_product_id AS product_code,
    oi.provider_offer_id   AS offer_code,
    COALESCE(oi.funnel_id, om.funnel_id) AS funnel_id,
    f.name AS funnel_name
  FROM order_items oi
  LEFT JOIN offer_mappings om
    ON om.project_id    = oi.project_id
   AND om.codigo_oferta = oi.provider_offer_id
  LEFT JOIN funnels f
    ON f.id = COALESCE(oi.funnel_id, om.funnel_id)
  ORDER BY oi.order_id,
    CASE oi.item_type WHEN 'main' THEN 0 ELSE 1 END
)
SELECT
  o.id,
  o.project_id,
  o.provider,
  o.provider_order_id                               AS provider_event_id,
  CASE o.status
    WHEN 'approved'        THEN 'purchase'
    WHEN 'completed'       THEN 'purchase'
    WHEN 'refunded'        THEN 'refund'
    WHEN 'partial_refund'  THEN 'refund'
    WHEN 'cancelled'       THEN 'cancellation'
    ELSE o.status
  END                                               AS event_type,
  COALESCE(o.customer_paid_brl, o.customer_paid)   AS gross_amount,
  o.producer_net_brl                                AS net_amount,
  COALESCE(o.currency, 'BRL')                      AS currency,
  COALESCE(o.approved_at, o.ordered_at)            AS occurred_at,
  o.created_at                                      AS received_at,
  DATE(COALESCE(o.approved_at, o.ordered_at)
    AT TIME ZONE 'America/Sao_Paulo')              AS economic_day,
  o.contact_id,
  true                                              AS is_active,
  o.created_at,
  o.provider_order_id                               AS transaction_id,
  o.buyer_name,
  o.buyer_email,
  mi.product_name,
  mi.product_code,
  mi.offer_code,
  CASE o.status
    WHEN 'approved'        THEN 'APPROVED'
    WHEN 'completed'       THEN 'COMPLETE'
    WHEN 'cancelled'       THEN 'CANCELLED'
    WHEN 'refunded'        THEN 'REFUNDED'
    WHEN 'partial_refund'  THEN 'APPROVED'
    ELSE UPPER(o.status)
  END                                               AS hotmart_status,
  mi.funnel_id,
  mi.funnel_name,
  o.utm_source,
  o.utm_campaign,
  o.utm_adset,
  o.utm_placement,
  o.utm_creative
FROM orders o
LEFT JOIN main_item mi ON mi.order_id = o.id;
