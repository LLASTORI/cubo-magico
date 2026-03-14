-- ============================================================
-- Migração: finance_tracking_view → ledger-first (fase 1)
-- Substitui leitura de sales_core_events por orders + order_items
-- + offer_mappings + funnels. Expõe as mesmas colunas para
-- useFinanceTracking e useMonthlyAnalysis.
-- Aplicada via MCP Supabase em 14/03/2026
-- ============================================================

CREATE OR REPLACE VIEW finance_tracking_view AS
WITH main_item AS (
  SELECT DISTINCT ON (oi.order_id)
    oi.order_id,
    oi.product_name,
    oi.provider_product_id  AS product_code,
    oi.provider_offer_id    AS offer_code,
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
  o.provider_order_id                         AS transaction_id,
  o.customer_paid_brl                          AS gross_amount,
  o.producer_net_brl                           AS net_amount,
  CASE o.status
    WHEN 'approved'        THEN 'APPROVED'
    WHEN 'completed'       THEN 'COMPLETE'
    WHEN 'cancelled'       THEN 'CANCELLED'
    WHEN 'refunded'        THEN 'REFUNDED'
    WHEN 'partial_refund'  THEN 'APPROVED'
    ELSE UPPER(o.status)
  END                                          AS hotmart_status,
  COALESCE(o.approved_at, o.ordered_at)        AS purchase_date,
  DATE(COALESCE(o.approved_at, o.ordered_at)
    AT TIME ZONE 'America/Sao_Paulo')          AS economic_day,
  mi.product_name,
  mi.product_code,
  mi.offer_code,
  o.payment_method,
  o.payment_type,
  o.buyer_name,
  o.buyer_email,
  NULL::text                                   AS buyer_phone,
  NULL::text                                   AS buyer_phone_ddd,
  NULL::text                                   AS buyer_phone_country_code,
  mi.funnel_id,
  mi.funnel_name,
  o.utm_source,
  o.utm_campaign,
  o.utm_adset,
  o.utm_placement,
  o.utm_creative,
  o.utm_medium,
  o.meta_campaign_id,
  o.meta_adset_id,
  o.meta_ad_id,
  NULL::text                                   AS checkout_origin,
  o.contact_id,
  NULL::text                                   AS webhook_event_type,
  NULL::text                                   AS sale_category,
  NULL::text                                   AS recurrence,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN main_item mi ON mi.order_id = o.id
WHERE o.status IN ('approved', 'completed', 'cancelled', 'refunded', 'partial_refund');
