-- Fix migration timeouts by doing safe, idempotent batch inserts

-- 1) Add a stable external identifier to avoid duplicates and allow fast incremental migration
ALTER TABLE public.crm_contact_interactions
ADD COLUMN IF NOT EXISTS external_id text;

-- Backfill from metadata when available (safe if table already has some rows)
UPDATE public.crm_contact_interactions
SET external_id = COALESCE(external_id, (metadata->>'transaction_id'))
WHERE external_id IS NULL
  AND metadata ? 'transaction_id';

-- Unique index to guarantee idempotency per project/transaction
CREATE UNIQUE INDEX IF NOT EXISTS crm_contact_interactions_project_external_id_key
ON public.crm_contact_interactions (project_id, external_id);

-- 2) Add functional indexes to speed up case-insensitive joins
CREATE INDEX IF NOT EXISTS idx_crm_contacts_project_lower_email
ON public.crm_contacts (project_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_hotmart_sales_project_lower_buyer_email
ON public.hotmart_sales (project_id, lower(buyer_email));

-- 3) Create a batch RPC that inserts a limited number of rows per call (prevents statement_timeout)
DROP FUNCTION IF EXISTS public.migrate_hotmart_to_interactions_batch(uuid, integer);

CREATE OR REPLACE FUNCTION public.migrate_hotmart_to_interactions_batch(
  p_project_id uuid DEFAULT NULL,
  p_batch_size integer DEFAULT 2000
)
RETURNS TABLE(interactions_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_created integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- If a project is specified, require access to it
  IF p_project_id IS NOT NULL THEN
    IF NOT public.has_project_access(auth.uid(), p_project_id) AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  WITH source AS (
    SELECT
      c.id AS contact_id,
      hs.project_id,
      hs.transaction_id,
      hs.status,
      COALESCE(hs.sale_date, hs.created_at) AS interacted_at,
      hs.product_name,
      hs.utm_source,
      hs.utm_campaign_id,
      hs.utm_adset_name,
      hs.utm_creative,
      hs.utm_placement,
      hs.meta_campaign_id_extracted,
      hs.meta_adset_id_extracted,
      hs.meta_ad_id_extracted,
      hs.product_code,
      hs.offer_code,
      hs.total_price_brl
    FROM public.hotmart_sales hs
    JOIN public.crm_contacts c
      ON c.project_id = hs.project_id
     AND lower(c.email) = lower(hs.buyer_email)
    LEFT JOIN public.crm_contact_interactions ci
      ON ci.project_id = hs.project_id
     AND ci.external_id = hs.transaction_id
    WHERE hs.buyer_email IS NOT NULL
      AND ci.id IS NULL
      AND (
        -- explicit project
        (p_project_id IS NOT NULL AND hs.project_id = p_project_id)
        OR
        -- no project specified: only migrate projects the user can access (or all if super admin)
        (p_project_id IS NULL AND (
          public.is_super_admin(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = hs.project_id
              AND pm.user_id = auth.uid()
          )
        ))
      )
    LIMIT p_batch_size
  ),
  inserted AS (
    INSERT INTO public.crm_contact_interactions (
      contact_id,
      project_id,
      external_id,
      interaction_type,
      interacted_at,
      page_name,
      utm_source,
      utm_campaign,
      utm_adset,
      utm_creative,
      utm_placement,
      meta_campaign_id,
      meta_adset_id,
      meta_ad_id,
      metadata
    )
    SELECT
      s.contact_id,
      s.project_id,
      s.transaction_id,
      CASE
        WHEN s.status IN ('APPROVED', 'COMPLETE') THEN 'purchase'
        WHEN s.status = 'ABANDONED' THEN 'cart_abandonment'
        WHEN s.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'checkout'
        WHEN s.status IN ('REFUNDED', 'CHARGEBACK', 'CANCELLED', 'CANCELED') THEN 'refund'
        ELSE 'transaction'
      END,
      s.interacted_at,
      s.product_name,
      s.utm_source,
      s.utm_campaign_id,
      s.utm_adset_name,
      s.utm_creative,
      s.utm_placement,
      s.meta_campaign_id_extracted,
      s.meta_adset_id_extracted,
      s.meta_ad_id_extracted,
      jsonb_build_object(
        'transaction_id', s.transaction_id,
        'status', s.status,
        'product_code', s.product_code,
        'offer_code', s.offer_code,
        'total_price', s.total_price_brl,
        'migrated', true
      )
    FROM source s
    ON CONFLICT (project_id, external_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_created FROM inserted;

  RETURN QUERY SELECT v_created;
END;
$function$;

-- 4) Keep existing RPC name compatible with the UI, but now it runs only one batch per click
DROP FUNCTION IF EXISTS public.migrate_hotmart_to_interactions();

CREATE OR REPLACE FUNCTION public.migrate_hotmart_to_interactions()
RETURNS TABLE(interactions_created integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.migrate_hotmart_to_interactions_batch(NULL::uuid, 2000);
$function$;
