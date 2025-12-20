
-- Função para extrair e preencher UTMs dos contatos baseado no checkout_origin das transações
CREATE OR REPLACE FUNCTION public.populate_contact_utms_from_transactions()
RETURNS TABLE(updated_count integer) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_batch_size integer := 2000;
  v_contact_row RECORD;
  v_checkout_origin text;
  v_parts text[];
  v_source text;
  v_adset_full text;
  v_campaign_full text;
  v_placement text;
  v_creative_full text;
  v_adset_id text;
  v_campaign_id text;
  v_ad_id text;
BEGIN
  -- Buscar contatos que têm transações mas UTMs incompletos
  FOR v_contact_row IN
    SELECT DISTINCT c.id as contact_id
    FROM crm_contacts c
    INNER JOIN crm_transactions t ON t.contact_id = c.id
    WHERE (c.first_utm_source IS NULL OR c.first_utm_source = '')
      AND EXISTS (
        SELECT 1 FROM hotmart_sales hs 
        WHERE hs.project_id = c.project_id 
          AND lower(hs.buyer_email) = lower(c.email)
          AND hs.checkout_origin IS NOT NULL 
          AND hs.checkout_origin != ''
      )
    LIMIT v_batch_size
  LOOP
    -- Buscar o checkout_origin da primeira venda
    SELECT hs.checkout_origin INTO v_checkout_origin
    FROM hotmart_sales hs
    INNER JOIN crm_contacts c ON c.id = v_contact_row.contact_id
    WHERE lower(hs.buyer_email) = lower(c.email)
      AND hs.project_id = c.project_id
      AND hs.checkout_origin IS NOT NULL 
      AND hs.checkout_origin != ''
    ORDER BY hs.sale_date ASC NULLS LAST
    LIMIT 1;
    
    IF v_checkout_origin IS NOT NULL THEN
      -- Parse checkout_origin: Source|Campaign_ID|Adset_ID|Placement|Creative_ID|PageName
      v_parts := string_to_array(v_checkout_origin, '|');
      v_source := COALESCE(v_parts[1], '');
      v_adset_full := COALESCE(v_parts[2], '');
      v_campaign_full := COALESCE(v_parts[3], '');
      v_placement := COALESCE(v_parts[4], '');
      v_creative_full := COALESCE(v_parts[5], '');
      
      -- Extrair IDs numéricos (últimos 10+ dígitos após underscore)
      v_adset_id := (regexp_match(v_adset_full, '_(\d{10,})$'))[1];
      v_campaign_id := (regexp_match(v_campaign_full, '_(\d{10,})$'))[1];
      v_ad_id := (regexp_match(v_creative_full, '_(\d{10,})$'))[1];
      
      -- Atualizar o contato
      UPDATE crm_contacts
      SET 
        first_utm_source = NULLIF(v_source, ''),
        first_utm_campaign = NULLIF(v_adset_full, ''),  -- Nome completo da campanha
        first_utm_medium = NULLIF(v_placement, ''),
        first_utm_adset = NULLIF(v_campaign_full, ''),  -- Nome completo do adset
        first_utm_ad = NULLIF(v_creative_full, ''),     -- Nome completo do criativo
        first_meta_campaign_id = v_adset_id,            -- ID numérico da campanha
        first_meta_adset_id = v_campaign_id,            -- ID numérico do adset
        first_meta_ad_id = v_ad_id,                     -- ID numérico do ad
        updated_at = now()
      WHERE id = v_contact_row.contact_id;
      
      v_updated := v_updated + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_updated;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.populate_contact_utms_from_transactions() TO authenticated;
