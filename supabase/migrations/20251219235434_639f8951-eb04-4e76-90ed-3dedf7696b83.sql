-- Drop existing function and recreate with optimized batch processing
DROP FUNCTION IF EXISTS public.migrate_hotmart_to_interactions();

CREATE OR REPLACE FUNCTION public.migrate_hotmart_to_interactions()
RETURNS TABLE(interactions_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_created integer := 0;
BEGIN
  -- Use set-based INSERT instead of row-by-row cursor (much faster)
  WITH inserted AS (
    INSERT INTO crm_contact_interactions (
      contact_id,
      project_id,
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
      c.id as contact_id,
      hs.project_id,
      CASE 
        WHEN hs.status IN ('APPROVED', 'COMPLETE') THEN 'purchase'
        WHEN hs.status = 'ABANDONED' THEN 'cart_abandonment'
        WHEN hs.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'checkout'
        WHEN hs.status IN ('REFUNDED', 'CHARGEBACK', 'CANCELLED', 'CANCELED') THEN 'refund'
        ELSE 'transaction'
      END as interaction_type,
      COALESCE(hs.sale_date, hs.created_at) as interacted_at,
      hs.product_name as page_name,
      hs.utm_source,
      hs.utm_campaign_id as utm_campaign,
      hs.utm_adset_name as utm_adset,
      hs.utm_creative,
      hs.utm_placement,
      hs.meta_campaign_id_extracted as meta_campaign_id,
      hs.meta_adset_id_extracted as meta_adset_id,
      hs.meta_ad_id_extracted as meta_ad_id,
      jsonb_build_object(
        'transaction_id', hs.transaction_id,
        'status', hs.status,
        'product_code', hs.product_code,
        'offer_code', hs.offer_code,
        'total_price', hs.total_price_brl,
        'migrated', true
      ) as metadata
    FROM hotmart_sales hs
    JOIN crm_contacts c ON c.project_id = hs.project_id AND LOWER(c.email) = LOWER(hs.buyer_email)
    WHERE hs.buyer_email IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_created FROM inserted;

  RETURN QUERY SELECT v_created;
END;
$function$;