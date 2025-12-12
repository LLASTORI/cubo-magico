-- Add missing columns to crm_contacts
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS first_utm_creative text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS first_utm_placement text;

-- Recreate migration function with correct column mapping
CREATE OR REPLACE FUNCTION public.migrate_hotmart_to_crm()
RETURNS TABLE(contacts_created integer, transactions_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contacts_created integer := 0;
    v_transactions_created integer := 0;
BEGIN
    -- First, insert all unique contacts
    INSERT INTO public.crm_contacts (
        project_id,
        email,
        name,
        phone,
        phone_ddd,
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
        first_utm_ad,
        first_seen_at,
        last_activity_at,
        first_purchase_at,
        last_purchase_at,
        total_purchases,
        total_revenue
    )
    SELECT DISTINCT ON (hs.project_id, LOWER(TRIM(hs.buyer_email)))
        hs.project_id,
        LOWER(TRIM(hs.buyer_email)),
        hs.buyer_name,
        hs.buyer_phone,
        hs.buyer_phone_ddd,
        hs.buyer_document,
        hs.buyer_instagram,
        hs.buyer_address,
        hs.buyer_address_number,
        hs.buyer_address_complement,
        hs.buyer_neighborhood,
        hs.buyer_city,
        hs.buyer_state,
        hs.buyer_country,
        hs.buyer_cep,
        'hotmart',
        CASE WHEN bool_or(hs.status IN ('APPROVED', 'COMPLETE')) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))) THEN 'customer' ELSE 'prospect' END,
        hs.utm_source,
        hs.utm_campaign_id,
        hs.utm_adset_name,
        hs.utm_creative,
        hs.meta_ad_id_extracted,
        MIN(COALESCE(hs.sale_date, hs.created_at)) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))),
        MAX(COALESCE(hs.sale_date, hs.created_at)) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))),
        MIN(CASE WHEN hs.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(hs.sale_date, hs.created_at) END) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))),
        MAX(CASE WHEN hs.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(hs.sale_date, hs.created_at) END) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))),
        COUNT(CASE WHEN hs.status IN ('APPROVED', 'COMPLETE') THEN 1 END) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))),
        COALESCE(SUM(CASE WHEN hs.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(hs.total_price_brl, hs.total_price, 0) END) OVER (PARTITION BY hs.project_id, LOWER(TRIM(hs.buyer_email))), 0)
    FROM public.hotmart_sales hs
    WHERE hs.project_id IS NOT NULL 
      AND hs.buyer_email IS NOT NULL
    ORDER BY hs.project_id, LOWER(TRIM(hs.buyer_email)), COALESCE(hs.sale_date, hs.created_at) ASC
    ON CONFLICT (project_id, email) DO NOTHING;
    
    GET DIAGNOSTICS v_contacts_created = ROW_COUNT;
    
    -- Then, insert all transactions
    INSERT INTO public.crm_transactions (
        contact_id,
        project_id,
        platform,
        external_id,
        product_code,
        product_name,
        offer_code,
        product_price,
        offer_price,
        total_price,
        total_price_brl,
        net_revenue,
        payment_method,
        payment_type,
        installment_number,
        coupon,
        status,
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
        transaction_date,
        confirmation_date,
        metadata
    )
    SELECT 
        c.id,
        hs.project_id,
        'hotmart',
        hs.transaction_id,
        hs.product_code,
        hs.product_name,
        hs.offer_code,
        hs.product_price,
        hs.offer_price,
        hs.total_price,
        hs.total_price_brl,
        hs.net_revenue,
        hs.payment_method,
        hs.payment_type,
        hs.installment_number,
        hs.coupon,
        hs.status,
        hs.utm_source,
        hs.utm_campaign_id,
        hs.utm_adset_name,
        hs.utm_creative,
        hs.utm_placement,
        hs.meta_campaign_id_extracted,
        hs.meta_adset_id_extracted,
        hs.meta_ad_id_extracted,
        hs.affiliate_code,
        hs.affiliate_name,
        COALESCE(hs.sale_date, hs.created_at),
        hs.confirmation_date,
        jsonb_build_object(
            'hotmart_id', hs.id,
            'subscriber_code', hs.subscriber_code,
            'recurrence', hs.recurrence,
            'sold_as', hs.sold_as,
            'sale_category', hs.sale_category
        )
    FROM public.hotmart_sales hs
    JOIN public.crm_contacts c ON c.project_id = hs.project_id AND c.email = LOWER(TRIM(hs.buyer_email))
    WHERE hs.project_id IS NOT NULL 
      AND hs.buyer_email IS NOT NULL
    ON CONFLICT (project_id, platform, external_id) DO NOTHING;
    
    GET DIAGNOSTICS v_transactions_created = ROW_COUNT;
    
    RETURN QUERY SELECT v_contacts_created, v_transactions_created;
END;
$$;

