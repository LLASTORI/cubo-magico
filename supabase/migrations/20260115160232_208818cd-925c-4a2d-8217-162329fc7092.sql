-- ============================================
-- LEDGER OFFICIAL - Hotmart CSV Financial Reconciliation
-- ============================================
-- This table stores OFFICIAL financial data imported from 
-- Hotmart's "Modelo Detalhado de Vendas" CSV export.
-- It serves as the source of truth for closed financial periods.
-- ============================================

CREATE TABLE public.ledger_official (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Transaction reference (links to hotmart_sales and finance_ledger)
  transaction_id TEXT NOT NULL,
  
  -- Financial breakdown from Hotmart CSV
  gross_value NUMERIC(14,2) NOT NULL,           -- Valor bruto total da venda
  product_price NUMERIC(14,2),                   -- Preço do produto
  offer_price NUMERIC(14,2),                     -- Preço da oferta
  platform_fee NUMERIC(14,2) DEFAULT 0,          -- Taxa da plataforma Hotmart
  affiliate_commission NUMERIC(14,2) DEFAULT 0,  -- Comissão do afiliado
  coproducer_commission NUMERIC(14,2) DEFAULT 0, -- Comissão do co-produtor
  taxes NUMERIC(14,2) DEFAULT 0,                 -- Impostos retidos
  net_value NUMERIC(14,2) NOT NULL,              -- Valor líquido final
  
  -- Currency and exchange
  original_currency TEXT DEFAULT 'BRL',
  exchange_rate NUMERIC(10,6) DEFAULT 1.0,
  net_value_brl NUMERIC(14,2) NOT NULL,          -- Valor líquido em BRL
  
  -- Payout tracking
  payout_id TEXT,                                -- ID do repasse Hotmart
  payout_date DATE,                              -- Data do repasse
  
  -- Transaction details
  sale_date TIMESTAMP WITH TIME ZONE,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  status TEXT,                                   -- Status original do CSV
  payment_method TEXT,
  payment_type TEXT,
  installments INTEGER,
  
  -- Product/Offer info
  product_code TEXT,
  product_name TEXT,
  offer_code TEXT,
  offer_name TEXT,
  
  -- Participant info
  buyer_email TEXT,
  buyer_name TEXT,
  affiliate_code TEXT,
  affiliate_name TEXT,
  coproducer_name TEXT,
  
  -- Reconciliation status
  is_reconciled BOOLEAN DEFAULT false,           -- Whether reconciled with finance_ledger
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID REFERENCES auth.users(id),
  
  -- Divergence tracking
  has_divergence BOOLEAN DEFAULT false,
  divergence_type TEXT,                          -- gross, net, platform_fee, affiliate, etc
  divergence_webhook_value NUMERIC(14,2),        -- Value from webhook
  divergence_csv_value NUMERIC(14,2),            -- Value from CSV
  divergence_amount NUMERIC(14,2),               -- Absolute difference
  divergence_notes TEXT,
  
  -- Import metadata
  import_batch_id UUID,                          -- Groups all records from same import
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),
  source_file_name TEXT,
  source_row_number INTEGER,
  
  -- Raw CSV data for audit
  raw_csv_row JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Prevent duplicate imports
  CONSTRAINT ledger_official_unique_transaction UNIQUE (project_id, transaction_id)
);

-- Indexes for performance
CREATE INDEX idx_ledger_official_project_id ON public.ledger_official(project_id);
CREATE INDEX idx_ledger_official_transaction_id ON public.ledger_official(transaction_id);
CREATE INDEX idx_ledger_official_import_batch ON public.ledger_official(import_batch_id);
CREATE INDEX idx_ledger_official_sale_date ON public.ledger_official(sale_date);
CREATE INDEX idx_ledger_official_is_reconciled ON public.ledger_official(project_id, is_reconciled);
CREATE INDEX idx_ledger_official_has_divergence ON public.ledger_official(project_id, has_divergence);

-- Enable RLS
ALTER TABLE public.ledger_official ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view ledger_official"
  ON public.ledger_official
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert ledger_official"
  ON public.ledger_official
  FOR INSERT
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Managers and owners can update ledger_official"
  ON public.ledger_official
  FOR UPDATE
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all ledger_official"
  ON public.ledger_official
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Import batches table to track imports
CREATE TABLE public.ledger_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Import metadata
  file_name TEXT NOT NULL,
  file_size INTEGER,
  total_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  skipped_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  
  -- Reconciliation stats
  reconciled_count INTEGER DEFAULT 0,
  divergence_count INTEGER DEFAULT 0,
  new_transactions_count INTEGER DEFAULT 0,
  
  -- Financial totals from this import
  total_gross NUMERIC(16,2) DEFAULT 0,
  total_net NUMERIC(16,2) DEFAULT 0,
  total_platform_fees NUMERIC(16,2) DEFAULT 0,
  total_affiliate_commissions NUMERIC(16,2) DEFAULT 0,
  total_coproducer_commissions NUMERIC(16,2) DEFAULT 0,
  total_taxes NUMERIC(16,2) DEFAULT 0,
  
  -- Period coverage
  period_start DATE,
  period_end DATE,
  
  -- Import status
  status TEXT DEFAULT 'completed',              -- pending, processing, completed, failed
  error_message TEXT,
  
  -- Audit
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ledger_import_batches_project ON public.ledger_import_batches(project_id);
CREATE INDEX idx_ledger_import_batches_date ON public.ledger_import_batches(imported_at DESC);

-- Enable RLS
ALTER TABLE public.ledger_import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view import batches"
  ON public.ledger_import_batches
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert import batches"
  ON public.ledger_import_batches
  FOR INSERT
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all import batches"
  ON public.ledger_import_batches
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Add comments
COMMENT ON TABLE public.ledger_official IS 'Official financial ledger from Hotmart CSV exports. This is the source of truth for closed financial periods and reconciliation.';
COMMENT ON TABLE public.ledger_import_batches IS 'Tracks CSV import batches for the ledger_official table with reconciliation statistics.';