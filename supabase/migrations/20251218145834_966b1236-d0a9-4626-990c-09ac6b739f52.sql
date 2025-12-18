
-- Atualizar função para verificar recuperação por MESMO PRODUTO
CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id uuid;
  v_existing_tags text[];
  v_new_tags text[];
  v_had_abandoned boolean := false;
BEGIN
  -- Só processar se tiver email e project_id
  IF NEW.buyer_email IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar ou criar contato
  SELECT id, tags INTO v_contact_id, v_existing_tags
  FROM crm_contacts
  WHERE project_id = NEW.project_id 
    AND LOWER(email) = LOWER(NEW.buyer_email);

  IF v_contact_id IS NULL THEN
    -- Criar novo contato
    INSERT INTO crm_contacts (
      project_id,
      email,
      name,
      phone,
      phone_ddd,
      phone_country_code,
      document,
      instagram,
      address,
      address_number,
      address_complement,
      neighborhood,
      city,
      state,
      country,
      cep,
      source,
      status,
      first_utm_source,
      first_utm_campaign,
      first_utm_adset,
      first_utm_creative,
      first_utm_placement,
      first_meta_campaign_id,
      first_meta_adset_id,
      first_meta_ad_id
    ) VALUES (
      NEW.project_id,
      NEW.buyer_email,
      NEW.buyer_name,
      NEW.buyer_phone,
      NEW.buyer_phone_ddd,
      NEW.buyer_phone_country_code,
      NEW.buyer_document,
      NEW.buyer_instagram,
      NEW.buyer_address,
      NEW.buyer_address_number,
      NEW.buyer_address_complement,
      NEW.buyer_neighborhood,
      NEW.buyer_city,
      NEW.buyer_state,
      NEW.buyer_country,
      NEW.buyer_cep,
      'hotmart',
      CASE 
        WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer'
        ELSE 'lead'
      END,
      NEW.utm_source,
      NEW.utm_campaign_id,
      NEW.utm_adset_name,
      NEW.utm_creative,
      NEW.utm_placement,
      NEW.meta_campaign_id_extracted,
      NEW.meta_adset_id_extracted,
      NEW.meta_ad_id_extracted
    )
    RETURNING id, tags INTO v_contact_id, v_existing_tags;
  END IF;

  -- Inicializar tags
  v_existing_tags := COALESCE(v_existing_tags, ARRAY[]::text[]);
  v_new_tags := v_existing_tags;

  -- Verificar se tinha carrinho abandonado do MESMO PRODUTO antes (para compras aprovadas)
  IF NEW.status IN ('APPROVED', 'COMPLETE') AND NEW.product_code IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM hotmart_sales
      WHERE project_id = NEW.project_id
        AND LOWER(buyer_email) = LOWER(NEW.buyer_email)
        AND status = 'ABANDONED'
        AND product_code = NEW.product_code  -- Mesmo produto
        AND sale_date < COALESCE(NEW.confirmation_date, NEW.sale_date)
        AND id != NEW.id
    ) INTO v_had_abandoned;
  END IF;

  -- Gerenciar tags baseado no status
  IF NEW.status IN ('APPROVED', 'COMPLETE') THEN
    -- Remover tag de carrinho abandonado se existir
    v_new_tags := array_remove(v_new_tags, 'Carrinho Abandonado');
    
    -- Se tinha carrinho abandonado do mesmo produto, adicionar tag de recuperação
    IF v_had_abandoned AND NOT ('Recuperado (auto)' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Recuperado (auto)');
    END IF;
    
    -- Atualizar status para customer
    UPDATE crm_contacts
    SET 
      status = 'customer',
      tags = v_new_tags,
      updated_at = now()
    WHERE id = v_contact_id;
    
  ELSIF NEW.status = 'ABANDONED' THEN
    -- Adicionar tag de carrinho abandonado se não existir
    IF NOT ('Carrinho Abandonado' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Carrinho Abandonado');
    END IF;
    
    UPDATE crm_contacts
    SET 
      tags = v_new_tags,
      updated_at = now()
    WHERE id = v_contact_id;
    
  ELSIF NEW.status IN ('REFUNDED', 'CHARGEBACK', 'CANCELLED', 'CANCELED') THEN
    -- Apenas atualizar timestamp para esses status
    UPDATE crm_contacts
    SET updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  -- Criar/atualizar transação no CRM
  INSERT INTO crm_transactions (
    contact_id,
    project_id,
    external_id,
    platform,
    product_code,
    product_name,
    product_price,
    offer_code,
    offer_name,
    offer_price,
    total_price,
    total_price_brl,
    net_revenue,
    payment_method,
    payment_type,
    installment_number,
    coupon,
    status,
    transaction_date,
    confirmation_date,
    utm_source,
    utm_campaign,
    utm_adset,
    utm_creative,
    utm_placement,
    meta_campaign_id,
    meta_adset_id,
    meta_ad_id,
    affiliate_code,
    affiliate_name
  ) VALUES (
    v_contact_id,
    NEW.project_id,
    NEW.transaction_id,
    'hotmart',
    NEW.product_code,
    NEW.product_name,
    NEW.product_price,
    NEW.offer_code,
    NULL,
    NEW.offer_price,
    NEW.total_price,
    NEW.total_price_brl,
    NEW.net_revenue,
    NEW.payment_method,
    NEW.payment_type,
    NEW.installment_number,
    NEW.coupon,
    NEW.status,
    NEW.sale_date,
    NEW.confirmation_date,
    NEW.utm_source,
    NEW.utm_campaign_id,
    NEW.utm_adset_name,
    NEW.utm_creative,
    NEW.utm_placement,
    NEW.meta_campaign_id_extracted,
    NEW.meta_adset_id_extracted,
    NEW.meta_ad_id_extracted,
    NEW.affiliate_code,
    NEW.affiliate_name
  )
  ON CONFLICT (external_id, project_id) WHERE external_id IS NOT NULL
  DO UPDATE SET
    status = EXCLUDED.status,
    confirmation_date = COALESCE(EXCLUDED.confirmation_date, crm_transactions.confirmation_date),
    total_price_brl = COALESCE(EXCLUDED.total_price_brl, crm_transactions.total_price_brl),
    net_revenue = COALESCE(EXCLUDED.net_revenue, crm_transactions.net_revenue),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
