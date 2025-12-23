
-- Atualizar trigger para adicionar tags genéricas além das contextuais
-- Isso garante consistência entre Pipeline de Vendas e Kanban de Recuperação

CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
  v_existing_tags text[];
  v_new_tags text[];
  v_products_purchased text[];
  v_product_identifier text;
  v_contextual_tag text;
  v_generic_tag text;
  v_abandonment_tag text;
  v_pending_tag text;
  v_cancelled_tag text;
  v_existing_phone text;
BEGIN
  -- Só processar se tiver email e project_id
  IF NEW.buyer_email IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar ou criar contato
  SELECT id, tags, products_purchased, phone INTO v_contact_id, v_existing_tags, v_products_purchased, v_existing_phone
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
    RETURNING id, tags, products_purchased INTO v_contact_id, v_existing_tags, v_products_purchased;
  END IF;

  -- Inicializar arrays
  v_existing_tags := COALESCE(v_existing_tags, ARRAY[]::text[]);
  v_new_tags := v_existing_tags;
  v_products_purchased := COALESCE(v_products_purchased, ARRAY[]::text[]);

  -- Criar identificador do produto/oferta para tags contextuais
  v_product_identifier := COALESCE(NEW.product_name, 'Produto') || COALESCE('|' || NEW.offer_code, '');

  -- Definir tags contextuais e genéricas baseadas no status
  v_contextual_tag := CASE 
    WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'comprou:' || v_product_identifier
    WHEN NEW.status = 'ABANDONED' THEN 'abandonou:' || v_product_identifier
    WHEN NEW.status IN ('REFUNDED') THEN 'reembolsou:' || v_product_identifier
    WHEN NEW.status = 'CHARGEBACK' THEN 'chargeback:' || v_product_identifier
    WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'cancelou:' || v_product_identifier
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'pendente:' || v_product_identifier
    ELSE NULL
  END;
  
  -- Tag genérica para facilitar filtros no Kanban
  v_generic_tag := CASE 
    WHEN NEW.status = 'ABANDONED' THEN 'Carrinho Abandonado'
    WHEN NEW.status IN ('REFUNDED') THEN 'Reembolsado'
    WHEN NEW.status = 'CHARGEBACK' THEN 'Chargeback'
    WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'Cancelado'
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE') THEN 'Boleto Pendente'
    WHEN NEW.status = 'EXPIRED' THEN 'Expirado'
    ELSE NULL
  END;

  -- Tags que devem ser removidas quando há uma compra aprovada do mesmo produto
  v_abandonment_tag := 'abandonou:' || v_product_identifier;
  v_pending_tag := 'pendente:' || v_product_identifier;
  v_cancelled_tag := 'cancelou:' || v_product_identifier;

  -- HIERARQUIA: Se é uma compra aprovada, remover tags de abandono/pendente/cancelado do MESMO produto
  IF NEW.status IN ('APPROVED', 'COMPLETE') THEN
    -- Verificar se tinha abandono antes de remover (para adicionar tag de recuperação)
    IF v_abandonment_tag = ANY(v_existing_tags) AND NOT ('recuperou:' || v_product_identifier = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'recuperou:' || v_product_identifier);
    END IF;
    
    -- Verificar se tinha cancelamento antes de remover (para adicionar tag de recuperação)
    IF v_cancelled_tag = ANY(v_existing_tags) AND NOT ('recuperou:' || v_product_identifier = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'recuperou:' || v_product_identifier);
    END IF;
    
    -- Remover tags contextuais de estados anteriores
    v_new_tags := array_remove(v_new_tags, v_abandonment_tag);
    v_new_tags := array_remove(v_new_tags, v_pending_tag);
    v_new_tags := array_remove(v_new_tags, v_cancelled_tag);
    
    -- Adicionar tag Cliente se não existe
    IF NOT ('Cliente' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Cliente');
    END IF;
  END IF;

  -- Adicionar nova tag contextual se não existir
  IF v_contextual_tag IS NOT NULL AND NOT (v_contextual_tag = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, v_contextual_tag);
  END IF;
  
  -- Adicionar nova tag genérica se não existir (para filtros no Kanban)
  IF v_generic_tag IS NOT NULL AND NOT (v_generic_tag = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, v_generic_tag);
  END IF;

  -- Adicionar produto à lista de produtos comprados (se aprovado)
  IF NEW.status IN ('APPROVED', 'COMPLETE') AND NEW.product_name IS NOT NULL THEN
    IF NOT (NEW.product_name = ANY(v_products_purchased)) THEN
      v_products_purchased := array_append(v_products_purchased, NEW.product_name);
    END IF;
  END IF;

  -- Atualizar contato com todos os campos (incluindo telefone se estava faltando)
  UPDATE crm_contacts
  SET 
    status = CASE 
      WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer'
      ELSE status
    END,
    -- Atualizar telefone apenas se o contato não tinha telefone e a nova venda tem
    phone = CASE 
      WHEN (phone IS NULL OR phone = '') AND NEW.buyer_phone IS NOT NULL AND NEW.buyer_phone != '' 
      THEN NEW.buyer_phone
      ELSE phone
    END,
    phone_ddd = CASE 
      WHEN (phone IS NULL OR phone = '') AND NEW.buyer_phone IS NOT NULL AND NEW.buyer_phone != '' 
      THEN NEW.buyer_phone_ddd
      ELSE phone_ddd
    END,
    phone_country_code = CASE 
      WHEN (phone IS NULL OR phone = '') AND NEW.buyer_phone IS NOT NULL AND NEW.buyer_phone != '' 
      THEN COALESCE(NEW.buyer_phone_country_code, '55')
      ELSE phone_country_code
    END,
    -- Atualizar nome se estava vazio
    name = CASE 
      WHEN name IS NULL OR name = '' THEN NEW.buyer_name
      ELSE name
    END,
    tags = v_new_tags,
    last_product_name = NEW.product_name,
    last_product_code = NEW.product_code,
    last_offer_code = NEW.offer_code,
    last_transaction_status = NEW.status,
    products_purchased = v_products_purchased,
    has_pending_payment = NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE'),
    subscription_status = CASE 
      WHEN NEW.sold_as = 'subscription' THEN
        CASE 
          WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'active'
          WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'cancelled'
          WHEN NEW.status = 'OVERDUE' THEN 'overdue'
          WHEN NEW.status IN ('REFUNDED', 'CHARGEBACK') THEN 'cancelled'
          ELSE subscription_status
        END
      ELSE subscription_status
    END,
    updated_at = now()
  WHERE id = v_contact_id;

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
    affiliate_name,
    funnel_id
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
    NEW.affiliate_name,
    NULL
  )
  ON CONFLICT (project_id, external_id, platform)
  DO UPDATE SET
    status = EXCLUDED.status,
    total_price = EXCLUDED.total_price,
    total_price_brl = EXCLUDED.total_price_brl,
    net_revenue = EXCLUDED.net_revenue,
    payment_method = EXCLUDED.payment_method,
    confirmation_date = EXCLUDED.confirmation_date,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Criar função para migrar tags genéricas para contatos existentes
