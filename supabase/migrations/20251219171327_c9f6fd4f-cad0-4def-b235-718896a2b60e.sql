
-- Update the sync_hotmart_sale_to_crm function with contextual tags and hierarchy logic
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
  v_abandonment_tag text;
  v_pending_tag text;
BEGIN
  -- Só processar se tiver email e project_id
  IF NEW.buyer_email IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar ou criar contato
  SELECT id, tags, products_purchased INTO v_contact_id, v_existing_tags, v_products_purchased
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

  -- Definir tags contextuais baseadas no status
  v_contextual_tag := CASE 
    WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'comprou:' || v_product_identifier
    WHEN NEW.status = 'ABANDONED' THEN 'abandonou:' || v_product_identifier
    WHEN NEW.status IN ('REFUNDED') THEN 'reembolsou:' || v_product_identifier
    WHEN NEW.status = 'CHARGEBACK' THEN 'chargeback:' || v_product_identifier
    WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'cancelou:' || v_product_identifier
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'pendente:' || v_product_identifier
    ELSE NULL
  END;

  -- Tags que devem ser removidas quando há uma compra aprovada do mesmo produto
  v_abandonment_tag := 'abandonou:' || v_product_identifier;
  v_pending_tag := 'pendente:' || v_product_identifier;

  -- HIERARQUIA: Se é uma compra aprovada, remover tags de abandono/pendente do MESMO produto
  IF NEW.status IN ('APPROVED', 'COMPLETE') THEN
    v_new_tags := array_remove(v_new_tags, v_abandonment_tag);
    v_new_tags := array_remove(v_new_tags, v_pending_tag);
    
    -- Adicionar tag de recuperação se tinha abandono
    IF v_abandonment_tag = ANY(v_existing_tags) AND NOT ('recuperou:' || v_product_identifier = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'recuperou:' || v_product_identifier);
    END IF;
  END IF;

  -- Adicionar nova tag contextual se não existir
  IF v_contextual_tag IS NOT NULL AND NOT (v_contextual_tag = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, v_contextual_tag);
  END IF;

  -- Adicionar produto à lista de produtos comprados (se aprovado)
  IF NEW.status IN ('APPROVED', 'COMPLETE') AND NEW.product_name IS NOT NULL THEN
    IF NOT (NEW.product_name = ANY(v_products_purchased)) THEN
      v_products_purchased := array_append(v_products_purchased, NEW.product_name);
    END IF;
  END IF;

  -- Atualizar contato com todos os campos
  UPDATE crm_contacts
  SET 
    status = CASE 
      WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer'
      ELSE status
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
  ON CONFLICT (project_id, platform, external_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    confirmation_date = COALESCE(EXCLUDED.confirmation_date, crm_transactions.confirmation_date),
    total_price_brl = COALESCE(EXCLUDED.total_price_brl, crm_transactions.total_price_brl),
    net_revenue = COALESCE(EXCLUDED.net_revenue, crm_transactions.net_revenue),
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Create a function to migrate existing tags to the new contextual format
CREATE OR REPLACE FUNCTION public.migrate_tags_to_contextual()
 RETURNS TABLE(contacts_updated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer := 0;
  v_contact RECORD;
  v_new_tags text[];
  v_transaction RECORD;
  v_product_identifier text;
  v_contextual_tag text;
  v_has_approved boolean;
BEGIN
  -- Para cada contato que tem transações
  FOR v_contact IN
    SELECT DISTINCT c.id, c.project_id, c.tags
    FROM crm_contacts c
    WHERE EXISTS (SELECT 1 FROM crm_transactions t WHERE t.contact_id = c.id)
  LOOP
    v_new_tags := ARRAY[]::text[];
    
    -- Manter tags que não são de status antigo
    IF v_contact.tags IS NOT NULL THEN
      FOR i IN 1..array_length(v_contact.tags, 1) LOOP
        IF v_contact.tags[i] NOT IN (
          'Carrinho Abandonado', 'Compra Aprovada', 'Reembolsado', 'Chargeback',
          'Cancelado', 'Boleto Pendente', 'PIX Pendente', 'Cartão Pendente',
          'Pagamento Pendente', 'Pagamento Atrasado', 'Pagamento Expirado',
          'Recuperado (auto)', 'Cliente'
        ) AND v_contact.tags[i] NOT LIKE 'produto:%' 
          AND v_contact.tags[i] NOT LIKE 'oferta:%' THEN
          v_new_tags := array_append(v_new_tags, v_contact.tags[i]);
        END IF;
      END LOOP;
    END IF;
    
    -- Processar cada transação do contato para criar tags contextuais
    FOR v_transaction IN
      SELECT * FROM crm_transactions
      WHERE contact_id = v_contact.id
      ORDER BY transaction_date ASC NULLS LAST
    LOOP
      v_product_identifier := COALESCE(v_transaction.product_name, 'Produto') || 
                              COALESCE('|' || v_transaction.offer_code, '');
      
      -- Verificar se tem compra aprovada deste produto
      SELECT EXISTS(
        SELECT 1 FROM crm_transactions
        WHERE contact_id = v_contact.id
          AND status IN ('APPROVED', 'COMPLETE')
          AND product_name = v_transaction.product_name
          AND (offer_code = v_transaction.offer_code OR (offer_code IS NULL AND v_transaction.offer_code IS NULL))
      ) INTO v_has_approved;
      
      -- Determinar tag contextual
      v_contextual_tag := CASE 
        WHEN v_transaction.status IN ('APPROVED', 'COMPLETE') THEN 'comprou:' || v_product_identifier
        WHEN v_transaction.status = 'ABANDONED' AND NOT v_has_approved THEN 'abandonou:' || v_product_identifier
        WHEN v_transaction.status IN ('REFUNDED') THEN 'reembolsou:' || v_product_identifier
        WHEN v_transaction.status = 'CHARGEBACK' THEN 'chargeback:' || v_product_identifier
        WHEN v_transaction.status IN ('CANCELLED', 'CANCELED') THEN 'cancelou:' || v_product_identifier
        WHEN v_transaction.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') AND NOT v_has_approved THEN 'pendente:' || v_product_identifier
        ELSE NULL
      END;
      
      -- Adicionar tag se não existir
      IF v_contextual_tag IS NOT NULL AND NOT (v_contextual_tag = ANY(v_new_tags)) THEN
        v_new_tags := array_append(v_new_tags, v_contextual_tag);
      END IF;
      
      -- Adicionar tag de recuperação se tinha abandono e depois comprou
      IF v_transaction.status IN ('APPROVED', 'COMPLETE') THEN
        IF EXISTS(
          SELECT 1 FROM crm_transactions
          WHERE contact_id = v_contact.id
            AND status = 'ABANDONED'
            AND product_name = v_transaction.product_name
            AND transaction_date < v_transaction.transaction_date
        ) THEN
          IF NOT ('recuperou:' || v_product_identifier = ANY(v_new_tags)) THEN
            v_new_tags := array_append(v_new_tags, 'recuperou:' || v_product_identifier);
          END IF;
        END IF;
      END IF;
    END LOOP;
    
    -- Atualizar contato
    UPDATE crm_contacts
    SET tags = v_new_tags, updated_at = now()
    WHERE id = v_contact.id;
    
    v_updated := v_updated + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_updated;
END;
$function$;
