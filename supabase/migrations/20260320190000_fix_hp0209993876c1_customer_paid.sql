-- Fix HP0209993876C1: CSV import set customer_paid and producer_net_brl for only 1 item
-- Order has 3 items (953gfecc + qv8fq3lv + 4kwilp40) at R$17 each = R$51 total
-- producer_net_brl = R$14.32/item × 3 = R$42.96
UPDATE orders
SET
  customer_paid = 51,
  producer_net_brl = 42.96,
  updated_at = NOW()
WHERE provider_order_id = 'HP0209993876C1'
  AND customer_paid = 17;
