
-- Recriar função com abordagem mais eficiente usando UPDATE com JOIN
CREATE OR REPLACE FUNCTION public.populate_contact_utms_from_transactions()
RETURNS TABLE(updated_count integer) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  -- UPDATE em batch usando JOIN direto - muito mais eficiente
  WITH first_sales AS (
    SELECT DISTINCT ON (hs.project_id, lower(hs.buyer_email))
      hs.project_id,
      lower(hs.buyer_email) as email,
      hs.checkout_origin
    FROM hotmart_sales hs
    WHERE hs.checkout_origin IS NOT NULL 
      AND hs.checkout_origin != ''
      AND hs.buyer_email IS NOT NULL
    ORDER BY hs.project_id, lower(hs.buyer_email), hs.sale_date ASC NULLS LAST
  ),
  parsed AS (
    SELECT 
      fs.project_id,
      fs.email,
      split_part(fs.checkout_origin, '|', 1) as utm_source,
      split_part(fs.checkout_origin, '|', 2) as utm_campaign,
      split_part(fs.checkout_origin, '|', 3) as utm_adset,
      split_part(fs.checkout_origin, '|', 4) as utm_medium,
      split_part(fs.checkout_origin, '|', 5) as utm_ad,
      (regexp_match(split_part(fs.checkout_origin, '|', 2), '_(\d{10,})$'))[1] as meta_campaign_id,
      (regexp_match(split_part(fs.checkout_origin, '|', 3), '_(\d{10,})$'))[1] as meta_adset_id,
      (regexp_match(split_part(fs.checkout_origin, '|', 5), '_(\d{10,})$'))[1] as meta_ad_id
    FROM first_sales fs
  )
  UPDATE crm_contacts c
  SET 
    first_utm_source = NULLIF(p.utm_source, ''),
    first_utm_campaign = NULLIF(p.utm_campaign, ''),
    first_utm_adset = NULLIF(p.utm_adset, ''),
    first_utm_medium = NULLIF(p.utm_medium, ''),
    first_utm_ad = NULLIF(p.utm_ad, ''),
    first_meta_campaign_id = p.meta_campaign_id,
    first_meta_adset_id = p.meta_adset_id,
    first_meta_ad_id = p.meta_ad_id,
    updated_at = now()
  FROM parsed p
  WHERE c.project_id = p.project_id
    AND lower(c.email) = p.email
    AND (c.first_utm_source IS NULL OR c.first_utm_source = '');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN QUERY SELECT v_updated;
END;
$$;
