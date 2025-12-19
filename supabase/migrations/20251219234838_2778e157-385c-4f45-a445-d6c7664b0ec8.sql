-- Create trigger function to record interactions from hotmart_sales
CREATE OR REPLACE FUNCTION public.record_interaction_from_hotmart()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
  v_interaction_type text;
BEGIN
  -- Only process if we have email and project_id
  IF NEW.buyer_email IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the contact
  SELECT id INTO v_contact_id
  FROM crm_contacts
  WHERE project_id = NEW.project_id 
    AND LOWER(email) = LOWER(NEW.buyer_email);

  -- If no contact found, skip (will be created by sync trigger)
  IF v_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine interaction type based on status
  v_interaction_type := CASE 
    WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'purchase'
    WHEN NEW.status = 'ABANDONED' THEN 'cart_abandonment'
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'checkout'
    WHEN NEW.status IN ('REFUNDED', 'CHARGEBACK', 'CANCELLED', 'CANCELED') THEN 'refund'
    ELSE 'transaction'
  END;

  -- Insert interaction record
  INSERT INTO crm_contact_interactions (
    contact_id,
    project_id,
    interaction_type,
    interacted_at,
    page_name,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_adset,
    utm_ad,
    utm_creative,
    utm_placement,
    meta_campaign_id,
    meta_adset_id,
    meta_ad_id,
    metadata
  ) VALUES (
    v_contact_id,
    NEW.project_id,
    v_interaction_type,
    COALESCE(NEW.sale_date, NEW.created_at),
    NEW.product_name,
    NEW.utm_source,
    NEW.utm_campaign_id,
    NULL,
    NEW.utm_adset_name,
    NULL,
    NEW.utm_creative,
    NEW.utm_placement,
    NEW.meta_campaign_id_extracted,
    NEW.meta_adset_id_extracted,
    NEW.meta_ad_id_extracted,
    jsonb_build_object(
      'transaction_id', NEW.transaction_id,
      'status', NEW.status,
      'product_code', NEW.product_code,
      'offer_code', NEW.offer_code,
      'total_price', NEW.total_price_brl
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Create trigger on hotmart_sales
DROP TRIGGER IF EXISTS record_interaction_from_hotmart_trigger ON hotmart_sales;
CREATE TRIGGER record_interaction_from_hotmart_trigger
AFTER INSERT OR UPDATE ON hotmart_sales
FOR EACH ROW
EXECUTE FUNCTION record_interaction_from_hotmart();

-- Create function to migrate historical hotmart data to interactions
CREATE OR REPLACE FUNCTION public.migrate_hotmart_to_interactions()
RETURNS TABLE(interactions_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_created integer := 0;
  v_sale RECORD;
  v_contact_id uuid;
  v_interaction_type text;
BEGIN
  -- Process all historical hotmart sales
  FOR v_sale IN
    SELECT hs.*, c.id as contact_id
    FROM hotmart_sales hs
    JOIN crm_contacts c ON c.project_id = hs.project_id AND LOWER(c.email) = LOWER(hs.buyer_email)
    WHERE hs.buyer_email IS NOT NULL
    ORDER BY hs.sale_date ASC NULLS LAST
  LOOP
    -- Determine interaction type
    v_interaction_type := CASE 
      WHEN v_sale.status IN ('APPROVED', 'COMPLETE') THEN 'purchase'
      WHEN v_sale.status = 'ABANDONED' THEN 'cart_abandonment'
      WHEN v_sale.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'checkout'
      WHEN v_sale.status IN ('REFUNDED', 'CHARGEBACK', 'CANCELLED', 'CANCELED') THEN 'refund'
      ELSE 'transaction'
    END;

    -- Insert interaction
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
    ) VALUES (
      v_sale.contact_id,
      v_sale.project_id,
      v_interaction_type,
      COALESCE(v_sale.sale_date, v_sale.created_at),
      v_sale.product_name,
      v_sale.utm_source,
      v_sale.utm_campaign_id,
      v_sale.utm_adset_name,
      v_sale.utm_creative,
      v_sale.utm_placement,
      v_sale.meta_campaign_id_extracted,
      v_sale.meta_adset_id_extracted,
      v_sale.meta_ad_id_extracted,
      jsonb_build_object(
        'transaction_id', v_sale.transaction_id,
        'status', v_sale.status,
        'product_code', v_sale.product_code,
        'offer_code', v_sale.offer_code,
        'total_price', v_sale.total_price_brl,
        'migrated', true
      )
    )
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_created;
END;
$function$;