CREATE OR REPLACE FUNCTION public.migrate_generic_tags()
 RETURNS TABLE(contacts_updated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer := 0;
  v_contact RECORD;
  v_new_tags text[];
  v_has_abandoned boolean;
  v_has_cancelled boolean;
  v_has_refunded boolean;
  v_has_chargeback boolean;
  v_has_approved boolean;
BEGIN
  -- Para cada contato que tem transações
  FOR v_contact IN
    SELECT DISTINCT c.id, c.tags
    FROM crm_contacts c
    WHERE EXISTS (SELECT 1 FROM crm_transactions t WHERE t.contact_id = c.id)
  LOOP
    v_new_tags := COALESCE(v_contact.tags, ARRAY[]::text[]);
    
    -- Verificar status das transações
    SELECT 
      bool_or(status = 'ABANDONED'),
      bool_or(status IN ('CANCELLED', 'CANCELED')),
      bool_or(status = 'REFUNDED'),
      bool_or(status = 'CHARGEBACK'),
      bool_or(status IN ('APPROVED', 'COMPLETE'))
    INTO v_has_abandoned, v_has_cancelled, v_has_refunded, v_has_chargeback, v_has_approved
    FROM crm_transactions
    WHERE contact_id = v_contact.id;
    
    -- Adicionar tag genérica Carrinho Abandonado se tem abandono
    IF v_has_abandoned AND NOT ('Carrinho Abandonado' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Carrinho Abandonado');
    END IF;
    
    -- Adicionar tag genérica Cancelado se tem cancelamento
    IF v_has_cancelled AND NOT ('Cancelado' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Cancelado');
    END IF;
    
    -- Adicionar tag genérica Reembolsado se tem reembolso
    IF v_has_refunded AND NOT ('Reembolsado' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Reembolsado');
    END IF;
    
    -- Adicionar tag genérica Chargeback se tem chargeback
    IF v_has_chargeback AND NOT ('Chargeback' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Chargeback');
    END IF;
    
    -- Adicionar tag Cliente se tem compra aprovada
    IF v_has_approved AND NOT ('Cliente' = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'Cliente');
    END IF;
    
    -- Atualizar contato se houve mudança
    IF v_new_tags IS DISTINCT FROM v_contact.tags THEN
      UPDATE crm_contacts
      SET tags = v_new_tags, updated_at = now()
      WHERE id = v_contact.id;
      
      v_updated := v_updated + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_updated;
END;
$function$;