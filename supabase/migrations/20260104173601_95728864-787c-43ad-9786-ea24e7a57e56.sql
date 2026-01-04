
-- Corrigir SECURITY DEFINER para SECURITY INVOKER nas views
-- (SECURITY INVOKER é o padrão e respeitará RLS das tabelas base)

-- Recriar views com SECURITY INVOKER explícito

-- 1. canonical_sale_events
DROP VIEW IF EXISTS public.funnel_summary CASCADE;
DROP VIEW IF EXISTS public.funnel_metrics_daily CASCADE;
DROP VIEW IF EXISTS public.canonical_sale_events CASCADE;

CREATE VIEW public.canonical_sale_events 
WITH (security_invoker = on) AS
WITH hotmart_mapped AS (
  SELECT
    hs.id::TEXT AS internal_id,
    'hotmart' AS platform,
    hs.transaction_id AS external_id,
    hs.project_id,
    hs.buyer_email AS contact_email,
    hs.buyer_name AS contact_name,
    hs.buyer_phone AS contact_phone,
    CASE 
      WHEN hs.status IN ('REFUNDED', 'refunded') THEN 'refund'
      WHEN hs.status IN ('CHARGEBACK', 'chargeback', 'CHARGEDBACK') THEN 'chargeback'
      WHEN hs.status IN ('CANCELLED', 'cancelled', 'CANCELED') THEN 'cancellation'
      WHEN hs.status IN ('EXPIRED', 'expired') THEN 'expiration'
      WHEN hs.status IN ('APPROVED', 'approved', 'COMPLETE', 'complete', 'COMPLETED', 'completed') THEN 'sale'
      ELSE 'pending'
    END AS event_type,
    CASE 
      WHEN hs.status IN ('APPROVED', 'approved', 'COMPLETE', 'complete', 'COMPLETED', 'completed') THEN 'confirmed'
      WHEN hs.status IN ('REFUNDED', 'refunded', 'CHARGEBACK', 'chargeback', 'CHARGEDBACK', 'CANCELLED', 'cancelled', 'CANCELED') THEN 'reversed'
      WHEN hs.status IN ('EXPIRED', 'expired') THEN 'expired'
      ELSE 'pending'
    END AS canonical_status,
    CASE 
      WHEN om.tipo_posicao = 'front' THEN 'primary_sale'
      WHEN om.tipo_posicao = 'order_bump' THEN 'order_bump'
      WHEN om.tipo_posicao = 'upsell' THEN 'upsell'
      WHEN om.tipo_posicao = 'downsell' THEN 'downsell'
      ELSE NULL
    END AS sale_type,
    COALESCE(hs.total_price, 0)::NUMERIC AS gross_value_brl,
    COALESCE(hs.net_revenue, hs.total_price * 0.9, 0)::NUMERIC AS net_value_brl,
    'BRL' AS currency,
    hs.product_code,
    hs.product_name,
    hs.offer_code,
    om.nome_oferta AS offer_name,
    om.funnel_id::TEXT AS funnel_id,
    om.tipo_posicao AS funnel_position,
    om.ordem_posicao AS funnel_position_order,
    COALESCE(hs.sale_date, hs.created_at) AS event_timestamp,
    hs.sale_date AS purchase_date,
    hs.confirmation_date,
    hs.created_at AS recorded_at,
    hs.utm_source,
    NULL::TEXT AS utm_medium,
    hs.utm_campaign_id AS utm_campaign,
    NULL::TEXT AS utm_content,
    NULL::TEXT AS utm_term,
    hs.checkout_origin,
    hs.payment_method,
    hs.payment_type,
    hs.installment_number AS installments_number,
    hs.status AS original_status,
    (hs.recurrence IS NOT NULL AND hs.recurrence > 0) AS is_subscription,
    hs.affiliate_name,
    hs.affiliate_code AS affiliate_id,
    ROW_NUMBER() OVER (PARTITION BY hs.project_id, hs.transaction_id, hs.offer_code ORDER BY hs.created_at DESC) AS row_num
  FROM public.hotmart_sales hs
  LEFT JOIN public.offer_mappings om ON om.project_id = hs.project_id AND (om.codigo_oferta = hs.offer_code OR om.id_produto = hs.product_code)
),
crm_mapped AS (
  SELECT
    ct.id::TEXT AS internal_id,
    ct.platform,
    ct.external_id,
    ct.project_id,
    cc.email AS contact_email,
    cc.name AS contact_name,
    cc.phone AS contact_phone,
    CASE 
      WHEN ct.status IN ('refunded', 'REFUNDED') THEN 'refund'
      WHEN ct.status IN ('chargeback', 'CHARGEBACK') THEN 'chargeback'
      WHEN ct.status IN ('cancelled', 'CANCELLED', 'canceled', 'CANCELED') THEN 'cancellation'
      WHEN ct.status IN ('expired', 'EXPIRED') THEN 'expiration'
      WHEN ct.status IN ('approved', 'APPROVED', 'completed', 'COMPLETED', 'paid', 'PAID') THEN 'sale'
      ELSE 'pending'
    END AS event_type,
    CASE 
      WHEN ct.status IN ('approved', 'APPROVED', 'completed', 'COMPLETED', 'paid', 'PAID') THEN 'confirmed'
      WHEN ct.status IN ('refunded', 'REFUNDED', 'chargeback', 'CHARGEBACK', 'cancelled', 'CANCELLED') THEN 'reversed'
      WHEN ct.status IN ('expired', 'EXPIRED') THEN 'expired'
      ELSE 'pending'
    END AS canonical_status,
    NULL::TEXT AS sale_type,
    COALESCE(ct.total_price_brl, ct.total_price, 0)::NUMERIC AS gross_value_brl,
    COALESCE(ct.net_revenue, ct.total_price_brl * 0.9, 0)::NUMERIC AS net_value_brl,
    'BRL' AS currency,
    ct.product_code,
    ct.product_name,
    ct.offer_code,
    ct.offer_name,
    ct.funnel_id::TEXT AS funnel_id,
    NULL::TEXT AS funnel_position,
    NULL::INTEGER AS funnel_position_order,
    COALESCE(ct.transaction_date, ct.created_at) AS event_timestamp,
    ct.transaction_date AS purchase_date,
    ct.confirmation_date,
    ct.created_at AS recorded_at,
    ct.utm_source,
    ct.utm_medium,
    ct.utm_campaign,
    ct.utm_content,
    NULL::TEXT AS utm_term,
    NULL::TEXT AS checkout_origin,
    ct.payment_method,
    ct.payment_type,
    ct.installment_number AS installments_number,
    ct.status AS original_status,
    FALSE AS is_subscription,
    ct.affiliate_name,
    ct.affiliate_code AS affiliate_id,
    ROW_NUMBER() OVER (PARTITION BY ct.project_id, ct.external_id, ct.offer_code ORDER BY ct.created_at DESC) AS row_num
  FROM public.crm_transactions ct
  LEFT JOIN public.crm_contacts cc ON cc.id = ct.contact_id
  WHERE ct.platform != 'hotmart'
)
SELECT internal_id, platform, external_id, project_id, contact_email, contact_name, contact_phone, event_type, canonical_status, sale_type, gross_value_brl, net_value_brl, currency, product_code, product_name, offer_code, offer_name, funnel_id, funnel_position, funnel_position_order, event_timestamp, purchase_date, confirmation_date, recorded_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, checkout_origin, payment_method, payment_type, installments_number, original_status, is_subscription, affiliate_name, affiliate_id
FROM hotmart_mapped WHERE row_num = 1
UNION ALL
SELECT internal_id, platform, external_id, project_id, contact_email, contact_name, contact_phone, event_type, canonical_status, sale_type, gross_value_brl, net_value_brl, currency, product_code, product_name, offer_code, offer_name, funnel_id, funnel_position, funnel_position_order, event_timestamp, purchase_date, confirmation_date, recorded_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, checkout_origin, payment_method, payment_type, installments_number, original_status, is_subscription, affiliate_name, affiliate_id
FROM crm_mapped WHERE row_num = 1;

