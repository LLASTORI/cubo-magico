-- ═══════════════════════════════════════════════════════════════════════════════
-- SALES HISTORY ORDERS - Camada 3 de Histórico (Read-Only CSV)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- PROPÓSITO:
-- Armazenar histórico de vendas importado via CSV para visualização e análise.
-- NUNCA afeta orders, order_items, ledger_events ou métricas operacionais.
--
-- CONTRATO:
-- - Dados são somente leitura após importação
-- - Idempotência por project_id + provider_transaction_id
-- - Não interfere no fluxo de webhook
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tabela principal de histórico de vendas
CREATE TABLE IF NOT EXISTS public.sales_history_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Provider identification
  provider TEXT NOT NULL DEFAULT 'HOTMART',
  provider_transaction_id TEXT NOT NULL,
  
  -- Order info
  order_date TIMESTAMP WITH TIME ZONE,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  
  -- Buyer info
  buyer_name TEXT,
  buyer_email TEXT,
  
  -- Product info
  product_name TEXT,
  product_code TEXT,
  offer_name TEXT,
  offer_code TEXT,
  
  -- Financial values (original currency)
  gross_value NUMERIC(15, 2) DEFAULT 0,
  platform_fee NUMERIC(15, 2) DEFAULT 0,
  affiliate_commission NUMERIC(15, 2) DEFAULT 0,
  coproducer_commission NUMERIC(15, 2) DEFAULT 0,
  taxes NUMERIC(15, 2) DEFAULT 0,
  net_value NUMERIC(15, 2) DEFAULT 0,
  
  -- Currency info
  original_currency TEXT DEFAULT 'BRL',
  exchange_rate NUMERIC(10, 6) DEFAULT 1,
  net_value_brl NUMERIC(15, 2) DEFAULT 0,
  
  -- Status and payment
  status TEXT,
  payment_method TEXT,
  payment_type TEXT,
  installments INTEGER,
  
  -- Affiliate/Coproducer info
  affiliate_name TEXT,
  affiliate_code TEXT,
  coproducer_name TEXT,
  
  -- Payout info
  payout_id TEXT,
  payout_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  source TEXT NOT NULL DEFAULT 'csv',
  import_batch_id UUID,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint for idempotency
  CONSTRAINT unique_sales_history_transaction UNIQUE (project_id, provider_transaction_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sales_history_project ON public.sales_history_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_email ON public.sales_history_orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_sales_history_date ON public.sales_history_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_history_status ON public.sales_history_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_history_product ON public.sales_history_orders(product_name);
CREATE INDEX IF NOT EXISTS idx_sales_history_batch ON public.sales_history_orders(import_batch_id);

-- RLS
ALTER TABLE public.sales_history_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as other project-scoped tables)
CREATE POLICY "Users can view sales history from their projects"
  ON public.sales_history_orders
  FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sales history into their projects"
  ON public.sales_history_orders
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies - data is read-only after import
-- If needed in future, add with proper audit trail

-- Import batches tracking table
CREATE TABLE IF NOT EXISTS public.sales_history_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Batch info
  file_name TEXT,
  provider TEXT NOT NULL DEFAULT 'HOTMART',
  
  -- Stats
  total_rows INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  -- Metadata
  imported_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for batches
ALTER TABLE public.sales_history_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import batches from their projects"
  ON public.sales_history_import_batches
  FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert import batches into their projects"
  ON public.sales_history_import_batches
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update import batches in their projects"
  ON public.sales_history_import_batches
  FOR UPDATE
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_sales_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sales_history_orders_updated_at
  BEFORE UPDATE ON public.sales_history_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sales_history_updated_at();