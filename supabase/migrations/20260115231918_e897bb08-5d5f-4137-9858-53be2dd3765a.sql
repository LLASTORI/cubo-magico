
-- ============================================
-- CUBO ORDERS CORE - PROMPT 1
-- Chassi do sistema financeiro canônico
-- NÃO ALTERA NADA EXISTENTE
-- ============================================

-- 1️⃣ TABELA: orders
-- Representa um pedido completo (pode ter múltiplos items)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Provider info
  provider TEXT NOT NULL, -- hotmart, stripe, meta, etc
  provider_order_id TEXT NOT NULL, -- ID do pedido na plataforma
  
  -- Buyer info
  buyer_email TEXT,
  buyer_name TEXT,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, completed, refunded, chargeback, cancelled
  
  -- Financial (all in BRL)
  currency TEXT NOT NULL DEFAULT 'BRL',
  customer_paid NUMERIC DEFAULT 0, -- Quanto o cliente pagou (com parcelamento, juros etc)
  gross_base NUMERIC DEFAULT 0, -- Soma dos preços base dos items
  producer_net NUMERIC DEFAULT 0, -- Quanto o produtor recebeu (líquido final)
  
  -- Timestamps
  ordered_at TIMESTAMPTZ, -- Quando o pedido foi feito
  approved_at TIMESTAMPTZ, -- Quando foi aprovado
  completed_at TIMESTAMPTZ, -- Quando foi concluído
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Raw data for debugging
  raw_payload JSONB,
  
  -- Unique constraint per provider
  CONSTRAINT orders_provider_unique UNIQUE (project_id, provider, provider_order_id)
);

-- Indexes for orders
CREATE INDEX idx_orders_project_id ON public.orders(project_id);
CREATE INDEX idx_orders_provider ON public.orders(provider);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_buyer_email ON public.orders(buyer_email);
CREATE INDEX idx_orders_contact_id ON public.orders(contact_id);
CREATE INDEX idx_orders_ordered_at ON public.orders(ordered_at);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- 2️⃣ TABELA: order_items
-- Items individuais dentro de um pedido (produtos, bumps, upsells)
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- Product info from provider
  provider_product_id TEXT, -- ID do produto na plataforma
  provider_offer_id TEXT, -- ID da oferta na plataforma
  product_name TEXT,
  offer_name TEXT,
  
  -- Item classification
  item_type TEXT NOT NULL DEFAULT 'main', -- main, bump, upsell, downsell, addon
  funnel_position TEXT, -- front, middle, back
  
  -- Financial
  base_price NUMERIC DEFAULT 0, -- Preço base do item
  quantity INT DEFAULT 1,
  
  -- Mapping to internal entities
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  offer_mapping_id UUID REFERENCES public.offer_mappings(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Raw data
  metadata JSONB
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_item_type ON public.order_items(item_type);
CREATE INDEX idx_order_items_funnel_id ON public.order_items(funnel_id);
CREATE INDEX idx_order_items_provider_product_id ON public.order_items(provider_product_id);

-- 3️⃣ TABELA: ledger_events
-- Eventos financeiros granulares (taxas, splits, afiliados, etc)
CREATE TABLE public.ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Event classification
  provider TEXT NOT NULL, -- hotmart, stripe, meta, etc
  event_type TEXT NOT NULL, -- sale, refund, chargeback, platform_fee, affiliate, coproducer, tax, payout
  
  -- Actor (who receives/pays)
  actor TEXT, -- producer, affiliate, coproducer, platform, tax_authority
  actor_name TEXT, -- Nome do afiliado/coprodutor se aplicável
  
  -- Financial
  amount NUMERIC NOT NULL DEFAULT 0, -- Valor do evento (positivo = receita, negativo = custo)
  currency TEXT NOT NULL DEFAULT 'BRL',
  
  -- Reference
  provider_event_id TEXT, -- ID do evento na plataforma
  
  -- Timestamps
  occurred_at TIMESTAMPTZ, -- Quando o evento ocorreu
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Raw data
  raw_payload JSONB
);

