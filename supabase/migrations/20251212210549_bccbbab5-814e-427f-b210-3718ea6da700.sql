-- Drop and recreate migration functions with correct approach
DROP FUNCTION IF EXISTS public.migrate_hotmart_to_crm();
DROP FUNCTION IF EXISTS public.sync_hotmart_sale_to_crm_manual(public.hotmart_sales);

-- Direct migration without helper function
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