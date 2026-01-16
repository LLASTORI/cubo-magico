
-- =====================================================
-- CRM ORDERS SHADOW CORE VIEWS
-- =====================================================
-- 🚫 FORBIDDEN: hotmart_sales, crm_transactions, crm_contacts
-- ✅ This CRM view is 100% Orders + Ledger. Legacy CRM tables are forbidden.
-- =====================================================

-- 1️⃣ crm_orders_view - One row per order
CREATE OR REPLACE VIEW public.crm_orders_view AS
SELECT
  o.id AS order_id,
  o.project_id,
  o.provider_order_id,
  o.buyer_email,
  o.buyer_name,
  o.ordered_at,
  o.approved_at,
  o.status,
  o.customer_paid,
  o.producer_net,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
  EXISTS(SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type NOT IN ('main')) AS has_bump,
  EXISTS(SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'upsell') AS has_upsell,
  COALESCE(
    (SELECT oi.funnel_id FROM order_items oi WHERE oi.order_id = o.id LIMIT 1),
    (SELECT om.funnel_id FROM order_items oi 
     JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
     WHERE oi.order_id = o.id LIMIT 1)
  ) AS funnel_id,
  (SELECT f.name FROM funnels f WHERE f.id = COALESCE(
    (SELECT oi.funnel_id FROM order_items oi WHERE oi.order_id = o.id LIMIT 1),
    (SELECT om.funnel_id FROM order_items oi 
     JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
     WHERE oi.order_id = o.id LIMIT 1)
  )) AS funnel_name
FROM orders o
WHERE o.status IN ('approved', 'completed', 'APPROVED', 'COMPLETE');
-- 🚫 FORBIDDEN: hotmart_sales, crm_transactions, crm_contacts
-- ✅ This CRM view is 100% Orders + Ledger. Legacy CRM tables are forbidden.

-- 2️⃣ crm_order_items_view - One row per order item
CREATE OR REPLACE VIEW public.crm_order_items_view AS
SELECT
  oi.id AS item_id,
  oi.order_id,
  o.project_id,
  o.buyer_email,
  o.buyer_name,
  oi.item_type,
  oi.product_name,
  oi.provider_product_id,
  oi.provider_offer_id,
  oi.base_price,
  COALESCE(oi.funnel_id, om.funnel_id) AS funnel_id,
  f.name AS funnel_name
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
LEFT JOIN funnels f ON f.id = COALESCE(oi.funnel_id, om.funnel_id)
WHERE o.status IN ('approved', 'completed', 'APPROVED', 'COMPLETE');
-- 🚫 FORBIDDEN: hotmart_sales, crm_transactions, crm_contacts
-- ✅ This CRM view is 100% Orders + Ledger. Legacy CRM tables are forbidden.

-- 3️⃣ crm_contact_revenue_view - One row per contact (aggregated)
CREATE OR REPLACE VIEW public.crm_contact_revenue_view AS
SELECT
  o.project_id,
  LOWER(o.buyer_email) AS buyer_email,
  MAX(o.buyer_name) AS buyer_name,
  COUNT(DISTINCT o.id) AS total_orders,
  SUM(o.customer_paid) AS total_customer_paid,
  SUM(o.producer_net) AS total_producer_net,
  MIN(o.ordered_at) AS first_purchase_at,
  MAX(o.ordered_at) AS last_purchase_at,
  ROUND(AVG(o.customer_paid), 2) AS average_ticket
FROM orders o
WHERE o.status IN ('approved', 'completed', 'APPROVED', 'COMPLETE')
GROUP BY o.project_id, LOWER(o.buyer_email);
-- 🚫 FORBIDDEN: hotmart_sales, crm_transactions, crm_contacts
-- ✅ This CRM view is 100% Orders + Ledger. Legacy CRM tables are forbidden.

-- 4️⃣ crm_contact_attribution_view - Attribution from first order
CREATE OR REPLACE VIEW public.crm_contact_attribution_view AS
WITH first_orders AS (
  SELECT DISTINCT ON (LOWER(o.buyer_email), o.project_id)
    o.id AS order_id,
    o.project_id,
    LOWER(o.buyer_email) AS buyer_email,
    o.buyer_name,
    o.ordered_at,
    o.raw_payload
  FROM orders o
  WHERE o.status IN ('approved', 'completed', 'APPROVED', 'COMPLETE')
  ORDER BY LOWER(o.buyer_email), o.project_id, o.ordered_at ASC
)
SELECT
  fo.project_id,
  fo.buyer_email,
  fo.buyer_name,
  fo.ordered_at AS first_order_at,
  -- Parse SCK format: Source|Campaign|Adset|Placement|Ad
  SPLIT_PART(fo.raw_payload->'data'->'purchase'->'origin'->>'sck', '|', 1) AS utm_source,
  SPLIT_PART(fo.raw_payload->'data'->'purchase'->'origin'->>'sck', '|', 2) AS meta_campaign_id,
  SPLIT_PART(fo.raw_payload->'data'->'purchase'->'origin'->>'sck', '|', 3) AS meta_adset_id,
  SPLIT_PART(fo.raw_payload->'data'->'purchase'->'origin'->>'sck', '|', 4) AS utm_placement,
  SPLIT_PART(fo.raw_payload->'data'->'purchase'->'origin'->>'sck', '|', 5) AS meta_ad_id,
  fo.raw_payload->'data'->'purchase'->'origin'->>'sck' AS raw_sck,
  fo.raw_payload->'data'->'purchase'->'origin'->>'xcod' AS raw_xcod
FROM first_orders fo;
-- 🚫 FORBIDDEN: hotmart_sales, crm_transactions, crm_contacts
-- ✅ This CRM view is 100% Orders + Ledger. Legacy CRM tables are forbidden.
