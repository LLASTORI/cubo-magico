-- Update the sync trigger to handle cancellations, chargebacks, and refunds
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
BEGIN
    -- Skip if no project_id or email
    IF NEW.project_id IS NULL OR NEW.buyer_email IS NULL THEN
        RETURN NEW;
    END IF;
    
    v_transaction_date := COALESCE(NEW.sale_date, NEW.created_at);
    
    -- Determine which tag to add based on status
    v_new_tag := CASE 
        WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'Cliente'
        WHEN NEW.status IN ('REFUNDED') THEN 'Reembolsado'
        WHEN NEW.status IN ('CHARGEBACK', 'CHARGEDBACK') THEN 'Chargeback'
        WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'Cancelado'
        WHEN NEW.status IN ('DISPUTE') THEN 'Em Disputa'
        WHEN NEW.status IN ('EXPIRED') THEN 'Expirado'
        ELSE NULL
    END;
    
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
        -- Set initial tags based on status
        CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN ARRAY['Cliente']::text[]
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
        -- Update tags: 
        -- - If becoming customer: add "Cliente", remove "Lead"
        -- - If cancellation/chargeback/refund: KEEP "Cliente" (if was customer), add event tag
        tags = CASE 
            WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 
                -- Add Cliente, remove Lead
                array_cat(
                    array_remove(COALESCE(crm_contacts.tags, ARRAY[]::text[]), 'Lead'),
                    CASE WHEN 'Cliente' = ANY(COALESCE(crm_contacts.tags, ARRAY[]::text[])) THEN ARRAY[]::text[] ELSE ARRAY['Cliente']::text[] END
                )
            WHEN v_new_tag IS NOT NULL THEN
                -- Add the event tag (Reembolsado, Chargeback, etc) - keep Cliente if exists
                CASE WHEN v_new_tag = ANY(COALESCE(crm_contacts.tags, ARRAY[]::text[])) 
                    THEN crm_contacts.tags
                    ELSE array_append(COALESCE(crm_contacts.tags, ARRAY[]::text[]), v_new_tag)
                END
            ELSE crm_contacts.tags
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
    
    -- Also create an activity for important status changes
    IF NEW.status IN ('REFUNDED', 'CHARGEBACK', 'CHARGEDBACK', 'CANCELLED', 'CANCELED', 'DISPUTE') THEN
        INSERT INTO public.crm_activities (
            contact_id,
            project_id,
            activity_type,
            description,
            metadata
        ) VALUES (
            v_contact_id,
            NEW.project_id,
            CASE 
                WHEN NEW.status IN ('REFUNDED') THEN 'refund'
                WHEN NEW.status IN ('CHARGEBACK', 'CHARGEDBACK') THEN 'chargeback'
                WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'cancellation'
                WHEN NEW.status IN ('DISPUTE') THEN 'dispute'
                ELSE 'status_change'
            END,
            CASE 
                WHEN NEW.status IN ('REFUNDED') THEN 'Compra reembolsada: ' || NEW.product_name
                WHEN NEW.status IN ('CHARGEBACK', 'CHARGEDBACK') THEN 'Chargeback registrado: ' || NEW.product_name
                WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'Compra cancelada: ' || NEW.product_name
                WHEN NEW.status IN ('DISPUTE') THEN 'Disputa aberta: ' || NEW.product_name
                ELSE 'Status alterado para ' || NEW.status || ': ' || NEW.product_name
            END,
            jsonb_build_object(
                'transaction_id', NEW.transaction_id,
                'product_name', NEW.product_name,
                'status', NEW.status,
                'total_price', COALESCE(NEW.total_price_brl, NEW.total_price)
            )
        );
    END IF;
    
    RETURN NEW;
END;
$function$;