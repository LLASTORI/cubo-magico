-- =====================================================
-- CRM CONTACTS TABLE
-- Tabela central de contatos, independente da fonte
-- =====================================================
CREATE TABLE public.crm_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email text NOT NULL,
    name text,
    phone text,
    phone_ddd text,
    document text,
    instagram text,
    
    -- Endereço
    address text,
    address_number text,
    address_complement text,
    neighborhood text,
    city text,
    state text,
    country text,
    cep text,
    
    -- Fonte e status
    source text NOT NULL DEFAULT 'manual', -- hotmart, kiwify, manual, webhook, import
    status text NOT NULL DEFAULT 'lead', -- lead, prospect, customer, churned, inactive
    
    -- UTMs do primeiro contato
    first_utm_source text,
    first_utm_campaign text,
    first_utm_medium text,
    first_utm_content text,
    first_utm_term text,
    first_utm_adset text,
    first_utm_ad text,
    
    -- Campos flexíveis
    tags text[] DEFAULT '{}',
    custom_fields jsonb DEFAULT '{}',
    
    -- Métricas calculadas
    total_purchases integer DEFAULT 0,
    total_revenue numeric DEFAULT 0,
    first_purchase_at timestamp with time zone,
    last_purchase_at timestamp with time zone,
    
    -- Timestamps
    first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Unique constraint por projeto + email
    UNIQUE(project_id, email)
);

-- =====================================================
-- CRM TRANSACTIONS TABLE
-- Todas as transações de todas as plataformas
-- =====================================================
CREATE TABLE public.crm_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Identificação da plataforma
    platform text NOT NULL DEFAULT 'hotmart', -- hotmart, kiwify, eduzz, manual, webhook
    external_id text, -- ID original da transação na plataforma
    
    -- Produto e oferta
    product_code text,
    product_name text NOT NULL,
    offer_code text,
    offer_name text,
    funnel_id text,
    
    -- Valores
    product_price numeric,
    offer_price numeric,
    total_price numeric,
    total_price_brl numeric,
    net_revenue numeric,
    
    -- Pagamento
    payment_method text,
    payment_type text,
    installment_number integer,
    coupon text,
    
    -- Status
    status text NOT NULL,
    
    -- UTMs desta transação específica
    utm_source text,
    utm_campaign text,
    utm_medium text,
    utm_content text,
    utm_term text,
    utm_adset text,
    utm_ad text,
    utm_placement text,
    utm_creative text,
    
    -- Meta IDs extraídos
    meta_campaign_id text,
    meta_adset_id text,
    meta_ad_id text,
    
    -- Afiliado
    affiliate_code text,
    affiliate_name text,
    
    -- Datas
    transaction_date timestamp with time zone,
    confirmation_date timestamp with time zone,
    
    -- Metadata adicional
    metadata jsonb DEFAULT '{}',
    
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Unique constraint para evitar duplicatas
    UNIQUE(project_id, platform, external_id)
);

-- =====================================================
-- CRM ACTIVITIES TABLE
-- Histórico de atividades do contato
-- =====================================================
CREATE TABLE public.crm_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Tipo de atividade
    activity_type text NOT NULL, -- purchase, refund, tag_added, tag_removed, note, status_change, import, webhook
    
    -- Descrição e dados
    description text,
    metadata jsonb DEFAULT '{}',
    
    -- Referência opcional a transação
    transaction_id uuid REFERENCES public.crm_transactions(id) ON DELETE SET NULL,
    
    -- Quem fez a atividade (null = sistema)
    performed_by uuid,
    
    -- Timestamp
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_crm_contacts_project_id ON public.crm_contacts(project_id);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);
CREATE INDEX idx_crm_contacts_status ON public.crm_contacts(status);
CREATE INDEX idx_crm_contacts_source ON public.crm_contacts(source);
CREATE INDEX idx_crm_contacts_first_seen ON public.crm_contacts(first_seen_at);
CREATE INDEX idx_crm_contacts_tags ON public.crm_contacts USING GIN(tags);

CREATE INDEX idx_crm_transactions_contact_id ON public.crm_transactions(contact_id);
CREATE INDEX idx_crm_transactions_project_id ON public.crm_transactions(project_id);
CREATE INDEX idx_crm_transactions_platform ON public.crm_transactions(platform);
CREATE INDEX idx_crm_transactions_status ON public.crm_transactions(status);
CREATE INDEX idx_crm_transactions_transaction_date ON public.crm_transactions(transaction_date);
CREATE INDEX idx_crm_transactions_product_name ON public.crm_transactions(product_name);
CREATE INDEX idx_crm_transactions_offer_code ON public.crm_transactions(offer_code);

CREATE INDEX idx_crm_activities_contact_id ON public.crm_activities(contact_id);
CREATE INDEX idx_crm_activities_project_id ON public.crm_activities(project_id);
CREATE INDEX idx_crm_activities_type ON public.crm_activities(activity_type);
CREATE INDEX idx_crm_activities_created_at ON public.crm_activities(created_at);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - crm_contacts
-- =====================================================
CREATE POLICY "Members can view crm contacts"
ON public.crm_contacts FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert crm contacts"
ON public.crm_contacts FOR INSERT
WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can update crm contacts"
ON public.crm_contacts FOR UPDATE
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can delete crm contacts"
ON public.crm_contacts FOR DELETE
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all crm contacts"
ON public.crm_contacts FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES - crm_transactions
-- =====================================================
CREATE POLICY "Members can view crm transactions"
ON public.crm_transactions FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert crm transactions"
ON public.crm_transactions FOR INSERT
WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can update crm transactions"
ON public.crm_transactions FOR UPDATE
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can delete crm transactions"
ON public.crm_transactions FOR DELETE
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all crm transactions"
ON public.crm_transactions FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES - crm_activities
-- =====================================================
CREATE POLICY "Members can view crm activities"
ON public.crm_activities FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert crm activities"
ON public.crm_activities FOR INSERT
WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can update crm activities"
ON public.crm_activities FOR UPDATE
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can delete crm activities"
ON public.crm_activities FOR DELETE
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all crm activities"
ON public.crm_activities FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- TRIGGER: Update updated_at
-- =====================================================
CREATE TRIGGER update_crm_contacts_updated_at
    BEFORE UPDATE ON public.crm_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_transactions_updated_at
    BEFORE UPDATE ON public.crm_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION: Sync Hotmart Sale to CRM
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contact_id uuid;
    v_is_first_purchase boolean := false;
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

