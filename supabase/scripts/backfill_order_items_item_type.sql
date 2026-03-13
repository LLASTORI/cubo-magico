-- ============================================================
-- BACKFILL: order_items.item_type = 'unknown'
-- Espelha exatamente a lógica de resolveItemType() do webhook.
--
-- PASSO 1: rode o DRY RUN para ver a distribuição antes de atualizar.
-- PASSO 2: rode o UPDATE.
-- ============================================================

-- Fonte do payload por item:
-- 1ª opção: provider_event_log (via metadata->>'webhook_event_id')
-- 2ª opção: orders.raw_payload (fallback)

-- ============================================================
-- PASSO 1 — DRY RUN: distribuição do que será resolvido
-- ============================================================
WITH payload_source AS (
  SELECT
    oi.id                               AS item_id,
    oi.provider_offer_id,
    COALESCE(
      pel.raw_payload,
      o.raw_payload
    )                                   AS payload
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  LEFT JOIN provider_event_log pel
    ON  pel.provider_event_id = (oi.metadata->>'webhook_event_id')
    AND pel.project_id        = o.project_id
  WHERE oi.item_type  = 'unknown'
    AND o.project_id  = 'a59d30c7-1009-4aa2-b106-6826011466e9'
),
resolved AS (
  SELECT
    item_id,
    provider_offer_id,
    payload->'data'->'purchase'->'offer'->>'name'                                         AS offer_name,
    payload->'data'->'purchase'->'order_bump'->>'is_order_bump'                           AS is_order_bump,
    payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction'             AS parent_tx,
    payload->'data'->'purchase'->>'transaction'                                           AS own_tx,
    CASE
      WHEN lower(payload->'data'->'purchase'->'offer'->>'name') LIKE '%upsell%'
        THEN 'upsell'
      WHEN lower(payload->'data'->'purchase'->'offer'->>'name') LIKE '%downsell%'
        THEN 'downsell'
      WHEN (payload->'data'->'purchase'->'order_bump'->>'is_order_bump') = 'true'
        AND (payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction') IS NOT NULL
        AND (payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction') <> ''
        AND (payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction')
            <> (payload->'data'->'purchase'->>'transaction')
        THEN 'bump'
      ELSE 'main'
    END AS resolved_type
  FROM payload_source
)
SELECT
  resolved_type,
  count(*)                                                    AS qty,
  array_agg(DISTINCT offer_name) FILTER (WHERE offer_name IS NOT NULL) AS sample_offers
FROM resolved
GROUP BY resolved_type
ORDER BY qty DESC;


-- ============================================================
-- PASSO 2 — UPDATE (rode somente após confirmar o dry run)
-- ============================================================
/*
WITH payload_source AS (
  SELECT
    oi.id AS item_id,
    COALESCE(
      pel.raw_payload,
      o.raw_payload
    ) AS payload
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  LEFT JOIN provider_event_log pel
    ON  pel.provider_event_id = (oi.metadata->>'webhook_event_id')
    AND pel.project_id        = o.project_id
  WHERE oi.item_type  = 'unknown'
    AND o.project_id  = 'a59d30c7-1009-4aa2-b106-6826011466e9'
),
resolved AS (
  SELECT
    item_id,
    CASE
      WHEN lower(payload->'data'->'purchase'->'offer'->>'name') LIKE '%upsell%'
        THEN 'upsell'
      WHEN lower(payload->'data'->'purchase'->'offer'->>'name') LIKE '%downsell%'
        THEN 'downsell'
      WHEN (payload->'data'->'purchase'->'order_bump'->>'is_order_bump') = 'true'
        AND (payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction') IS NOT NULL
        AND (payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction') <> ''
        AND (payload->'data'->'purchase'->'order_bump'->>'parent_purchase_transaction')
            <> (payload->'data'->'purchase'->>'transaction')
        THEN 'bump'
      ELSE 'main'
    END AS resolved_type
  FROM payload_source
)
UPDATE order_items
SET    item_type = resolved.resolved_type
FROM   resolved
WHERE  order_items.id = resolved.item_id
RETURNING order_items.id, order_items.item_type;
*/
