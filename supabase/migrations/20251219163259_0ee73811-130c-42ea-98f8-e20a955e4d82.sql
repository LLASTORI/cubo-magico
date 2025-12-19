-- Adicionar novos campos no crm_contacts para suportar automações
ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS last_product_name text,
ADD COLUMN IF NOT EXISTS last_product_code text,
ADD COLUMN IF NOT EXISTS last_offer_code text,
ADD COLUMN IF NOT EXISTS last_offer_name text,
ADD COLUMN IF NOT EXISTS products_purchased text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_pending_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_transaction_status text;

-- Criar índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_subscription_status ON public.crm_contacts(subscription_status) WHERE subscription_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_has_pending_payment ON public.crm_contacts(has_pending_payment) WHERE has_pending_payment = true;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_product_code ON public.crm_contacts(last_product_code) WHERE last_product_code IS NOT NULL;

-- Atualizar função de sincronização para adicionar tags automáticas e preencher novos campos
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
  v_had_abandoned boolean := false;
  v_products_purchased text[];
  v_status_tag text;
  v_product_tag text;
  v_offer_tag text;
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

  -- Criar tags de produto e oferta
  v_product_tag := 'produto:' || COALESCE(NEW.product_name, 'Desconhecido');
  v_offer_tag := CASE WHEN NEW.offer_code IS NOT NULL THEN 'oferta:' || NEW.offer_code ELSE NULL END;

  -- Verificar se tinha carrinho abandonado do MESMO PRODUTO antes (para compras aprovadas)
  IF NEW.status IN ('APPROVED', 'COMPLETE') AND NEW.product_code IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM hotmart_sales
      WHERE project_id = NEW.project_id
        AND LOWER(buyer_email) = LOWER(NEW.buyer_email)
        AND status = 'ABANDONED'
        AND product_code = NEW.product_code
        AND sale_date < COALESCE(NEW.confirmation_date, NEW.sale_date)
        AND id != NEW.id
    ) INTO v_had_abandoned;
  END IF;

  -- Determinar tag de status baseado no status e método de pagamento
  v_status_tag := CASE 
    WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'Compra Aprovada'
    WHEN NEW.status = 'ABANDONED' THEN 'Carrinho Abandonado'
    WHEN NEW.status IN ('REFUNDED') THEN 'Reembolsado'
    WHEN NEW.status = 'CHARGEBACK' THEN 'Chargeback'
    WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'Cancelado'
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING') THEN
      CASE 
        WHEN UPPER(NEW.payment_method) = 'BILLET' OR UPPER(NEW.payment_type) = 'BILLET' THEN 'Boleto Pendente'
        WHEN UPPER(NEW.payment_method) = 'PIX' OR UPPER(NEW.payment_type) = 'PIX' THEN 'PIX Pendente'
        WHEN UPPER(NEW.payment_method) IN ('CREDIT_CARD', 'DEBIT_CARD') THEN 'Cartão Pendente'
        ELSE 'Pagamento Pendente'
      END
    WHEN NEW.status = 'OVERDUE' THEN 'Pagamento Atrasado'
    WHEN NEW.status = 'EXPIRED' THEN 'Pagamento Expirado'
    ELSE NULL
  END;

  -- Limpar tags de status anteriores (para não acumular)
  v_new_tags := array_remove(v_new_tags, 'Carrinho Abandonado');
  v_new_tags := array_remove(v_new_tags, 'Compra Aprovada');
  v_new_tags := array_remove(v_new_tags, 'Reembolsado');
  v_new_tags := array_remove(v_new_tags, 'Chargeback');
  v_new_tags := array_remove(v_new_tags, 'Cancelado');
  v_new_tags := array_remove(v_new_tags, 'Boleto Pendente');
  v_new_tags := array_remove(v_new_tags, 'PIX Pendente');
  v_new_tags := array_remove(v_new_tags, 'Cartão Pendente');
  v_new_tags := array_remove(v_new_tags, 'Pagamento Pendente');
  v_new_tags := array_remove(v_new_tags, 'Pagamento Atrasado');
  v_new_tags := array_remove(v_new_tags, 'Pagamento Expirado');

  -- Adicionar nova tag de status
  IF v_status_tag IS NOT NULL AND NOT (v_status_tag = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, v_status_tag);
  END IF;

  -- Adicionar tag de produto se não existir
  IF v_product_tag IS NOT NULL AND NOT (v_product_tag = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, v_product_tag);
  END IF;

  -- Adicionar tag de oferta se não existir
  IF v_offer_tag IS NOT NULL AND NOT (v_offer_tag = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, v_offer_tag);
  END IF;

  -- Se teve carrinho abandonado e agora comprou, adicionar tag de recuperação
  IF v_had_abandoned AND NOT ('Recuperado (auto)' = ANY(v_new_tags)) THEN
    v_new_tags := array_append(v_new_tags, 'Recuperado (auto)');
  END IF;

  -- Adicionar produto à lista de produtos comprados (se aprovado)
  IF NEW.status IN ('APPROVED', 'COMPLETE') AND NEW.product_name IS NOT NULL THEN
    IF NOT (NEW.product_name = ANY(v_products_purchased)) THEN
      v_products_purchased := array_append(v_products_purchased, NEW.product_name);
    END IF;
  END IF;

  -- Atualizar contato com todos os campos novos
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

