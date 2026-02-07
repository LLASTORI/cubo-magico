-- ============================================================================
-- CUBO MÁGICO - DUMP SCHEMA PARTE 2: CONSTRAINTS, LOGIC & VIEWS
-- Gerado em: 2026-02-07
-- ============================================================================

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Tenant Access Helper
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$function$;

-- Super Admin Helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$function$;

-- Get User Role Helper
CREATE OR REPLACE FUNCTION public.get_user_project_role(_user_id uuid, _project_id uuid)
 RETURNS project_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.project_members
  WHERE user_id = _user_id AND project_id = _project_id
$function$;

-- Encryption Helpers
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(p_data text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_encoded text;
BEGIN
  IF p_data IS NULL OR p_data = '' THEN
    RETURN p_data;
  END IF;
  
  v_key := public.get_encryption_key('default');
  
  -- Encode with base64 and prefix with marker
  v_encoded := 'ENC:' || encode(
    convert_to(p_data || '::' || md5(p_data || v_key), 'UTF8'),
    'base64'
  );
  
  RETURN v_encoded;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_sensitive(p_encrypted_data text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_decoded text;
  v_parts text[];
  v_data text;
  v_checksum text;
BEGIN
  IF p_encrypted_data IS NULL OR p_encrypted_data = '' THEN
    RETURN p_encrypted_data;
  END IF;
  
  -- Check if data is encrypted (has ENC: prefix)
  IF NOT p_encrypted_data LIKE 'ENC:%' THEN
    RETURN p_encrypted_data; -- Return as-is if not encrypted
  END IF;
  
  v_key := public.get_encryption_key('default');
  
  BEGIN
    -- Decode from base64
    v_decoded := convert_from(
      decode(substring(p_encrypted_data from 5), 'base64'),
      'UTF8'
    );
    
    -- Split data and checksum
    v_parts := string_to_array(v_decoded, '::');
    v_data := v_parts[1];
    v_checksum := v_parts[2];
    
    -- Verify checksum
    IF v_checksum = md5(v_data || v_key) THEN
      RETURN v_data;
    ELSE
      RETURN '[DECRYPTION_FAILED]';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN p_encrypted_data; -- Return original if decryption fails
  END;
END;
$function$;

-- Project Code Generator
CREATE OR REPLACE FUNCTION public.generate_project_public_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
BEGIN
  -- Só gerar se public_code for NULL
  IF NEW.public_code IS NULL THEN
    LOOP
      -- Gerar 6 caracteres alfanuméricos aleatórios
      new_code := 'cm_';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      -- Verificar unicidade
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE public_code = new_code);
    END LOOP;
    
    NEW.public_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_project_public_code
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.generate_project_public_code();

-- Handle New Project Owner
CREATE OR REPLACE FUNCTION public.handle_new_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert the project creator as owner in project_members
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_project_created
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_project();

-- Handle New User Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- NOTA IMPORTANTE: O trigger on_auth_user_created deve ser criado manualmente no auth.users
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto CRM Status Updater (derived from Orders)
CREATE OR REPLACE FUNCTION public.derive_order_status_from_ledger(p_order_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_amount NUMERIC;
  v_has_refund BOOLEAN;
  v_refund_amount NUMERIC;
  v_sale_amount NUMERIC;
BEGIN
  -- Calcular somas do ledger para este pedido
  SELECT 
    COALESCE(SUM(CASE WHEN event_type = 'sale' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type IN ('refund', 'chargeback') THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(amount), 0)
  INTO v_sale_amount, v_refund_amount, v_total_amount
  FROM ledger_events
  WHERE order_id = p_order_id;
  
  -- Se não há eventos no ledger, manter status atual (pending ou outro)
  IF v_sale_amount = 0 AND v_refund_amount = 0 THEN
    RETURN NULL; -- Indica: não alterar status
  END IF;
  
  -- Verificar se há refund
  v_has_refund := v_refund_amount > 0;
  
  -- Derivar status baseado nas regras canônicas
  -- Regra 1: Valor líquido positivo SEM refund → approved
  IF v_sale_amount > 0 AND NOT v_has_refund THEN
    RETURN 'approved';
  END IF;
  
  -- Regra 2: Valor líquido positivo COM refund parcial → partial_refund
  -- (venda > refund, mas há algum refund)
  IF v_sale_amount > v_refund_amount AND v_has_refund THEN
    RETURN 'partial_refund';
  END IF;
  
  -- Regra 3: Valor líquido <= 0 (refund total ou mais) → cancelled
  IF v_sale_amount <= v_refund_amount THEN
    RETURN 'cancelled';
  END IF;
  
  -- Fallback (não deveria chegar aqui)
  RETURN 'approved';
END;
$function$;

-- Update Contact Stats Trigger
CREATE OR REPLACE FUNCTION public.update_contact_financial_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update contact financial data
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.crm_contacts
    SET 
      total_purchases = (SELECT count(*) FROM crm_transactions WHERE contact_id = OLD.contact_id AND status IN ('APPROVED', 'COMPLETE')),
      total_revenue = (SELECT COALESCE(sum(total_price), 0) FROM crm_transactions WHERE contact_id = OLD.contact_id AND status IN ('APPROVED', 'COMPLETE')),
      last_purchase_at = (SELECT max(transaction_date) FROM crm_transactions WHERE contact_id = OLD.contact_id AND status IN ('APPROVED', 'COMPLETE')),
      first_purchase_at = (SELECT min(transaction_date) FROM crm_transactions WHERE contact_id = OLD.contact_id AND status IN ('APPROVED', 'COMPLETE'))
    WHERE id = OLD.contact_id;
    RETURN OLD;
  ELSE
    UPDATE public.crm_contacts
    SET 
      total_purchases = (SELECT count(*) FROM crm_transactions WHERE contact_id = NEW.contact_id AND status IN ('APPROVED', 'COMPLETE')),
      total_revenue = (SELECT COALESCE(sum(total_price), 0) FROM crm_transactions WHERE contact_id = NEW.contact_id AND status IN ('APPROVED', 'COMPLETE')),
      last_purchase_at = (SELECT max(transaction_date) FROM crm_transactions WHERE contact_id = NEW.contact_id AND status IN ('APPROVED', 'COMPLETE')),
      first_purchase_at = (SELECT min(transaction_date) FROM crm_transactions WHERE contact_id = NEW.contact_id AND status IN ('APPROVED', 'COMPLETE'))
    WHERE id = NEW.contact_id;
    RETURN NEW;
  END IF;
END;
$function$;

CREATE TRIGGER update_contact_financial_data
AFTER INSERT OR DELETE OR UPDATE ON public.crm_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_contact_financial_data();

-- ============================================================================
-- VIEWS CANÔNICAS
-- ============================================================================

-- Orders Shadow View (Custos e Métricas)
CREATE OR REPLACE VIEW public.orders_view_shadow AS
 SELECT o.id,
    o.id AS order_id,
    o.project_id,
    o.provider,
    o.provider_order_id,
    o.buyer_email,
    o.buyer_name,
    o.contact_id,
    o.status,
    o.currency,
    o.customer_paid,
    o.gross_base,
    o.producer_net,
    o.ordered_at,
    o.approved_at,
    o.completed_at,
    o.created_at,
    o.updated_at,
    o.raw_payload,
    ( SELECT count(*) AS count
           FROM order_items
          WHERE (order_items.order_id = o.id)) AS item_count,
    COALESCE(( SELECT sum(ledger_events.amount) AS sum
           FROM ledger_events
          WHERE ((ledger_events.order_id = o.id) AND (ledger_events.event_type = 'platform_fee'::text))), (0)::numeric) AS platform_fee,
    COALESCE(( SELECT sum(ledger_events.amount) AS sum
           FROM ledger_events
          WHERE ((ledger_events.order_id = o.id) AND (ledger_events.event_type = 'tax'::text))), (0)::numeric) AS tax_cost,
    COALESCE(( SELECT sum(ledger_events.amount) AS sum
           FROM ledger_events
          WHERE ((ledger_events.order_id = o.id) AND (ledger_events.event_type = 'affiliate'::text))), (0)::numeric) AS affiliate_cost,
    COALESCE(( SELECT sum(ledger_events.amount) AS sum
           FROM ledger_events
          WHERE ((ledger_events.order_id = o.id) AND (ledger_events.event_type = 'coproducer'::text))), (0)::numeric) AS coproducer_cost,
    COALESCE(( SELECT sum(ledger_events.amount) AS sum
           FROM ledger_events
          WHERE ((ledger_events.order_id = o.id) AND (ledger_events.event_type = 'refund'::text))), (0)::numeric) AS refund_amount,
    COALESCE(( SELECT sum(ledger_events.amount) AS sum
           FROM ledger_events
          WHERE ((ledger_events.order_id = o.id) AND (ledger_events.event_type = 'chargeback'::text))), (0)::numeric) AS chargeback_amount
   FROM orders o;

-- CRM Journey Orders View (Usada na timeline do contato)
CREATE OR REPLACE VIEW public.crm_journey_orders_view AS
 SELECT o.id AS order_id,
    o.provider_order_id,
    o.project_id,
    c.id AS contact_id,
    COALESCE(c.name, o.buyer_name) AS contact_name,
    o.buyer_email AS contact_email,
    o.ordered_at,
    COALESCE(o.customer_paid, (0)::numeric) AS customer_paid,
    COALESCE(o.producer_net, (0)::numeric) AS producer_net,
    o.currency,
    o.provider,
    o.utm_source,
    o.utm_campaign,
    o.utm_adset,
    o.utm_placement,
    o.utm_creative,
    (( SELECT count(*) AS count
           FROM order_items oi
          WHERE (oi.order_id = o.id)))::integer AS items_count,
    o.status,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('item_type', oi.item_type, 'product_name', oi.product_name, 'offer_name', oi.offer_name, 'base_price', oi.base_price, 'funnel_id', oi.funnel_id) ORDER BY
                CASE oi.item_type
                    WHEN 'main'::text THEN 0
                    WHEN 'bump'::text THEN 1
                    ELSE 2
                END), '[]'::jsonb) AS "coalesce"
           FROM order_items oi
          WHERE (oi.order_id = o.id)) AS products_detail,
    ( SELECT oi.product_name
           FROM order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY
                CASE oi.item_type
                    WHEN 'main'::text THEN 0
                    WHEN 'bump'::text THEN 1
                    ELSE 2
                END
         LIMIT 1) AS main_product_name,
    ( SELECT oi.funnel_id
           FROM order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY
                CASE oi.item_type
                    WHEN 'main'::text THEN 0
                    WHEN 'bump'::text THEN 1
                    ELSE 2
                END
         LIMIT 1) AS main_funnel_id,
    row_number() OVER (PARTITION BY o.buyer_email, o.project_id ORDER BY o.ordered_at) AS purchase_sequence
   FROM (orders o
     LEFT JOIN crm_contacts c ON (((c.email = o.buyer_email) AND (c.project_id = o.project_id))))
  WHERE (o.status = 'approved'::text);

