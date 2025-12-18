-- Update the sync trigger to handle abandoned carts
CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_contact_id uuid;
    v_transaction_date timestamp with time zone;
    v_new_tag text;
    v_current_tags text[];
    v_phone_country_code text;
BEGIN
    -- Skip if no project_id or email
    IF NEW.project_id IS NULL OR NEW.buyer_email IS NULL THEN
        RETURN NEW;
    END IF;
    
    v_transaction_date := COALESCE(NEW.sale_date, NEW.created_at);
    
    -- Determine phone country code from buyer_country or default to Brazil
    v_phone_country_code := CASE 
        WHEN NEW.buyer_country = 'Brasil' OR NEW.buyer_country = 'Brazil' OR NEW.buyer_country = 'BR' THEN '55'
        WHEN NEW.buyer_country = 'Portugal' OR NEW.buyer_country = 'PT' THEN '351'
        WHEN NEW.buyer_country = 'United States' OR NEW.buyer_country = 'USA' OR NEW.buyer_country = 'US' THEN '1'
        WHEN NEW.buyer_country = 'Spain' OR NEW.buyer_country = 'España' OR NEW.buyer_country = 'ES' THEN '34'
        WHEN NEW.buyer_country = 'Argentina' OR NEW.buyer_country = 'AR' THEN '54'
        WHEN NEW.buyer_country = 'Mexico' OR NEW.buyer_country = 'México' OR NEW.buyer_country = 'MX' THEN '52'
        WHEN NEW.buyer_country = 'Chile' OR NEW.buyer_country = 'CL' THEN '56'
        WHEN NEW.buyer_country = 'Colombia' OR NEW.buyer_country = 'CO' THEN '57'
        WHEN NEW.buyer_country = 'Peru' OR NEW.buyer_country = 'Perú' OR NEW.buyer_country = 'PE' THEN '51'
        WHEN NEW.buyer_country = 'Uruguay' OR NEW.buyer_country = 'UY' THEN '598'
        WHEN NEW.buyer_country = 'Paraguay' OR NEW.buyer_country = 'PY' THEN '595'
        WHEN NEW.buyer_country = 'Bolivia' OR NEW.buyer_country = 'BO' THEN '591'
        WHEN NEW.buyer_country = 'Ecuador' OR NEW.buyer_country = 'EC' THEN '593'
        WHEN NEW.buyer_country = 'Venezuela' OR NEW.buyer_country = 'VE' THEN '58'
        ELSE COALESCE(NEW.buyer_phone_country_code, '55')
    END;
    
    -- Determine which tag to add based on status
    v_new_tag := CASE 
        WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'Cliente'
        WHEN NEW.status IN ('ABANDONED') THEN 'Carrinho Abandonado'
        WHEN NEW.status IN ('REFUNDED') THEN 'Reembolsado'
        WHEN NEW.status IN ('CHARGEBACK', 'CHARGEDBACK') THEN 'Chargeback'
        WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'Cancelado'
        WHEN NEW.status IN ('DISPUTE') THEN 'Em Disputa'
        WHEN NEW.status IN ('EXPIRED') THEN 'Expirado'
        WHEN NEW.status IN ('PRINTED_BILLET') THEN 'Boleto Gerado'
        WHEN NEW.status IN ('DELAYED') THEN 'Pagamento Atrasado'
        ELSE NULL
    END;
    
    -- Upsert contact
    INSERT INTO public.crm_contacts (
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
        tags,
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
        v_phone_country_code,
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
            WHEN NEW.status = 'ABANDONED' THEN 'lead'
            ELSE 'prospect' 
        END,
        -- Set initial tags based on status
        CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN ARRAY['Cliente']::text[]
            WHEN NEW.status = 'ABANDONED' THEN ARRAY['Lead', 'Carrinho Abandonado']::text[]
            WHEN v_new_tag IS NOT NULL THEN ARRAY['Lead', v_new_tag]::text[]
            ELSE ARRAY['Lead']::text[]
        END,
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
        phone_country_code = COALESCE(EXCLUDED.phone_country_code, crm_contacts.phone_country_code),
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
        -- Update status to customer if this is an approved purchase
        status = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer'
            ELSE crm_contacts.status 
        END,
        last_activity_at = GREATEST(crm_contacts.last_activity_at, v_transaction_date),
        first_purchase_at = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') AND crm_contacts.first_purchase_at IS NULL THEN v_transaction_date
            ELSE crm_contacts.first_purchase_at 
        END,
        last_purchase_at = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN GREATEST(crm_contacts.last_purchase_at, v_transaction_date)
            ELSE crm_contacts.last_purchase_at 
        END,
        total_purchases = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN crm_contacts.total_purchases + 1
            ELSE crm_contacts.total_purchases 
        END,
        total_revenue = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN crm_contacts.total_revenue + COALESCE(NEW.total_price_brl, NEW.total_price, 0)
            ELSE crm_contacts.total_revenue 
        END,
        updated_at = NOW()
    RETURNING id INTO v_contact_id;
    
    -- Get the contact id if it was an update
    IF v_contact_id IS NULL THEN
        SELECT id INTO v_contact_id 
        FROM public.crm_contacts 
        WHERE project_id = NEW.project_id AND email = LOWER(TRIM(NEW.buyer_email));
    END IF;
    
    -- Manage tags: Add new tag if not present, remove conflicting tags
    IF v_contact_id IS NOT NULL AND v_new_tag IS NOT NULL THEN
        -- Get current tags
        SELECT COALESCE(tags, ARRAY[]::text[]) INTO v_current_tags
        FROM public.crm_contacts
        WHERE id = v_contact_id;
        
        -- If becoming a customer, remove certain tags
        IF NEW.status IN ('APPROVED', 'COMPLETE') THEN
            -- Remove Lead, Carrinho Abandonado, Boleto Gerado when becoming customer
            v_current_tags := array_remove(v_current_tags, 'Lead');
            v_current_tags := array_remove(v_current_tags, 'Carrinho Abandonado');
            v_current_tags := array_remove(v_current_tags, 'Boleto Gerado');
        END IF;
        
        -- Add new tag if not already present
        IF NOT v_new_tag = ANY(v_current_tags) THEN
            v_current_tags := array_append(v_current_tags, v_new_tag);
        END IF;
        
        -- Update tags
        UPDATE public.crm_contacts
        SET tags = v_current_tags
        WHERE id = v_contact_id;
    END IF;
    
    -- Only create transaction for actual purchases (not abandoned carts)
    IF v_contact_id IS NOT NULL AND NEW.status NOT IN ('ABANDONED') THEN
        INSERT INTO public.crm_transactions (
            project_id,
            contact_id,
            external_id,
            platform,
            product_code,
            product_name,
            offer_code,
            offer_name,
            product_price,
            offer_price,
            total_price,
            total_price_brl,
            net_revenue,
            status,
            payment_method,
            payment_type,
            installment_number,
            coupon,
            transaction_date,
            confirmation_date,
            utm_source,
            utm_campaign,
            utm_adset,
            utm_creative,
            utm_ad,
            meta_campaign_id,
            meta_adset_id,
            meta_ad_id,
            affiliate_code,
            affiliate_name
        )
        VALUES (
            NEW.project_id,
            v_contact_id,
            NEW.transaction_id,
            'hotmart',
            NEW.product_code,
            NEW.product_name,
            NEW.offer_code,
            NULL,
            NEW.product_price,
            NEW.offer_price,
            NEW.total_price,
            NEW.total_price_brl,
            NEW.net_revenue,
            NEW.status,
            NEW.payment_method,
            NEW.payment_type,
            NEW.installment_number,
            NEW.coupon,
            v_transaction_date,
            NEW.confirmation_date,
            NEW.utm_source,
            NEW.utm_campaign_id,
            NEW.utm_adset_name,
            NEW.utm_creative,
            NEW.meta_ad_id_extracted,
            NEW.meta_campaign_id_extracted,
            NEW.meta_adset_id_extracted,
            NEW.meta_ad_id_extracted,
            NEW.affiliate_code,
            NEW.affiliate_name
        )
        ON CONFLICT (project_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
            status = EXCLUDED.status,
            confirmation_date = COALESCE(EXCLUDED.confirmation_date, crm_transactions.confirmation_date),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$;