-- Indexes for ledger_events
CREATE INDEX idx_ledger_events_order_id ON public.ledger_events(order_id);
CREATE INDEX idx_ledger_events_project_id ON public.ledger_events(project_id);
CREATE INDEX idx_ledger_events_event_type ON public.ledger_events(event_type);
CREATE INDEX idx_ledger_events_actor ON public.ledger_events(actor);
CREATE INDEX idx_ledger_events_occurred_at ON public.ledger_events(occurred_at);
CREATE INDEX idx_ledger_events_provider_event_id ON public.ledger_events(provider_event_id);

-- 4️⃣ TABELA: provider_order_map
-- Mapeamento de transações de providers para orders internos
-- (útil quando um provider usa transaction_id diferente de order_id)
CREATE TABLE public.provider_order_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL, -- ID da transação na plataforma
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint
  CONSTRAINT provider_order_map_unique UNIQUE (project_id, provider, provider_transaction_id)
);

-- Indexes for provider_order_map
CREATE INDEX idx_provider_order_map_order_id ON public.provider_order_map(order_id);
CREATE INDEX idx_provider_order_map_lookup ON public.provider_order_map(project_id, provider, provider_transaction_id);

-- 5️⃣ VIEW SHADOW: orders_view_shadow
-- Agregação de orders com breakdown de custos do ledger
-- NÃO USADA AINDA - apenas preparação
CREATE OR REPLACE VIEW public.orders_view_shadow AS
SELECT
  o.id,
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
  -- Aggregated from ledger_events
  COALESCE(SUM(CASE WHEN le.event_type = 'platform_fee' THEN le.amount ELSE 0 END), 0) AS platform_fee,
  COALESCE(SUM(CASE WHEN le.event_type = 'affiliate' THEN le.amount ELSE 0 END), 0) AS affiliate_cost,
  COALESCE(SUM(CASE WHEN le.event_type = 'coproducer' THEN le.amount ELSE 0 END), 0) AS coproducer_cost,
  COALESCE(SUM(CASE WHEN le.event_type = 'tax' THEN le.amount ELSE 0 END), 0) AS tax_cost,
  COALESCE(SUM(CASE WHEN le.event_type = 'refund' THEN le.amount ELSE 0 END), 0) AS refund_amount,
  COALESCE(SUM(CASE WHEN le.event_type = 'chargeback' THEN le.amount ELSE 0 END), 0) AS chargeback_amount,
  -- Count of items
  (SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_count
FROM public.orders o
LEFT JOIN public.ledger_events le ON le.order_id = o.id
GROUP BY o.id;

-- 6️⃣ ENABLE RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_order_map ENABLE ROW LEVEL SECURITY;

-- 7️⃣ RLS POLICIES
-- Orders
CREATE POLICY "Users can view orders from their projects"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = orders.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert orders in their projects"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = orders.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can update orders in their projects"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = orders.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

-- Order Items
CREATE POLICY "Users can view order_items from their orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE o.id = order_items.order_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert order_items in their orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE o.id = order_items.order_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

-- Ledger Events
CREATE POLICY "Users can view ledger_events from their projects"
  ON public.ledger_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ledger_events.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert ledger_events in their projects"
  ON public.ledger_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ledger_events.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

-- Provider Order Map
CREATE POLICY "Users can view provider_order_map from their projects"
  ON public.provider_order_map FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = provider_order_map.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert provider_order_map in their projects"
  ON public.provider_order_map FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = provider_order_map.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

-- 8️⃣ TRIGGER: updated_at for orders
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_updated_at();

-- 9️⃣ COMMENT DOCUMENTATION
COMMENT ON TABLE public.orders IS 'Pedidos canônicos do Cubo - suporta múltiplas plataformas, combos, bumps, upsells';
COMMENT ON TABLE public.order_items IS 'Items individuais de um pedido - produtos, bumps, upsells, addons';
COMMENT ON TABLE public.ledger_events IS 'Eventos financeiros granulares - taxas, splits, afiliados, reembolsos';
COMMENT ON TABLE public.provider_order_map IS 'Mapeamento de transaction_id do provider para order_id interno';
COMMENT ON VIEW public.orders_view_shadow IS 'View shadow com agregação de custos - NÃO USADA AINDA';