-- 2. funnel_metrics_daily
CREATE VIEW public.funnel_metrics_daily
WITH (security_invoker = on) AS
WITH daily_sales AS (
  SELECT
    cse.project_id, cse.funnel_id,
    DATE(cse.event_timestamp AT TIME ZONE 'America/Sao_Paulo') AS metric_date,
    COUNT(*) FILTER (WHERE cse.event_type = 'sale' AND cse.canonical_status = 'confirmed') AS confirmed_sales,
    COUNT(*) FILTER (WHERE cse.event_type = 'sale' AND cse.canonical_status = 'confirmed' AND cse.funnel_position = 'front') AS front_sales,
    COUNT(*) FILTER (WHERE cse.event_type = 'refund') AS refunds,
    COUNT(*) FILTER (WHERE cse.event_type = 'chargeback') AS chargebacks,
    COALESCE(SUM(cse.gross_value_brl) FILTER (WHERE cse.event_type = 'sale' AND cse.canonical_status = 'confirmed'), 0) AS gross_revenue,
    COALESCE(SUM(cse.net_value_brl) FILTER (WHERE cse.event_type = 'sale' AND cse.canonical_status = 'confirmed'), 0) AS net_revenue,
    COUNT(DISTINCT cse.contact_email) FILTER (WHERE cse.event_type = 'sale' AND cse.canonical_status = 'confirmed') AS unique_buyers
  FROM public.canonical_sale_events cse WHERE cse.funnel_id IS NOT NULL
  GROUP BY cse.project_id, cse.funnel_id, DATE(cse.event_timestamp AT TIME ZONE 'America/Sao_Paulo')
),
daily_investment AS (
  SELECT 
    mi.project_id, 
    fma.funnel_id::TEXT AS funnel_id, 
    mi.date_start AS metric_date, 
    COALESCE(SUM(mi.spend), 0) AS investment
  FROM public.meta_insights mi
  INNER JOIN public.meta_ad_accounts maa ON maa.account_id = mi.ad_account_id AND maa.project_id = mi.project_id
  INNER JOIN public.funnel_meta_accounts fma ON fma.meta_account_id = maa.id AND fma.project_id = mi.project_id
  GROUP BY mi.project_id, fma.funnel_id, mi.date_start
)
SELECT
  COALESCE(ds.project_id, di.project_id) AS project_id,
  COALESCE(ds.funnel_id, di.funnel_id) AS funnel_id,
  COALESCE(ds.metric_date, di.metric_date) AS metric_date,
  COALESCE(di.investment, 0) AS investment,
  COALESCE(ds.confirmed_sales, 0) AS confirmed_sales,
  COALESCE(ds.front_sales, 0) AS front_sales,
  COALESCE(ds.refunds, 0) AS refunds,
  COALESCE(ds.chargebacks, 0) AS chargebacks,
  COALESCE(ds.unique_buyers, 0) AS unique_buyers,
  COALESCE(ds.gross_revenue, 0) AS gross_revenue,
  COALESCE(ds.net_revenue, 0) AS net_revenue,
  CASE WHEN COALESCE(ds.confirmed_sales, 0) > 0 THEN ROUND((ds.gross_revenue / ds.confirmed_sales)::NUMERIC, 2) ELSE 0 END AS avg_ticket,
  CASE WHEN COALESCE(di.investment, 0) > 0 THEN ROUND((ds.gross_revenue / di.investment)::NUMERIC, 2) ELSE NULL END AS roas,
  CASE WHEN COALESCE(ds.front_sales, 0) > 0 THEN ROUND((di.investment / ds.front_sales)::NUMERIC, 2) ELSE NULL END AS cpa_real,
  CASE WHEN COALESCE(ds.confirmed_sales, 0) > 0 THEN ROUND((ds.refunds::NUMERIC / ds.confirmed_sales * 100), 2) ELSE 0 END AS refund_rate,
  CASE WHEN COALESCE(ds.confirmed_sales, 0) > 0 THEN ROUND((ds.chargebacks::NUMERIC / ds.confirmed_sales * 100), 2) ELSE 0 END AS chargeback_rate