-- Finance Ledger Summary (Relatório Financeiro)
CREATE OR REPLACE VIEW public.finance_ledger_summary AS
 SELECT fl.project_id,
    fl.transaction_id,
    fl.provider,
    hs.product_name,
    hs.product_code,
    hs.offer_code,
    hs.buyer_name,
    hs.buyer_email,
    hs.buyer_phone_country_code,
    hs.buyer_phone_ddd,
    hs.buyer_phone,
    hs.payment_method,
    hs.payment_type,
    hs.recurrence,
    hs.is_upgrade,
    hs.subscriber_code,
    om.funnel_id,
    f.name AS funnel_name,
    min(fl.occurred_at) AS first_event_at,
    max(fl.occurred_at) AS last_event_at,
    sum(
        CASE
            WHEN (fl.event_type = 'SALE'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS gross_revenue,
    sum(
        CASE
            WHEN (fl.event_type = 'PLATFORM_FEE'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS platform_fees,
    sum(
        CASE
            WHEN (fl.event_type = 'AFFILIATE_COMMISSION'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS affiliate_commissions,
    sum(
        CASE
            WHEN (fl.event_type = 'COPRODUCER_COMMISSION'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS coproducer_commissions,
    sum(
        CASE
            WHEN (fl.event_type = 'TAX'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS taxes,
    sum(
        CASE
            WHEN (fl.event_type = 'REFUND'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS refunds,
    sum(
        CASE
            WHEN (fl.event_type = 'CHARGEBACK'::text) THEN fl.amount
            ELSE (0)::numeric
        END) AS chargebacks,
    sum(fl.amount) AS net_revenue,
    hs.utm_source,
    hs.utm_medium,
    hs.utm_campaign_id AS utm_campaign,
    hs.utm_adset_name AS utm_adset,
    hs.utm_placement,
    hs.utm_creative,
    hs.meta_campaign_id_extracted AS meta_campaign_id,
    hs.meta_adset_id_extracted AS meta_adset_id,
    hs.meta_ad_id_extracted AS meta_ad_id,
    hs.checkout_origin,
    hs.status AS hotmart_status,
    hs.sale_category,
    COALESCE(hs.utm_term, hs.utm_placement) AS utm_term,
    COALESCE(hs.utm_content, hs.utm_creative) AS utm_content,
    COALESCE(hs.raw_checkout_origin, hs.checkout_origin) AS raw_checkout_origin
   FROM (((finance_ledger fl
     LEFT JOIN hotmart_sales hs ON (((fl.transaction_id = hs.transaction_id) AND (fl.project_id = hs.project_id))))
     LEFT JOIN offer_mappings om ON (((hs.offer_code = om.codigo_oferta) AND (hs.project_id = om.project_id))))
     LEFT JOIN funnels f ON ((om.funnel_id = f.id)))
  GROUP BY fl.project_id, fl.transaction_id, fl.provider, hs.product_name, hs.product_code, hs.offer_code, hs.buyer_name, hs.buyer_email, hs.buyer_phone_country_code, hs.buyer_phone_ddd, hs.buyer_phone, hs.payment_method, hs.payment_type, hs.recurrence, hs.is_upgrade, hs.subscriber_code, om.funnel_id, f.name, hs.utm_source, hs.utm_medium, hs.utm_campaign_id, hs.utm_adset_name, hs.utm_placement, hs.utm_creative, hs.utm_term, hs.utm_content, hs.raw_checkout_origin, hs.checkout_origin, hs.meta_campaign_id_extracted, hs.meta_adset_id_extracted, hs.meta_ad_id_extracted, hs.status, hs.sale_category;

-- ============================================================================
-- RLS POLICIES (AMOSTRAS PRINCIPAIS)
-- ============================================================================

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view projects they are members of" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "Owners can update projects" ON public.projects FOR UPDATE USING (user_id = auth.uid());

-- Orders (Tenant Isolation)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view orders" ON public.orders FOR SELECT USING (has_project_access(auth.uid(), project_id));
CREATE POLICY "System can manage orders" ON public.orders FOR ALL USING (true) WITH CHECK (true); -- Requires service role for writes usually, or function security definer

-- CRM Contacts
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contacts" ON public.crm_contacts FOR SELECT USING (has_project_access(auth.uid(), project_id));
CREATE POLICY "Members with permission can edit contacts" ON public.crm_contacts FOR UPDATE USING (
  has_area_permission(auth.uid(), project_id, 'crm', 'edit')
);

-- ============================================================================
-- INDEXES (PERFORMANCE)
-- ============================================================================

CREATE UNIQUE INDEX idx_orders_provider_unique ON public.orders USING btree (project_id, provider, provider_order_id);
CREATE INDEX idx_orders_project_id ON public.orders USING btree (project_id);
CREATE INDEX idx_orders_buyer_email ON public.orders USING btree (buyer_email);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_ordered_at ON public.orders USING btree (ordered_at DESC);

CREATE UNIQUE INDEX idx_projects_public_code ON public.projects USING btree (public_code);
CREATE INDEX idx_project_members_user_project ON public.project_members USING btree (user_id, project_id);

CREATE INDEX idx_ledger_order_id ON public.ledger_events USING btree (order_id);
CREATE INDEX idx_ledger_project_event ON public.ledger_events USING btree (project_id, event_type);

CREATE INDEX idx_hotmart_sales_transaction ON public.hotmart_sales USING btree (transaction_id);
CREATE INDEX idx_hotmart_sales_email ON public.hotmart_sales USING btree (buyer_email);

-- FIM DO DUMP PARTE 2