-- Função para migrar dados existentes (adicionar tags e campos aos contatos existentes)
CREATE OR REPLACE FUNCTION public.migrate_contact_product_data()
RETURNS TABLE(contacts_updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer := 0;
  v_contact RECORD;
  v_tags text[];
  v_products text[];
  v_last_transaction RECORD;
BEGIN
  -- Para cada contato que tem transações
  FOR v_contact IN
    SELECT DISTINCT c.id, c.project_id, c.tags
    FROM crm_contacts c
    JOIN crm_transactions t ON t.contact_id = c.id
  LOOP
    v_tags := COALESCE(v_contact.tags, ARRAY[]::text[]);
    v_products := ARRAY[]::text[];
    
    -- Pegar última transação
    SELECT * INTO v_last_transaction
    FROM crm_transactions
    WHERE contact_id = v_contact.id
    ORDER BY transaction_date DESC NULLS LAST
    LIMIT 1;
    
    -- Coletar produtos únicos comprados
    SELECT array_agg(DISTINCT product_name) INTO v_products
    FROM crm_transactions
    WHERE contact_id = v_contact.id
      AND status IN ('APPROVED', 'COMPLETE')
      AND product_name IS NOT NULL;
    
    -- Adicionar tag de produto se não existir
    IF v_last_transaction.product_name IS NOT NULL THEN
      IF NOT (('produto:' || v_last_transaction.product_name) = ANY(v_tags)) THEN
        v_tags := array_append(v_tags, 'produto:' || v_last_transaction.product_name);
      END IF;
    END IF;
    
    -- Adicionar tag de oferta se não existir
    IF v_last_transaction.offer_code IS NOT NULL THEN
      IF NOT (('oferta:' || v_last_transaction.offer_code) = ANY(v_tags)) THEN
        v_tags := array_append(v_tags, 'oferta:' || v_last_transaction.offer_code);
      END IF;
    END IF;
    
    -- Atualizar contato
    UPDATE crm_contacts
    SET 
      tags = v_tags,
      last_product_name = v_last_transaction.product_name,
      last_product_code = v_last_transaction.product_code,
      last_offer_code = v_last_transaction.offer_code,
      last_transaction_status = v_last_transaction.status,
      products_purchased = COALESCE(v_products, ARRAY[]::text[]),
      has_pending_payment = v_last_transaction.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE'),
      updated_at = now()
    WHERE id = v_contact.id;
    
    v_updated := v_updated + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_updated;
END;
$function$;