FROM daily_sales ds
FULL OUTER JOIN daily_investment di ON ds.project_id = di.project_id AND ds.funnel_id = di.funnel_id AND ds.metric_date = di.metric_date
WHERE COALESCE(ds.funnel_id, di.funnel_id) IS NOT NULL;

-- 3. funnel_summary
CREATE VIEW public.funnel_summary
WITH (security_invoker = on) AS
SELECT
  fmd.project_id, fmd.funnel_id, f.name AS funnel_name, f.funnel_type, f.roas_target,
  MIN(fmd.metric_date) AS first_sale_date, MAX(fmd.metric_date) AS last_sale_date,
  SUM(fmd.investment) AS total_investment, SUM(fmd.gross_revenue) AS total_gross_revenue,
  SUM(fmd.confirmed_sales) AS total_confirmed_sales, SUM(fmd.front_sales) AS total_front_sales,
  SUM(fmd.refunds) AS total_refunds, SUM(fmd.chargebacks) AS total_chargebacks,
  CASE WHEN SUM(fmd.investment) > 0 THEN ROUND((SUM(fmd.gross_revenue) / SUM(fmd.investment))::NUMERIC, 2) ELSE NULL END AS overall_roas,
  CASE WHEN SUM(fmd.front_sales) > 0 THEN ROUND((SUM(fmd.investment) / SUM(fmd.front_sales))::NUMERIC, 2) ELSE NULL END AS overall_cpa,
  CASE WHEN SUM(fmd.confirmed_sales) > 0 THEN ROUND((SUM(fmd.gross_revenue) / SUM(fmd.confirmed_sales))::NUMERIC, 2) ELSE 0 END AS overall_avg_ticket,
  CASE WHEN SUM(fmd.confirmed_sales) > 0 THEN ROUND((SUM(fmd.refunds)::NUMERIC / SUM(fmd.confirmed_sales) * 100), 2) ELSE 0 END AS overall_refund_rate,
  CASE WHEN SUM(fmd.confirmed_sales) > 0 THEN ROUND((SUM(fmd.chargebacks)::NUMERIC / SUM(fmd.confirmed_sales) * 100), 2) ELSE 0 END AS overall_chargeback_rate,
  CASE
    WHEN MAX(fmd.metric_date) < CURRENT_DATE - INTERVAL '30 days' THEN 'inactive'
    WHEN SUM(fmd.chargebacks)::NUMERIC / NULLIF(SUM(fmd.confirmed_sales), 0) * 100 >= 2 THEN 'no-return'
    WHEN SUM(fmd.investment) > 0 AND (SUM(fmd.gross_revenue) / SUM(fmd.investment)) >= COALESCE(f.roas_target, 2) * 1.5 THEN 'excellent'
    WHEN SUM(fmd.investment) > 0 AND (SUM(fmd.gross_revenue) / SUM(fmd.investment)) >= COALESCE(f.roas_target, 2) THEN 'good'
    WHEN SUM(fmd.investment) > 0 AND (SUM(fmd.gross_revenue) / SUM(fmd.investment)) >= COALESCE(f.roas_target, 2) * 0.7 THEN 'attention'
    ELSE 'danger'
  END AS health_status
FROM public.funnel_metrics_daily fmd
INNER JOIN public.funnels f ON f.id::TEXT = fmd.funnel_id
GROUP BY fmd.project_id, fmd.funnel_id, f.name, f.funnel_type, f.roas_target;

-- Adicionar comentários
COMMENT ON VIEW public.canonical_sale_events IS 'View canônica de eventos de venda unificando Hotmart e CRM';
COMMENT ON VIEW public.funnel_metrics_daily IS 'Métricas diárias por funil com cálculos de performance';
COMMENT ON VIEW public.funnel_summary IS 'Resumo agregado do funil com status de saúde';