-- =====================================================
-- TRIGGER: Auto-sync new Hotmart sales
-- =====================================================
CREATE TRIGGER sync_hotmart_to_crm
    AFTER INSERT OR UPDATE ON public.hotmart_sales
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_hotmart_sale_to_crm();

-- =====================================================
-- FUNCTION: Migrate existing Hotmart sales to CRM
-- =====================================================
CREATE OR REPLACE FUNCTION public.migrate_hotmart_to_crm()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sale_record RECORD;
BEGIN
    FOR sale_record IN 
        SELECT * FROM public.hotmart_sales 
        WHERE project_id IS NOT NULL AND buyer_email IS NOT NULL
        ORDER BY sale_date ASC NULLS LAST
    LOOP
        -- Manually trigger the sync function logic
        PERFORM public.sync_hotmart_sale_to_crm_manual(sale_record);
    END LOOP;
END;
$$;

-- Helper function for migration
CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm_manual(sale_record public.hotmart_sales)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contact_id uuid;
    v_transaction_date timestamp with time zone;
BEGIN
    v_transaction_date := COALESCE(sale_record.sale_date, sale_record.created_at);
    
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
        sale_record.project_id,
        LOWER(TRIM(sale_record.buyer_email)),
        sale_record.buyer_name,
        sale_record.buyer_phone,
        sale_record.buyer_phone_ddd,
        sale_record.buyer_document,
        sale_record.buyer_instagram,
        sale_record.buyer_address,
        sale_record.buyer_address_number,
        sale_record.buyer_address_complement,
        sale_record.buyer_neighborhood,
        sale_record.buyer_city,
        sale_record.buyer_state,
        sale_record.buyer_country,
        sale_record.buyer_cep,
        'hotmart',
        CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN 'customer' ELSE 'prospect' END,
        sale_record.utm_source,
        sale_record.utm_campaign_id,
        sale_record.utm_adset_name,
        sale_record.utm_creative,
        sale_record.meta_ad_id_extracted,
        v_transaction_date,
        v_transaction_date,
        CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN v_transaction_date ELSE NULL END,
        CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN v_transaction_date ELSE NULL END,
        CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN 1 ELSE 0 END,
        CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(sale_record.total_price_brl, sale_record.total_price, 0) ELSE 0 END
    )
    ON CONFLICT (project_id, email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, crm_contacts.name),
        phone = COALESCE(EXCLUDED.phone, crm_contacts.phone),
        status = CASE 
            WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN 'customer'
            ELSE crm_contacts.status
        END,
        last_activity_at = GREATEST(crm_contacts.last_activity_at, v_transaction_date),
        first_purchase_at = CASE 
            WHEN sale_record.status IN ('APPROVED', 'COMPLETE') AND crm_contacts.first_purchase_at IS NULL 
            THEN v_transaction_date 
            ELSE LEAST(crm_contacts.first_purchase_at, v_transaction_date)
        END,
        last_purchase_at = CASE 
            WHEN sale_record.status IN ('APPROVED', 'COMPLETE') 
            THEN GREATEST(crm_contacts.last_purchase_at, v_transaction_date)
            ELSE crm_contacts.last_purchase_at
        END,
        total_purchases = crm_contacts.total_purchases + CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN 1 ELSE 0 END,
        total_revenue = crm_contacts.total_revenue + CASE WHEN sale_record.status IN ('APPROVED', 'COMPLETE') THEN COALESCE(sale_record.total_price_brl, sale_record.total_price, 0) ELSE 0 END,
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
        sale_record.project_id,
        'hotmart',
        sale_record.transaction_id,
        sale_record.product_code,
        sale_record.product_name,
        sale_record.offer_code,
        sale_record.product_price,
        sale_record.offer_price,
        sale_record.total_price,
        sale_record.total_price_brl,
        sale_record.net_revenue,
        sale_record.payment_method,
        sale_record.payment_type,
        sale_record.installment_number,
        sale_record.coupon,
        sale_record.status,
        sale_record.utm_source,
        sale_record.utm_campaign_id,
        sale_record.utm_adset_name,
        sale_record.utm_creative,
        sale_record.utm_placement,
        sale_record.meta_campaign_id_extracted,
        sale_record.meta_adset_id_extracted,
        sale_record.meta_ad_id_extracted,
        sale_record.affiliate_code,
        sale_record.affiliate_name,
        v_transaction_date,
        sale_record.confirmation_date,
        jsonb_build_object(
            'hotmart_id', sale_record.id,
            'subscriber_code', sale_record.subscriber_code,
            'recurrence', sale_record.recurrence,
            'sold_as', sale_record.sold_as,
            'sale_category', sale_record.sale_category
        )
    )
    ON CONFLICT (project_id, platform, external_id) DO NOTHING;
END;
$$;