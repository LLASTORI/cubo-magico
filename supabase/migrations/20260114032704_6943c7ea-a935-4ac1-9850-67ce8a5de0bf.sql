-- ============================================
-- NORMALIZE is_active FLAGS FOR HOTMART SALES
-- ============================================
-- Problem: Multiple events per transaction with conflicting is_active
-- Solution: For each transaction_id, keep only ONE active purchase event
--
-- Logic:
-- 1. For each hotmart transaction, find all purchase events
-- 2. Keep the most recent one (COMPLETE > APPROVED based on occurred_at)
-- 3. Set that one as is_active=true
-- 4. Set all others as is_active=false
-- ============================================

-- First, deactivate all duplicate events (keep only the best one per transaction)
WITH transaction_events AS (
  SELECT 
    id,
    provider_event_id,
    -- Extract transaction_id from provider_event_id (format: hotmart_HPXXXXXXXXX_STATUS)
    (regexp_match(provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1] as transaction_id,
    occurred_at,
    event_type,
    is_active,
    -- Rank: prefer COMPLETE over APPROVED, then most recent
    ROW_NUMBER() OVER (
      PARTITION BY (regexp_match(provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]
      ORDER BY 
        CASE 
          WHEN provider_event_id LIKE '%_COMPLETE' THEN 1
          WHEN provider_event_id LIKE '%_BACKFILL' THEN 2
          WHEN provider_event_id LIKE '%_APPROVED' THEN 3
          ELSE 4
        END,
        occurred_at DESC
    ) as rn
  FROM sales_core_events
  WHERE provider = 'hotmart'
    AND event_type = 'purchase'
),
-- Identify losers (rn > 1) to deactivate
losers AS (
  SELECT id FROM transaction_events WHERE rn > 1
)
UPDATE sales_core_events
SET is_active = false
WHERE id IN (SELECT id FROM losers)
  AND is_active = true;

-- Now activate all winners (rn = 1) in case they were incorrectly deactivated
WITH transaction_events AS (
  SELECT 
    id,
    provider_event_id,
    (regexp_match(provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1] as transaction_id,
    occurred_at,
    ROW_NUMBER() OVER (
      PARTITION BY (regexp_match(provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]
      ORDER BY 
        CASE 
          WHEN provider_event_id LIKE '%_COMPLETE' THEN 1
          WHEN provider_event_id LIKE '%_BACKFILL' THEN 2
          WHEN provider_event_id LIKE '%_APPROVED' THEN 3
          ELSE 4
        END,
        occurred_at DESC
    ) as rn
  FROM sales_core_events
  WHERE provider = 'hotmart'
    AND event_type = 'purchase'
),
winners AS (
  SELECT id FROM transaction_events WHERE rn = 1
)
UPDATE sales_core_events
SET is_active = true
WHERE id IN (SELECT id FROM winners)
  AND is_active = false;