-- Also update the trigger function to use correct columns
CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contact_id uuid;
    v_transaction_date timestamp with time zone;
BEGIN
    -- Skip if no project_id or email
    IF NEW.project_id IS NULL OR NEW.buyer_email IS NULL THEN
        RETURN NEW;
    END IF;
    
    v_transaction_date := COALESCE(NEW.sale_date, NEW.created_at);
    
    -- Upsert contact
    INSERT INTO public.crm_contacts (
        project_id,
        email,
        name,
        phone,
        phone_ddd,
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
        first_utm_ad,
        first_seen_at,
        last_activity_at,
        first_purchase_at,
        last_purchase_at,
        total_purchases,
        total_revenue
    )
    VALUES (
        NEW.project_id,
        LOWER(TRIM(NEW.buyer_email)),
        NEW.buyer_name,
        NEW.buyer_phone,
        NEW.buyer_phone_ddd,
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
        CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer' ELSE 'prospect' END,
        NEW.utm_source,
        NEW.utm_campaign_id,
        NEW.utm_adset_name,
        NEW.utm_creative,
        NEW.meta_ad_id_extracted,
        v_transaction_date,
        v_transaction_date,
        CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN v_transaction_date ELSE NULL END,
        CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN v_transaction_date ELSE NULL END,
        CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 1 ELSE 0 END,
        CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(NEW.total_price_brl, NEW.total_price, 0) ELSE 0 END
    )
    ON CONFLICT (project_id, email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, crm_contacts.name),
        phone = COALESCE(EXCLUDED.phone, crm_contacts.phone),
        phone_ddd = COALESCE(EXCLUDED.phone_ddd, crm_contacts.phone_ddd),
        document = COALESCE(EXCLUDED.document, crm_contacts.document),
        instagram = COALESCE(EXCLUDED.instagram, crm_contacts.instagram),
        address = COALESCE(EXCLUDED.address, crm_contacts.address),
        address_number = COALESCE(EXCLUDED.address_number, crm_contacts.address_number),
        address_complement = COALESCE(EXCLUDED.address_complement, crm_contacts.address_complement),
        neighborhood = COALESCE(EXCLUDED.neighborhood, crm_contacts.neighborhood),
        city = COALESCE(EXCLUDED.city, crm_contacts.city),
        state = COALESCE(EXCLUDED.state, crm_contacts.state),
        country = COALESCE(EXCLUDED.country, crm_contacts.country),
        cep = COALESCE(EXCLUDED.cep, crm_contacts.cep),
        status = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer'
            ELSE crm_contacts.status
        END,
        last_activity_at = GREATEST(crm_contacts.last_activity_at, v_transaction_date),
        first_purchase_at = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') AND crm_contacts.first_purchase_at IS NULL 
            THEN v_transaction_date 
            ELSE LEAST(crm_contacts.first_purchase_at, v_transaction_date)
        END,
        last_purchase_at = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') 
            THEN GREATEST(crm_contacts.last_purchase_at, v_transaction_date)
            ELSE crm_contacts.last_purchase_at
        END,
        total_purchases = crm_contacts.total_purchases + CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 1 ELSE 0 END,
        total_revenue = crm_contacts.total_revenue + CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(NEW.total_price_brl, NEW.total_price, 0) ELSE 0 END,
        updated_at = now()
    RETURNING id INTO v_contact_id;
    
    -- Insert transaction
    INSERT INTO public.crm_transactions (
        contact_id,
        project_id,
        platform,
        external_id,
        product_code,
        product_name,
        offer_code,
        product_price,
        offer_price,
        total_price,
        total_price_brl,
        net_revenue,
        payment_method,
        payment_type,
        installment_number,
        coupon,
        status,
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
        transaction_date,
        confirmation_date,
        metadata
    )
    VALUES (
        v_contact_id,
        NEW.project_id,
        'hotmart',
        NEW.transaction_id,
        NEW.product_code,
        NEW.product_name,
        NEW.offer_code,
        NEW.product_price,
        NEW.offer_price,
        NEW.total_price,
        NEW.total_price_brl,
        NEW.net_revenue,
        NEW.payment_method,
        NEW.payment_type,
        NEW.installment_number,
        NEW.coupon,
        NEW.status,
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
        v_transaction_date,
        NEW.confirmation_date,
        jsonb_build_object(
            'hotmart_id', NEW.id,
            'subscriber_code', NEW.subscriber_code,
            'recurrence', NEW.recurrence,
            'sold_as', NEW.sold_as,
            'sale_category', NEW.sale_category
        )
    )
    ON CONFLICT (project_id, platform, external_id) DO UPDATE SET
        status = EXCLUDED.status,
        confirmation_date = COALESCE(EXCLUDED.confirmation_date, crm_transactions.confirmation_date),
        updated_at = now();
    
    RETURN NEW;
END;
$$;