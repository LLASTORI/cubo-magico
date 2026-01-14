-- ============================================
-- FINANCE LEDGER - Single Source of Truth for Money
-- ============================================
-- This ledger records EVERY financial event from Hotmart:
-- - Credits (producer revenue)
-- - Refunds & Chargebacks
-- - Affiliate commissions
-- - Coproducer commissions  
-- - Platform fees
-- - Taxes
-- - Payouts
-- ============================================

CREATE TABLE public.finance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'hotmart',
  
  -- Transaction reference
  transaction_id TEXT NOT NULL,
  hotmart_sale_id TEXT,
  
  -- Event classification
  event_type TEXT NOT NULL,
  -- Possible values: credit, refund, chargeback, affiliate, coproducer, platform_fee, tax, payout, adjustment
  
  -- Actor information (who receives/pays)
  actor_type TEXT,
  -- Possible values: producer, affiliate, coproducer, platform
  actor_id TEXT,
  
  -- Financial data
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Timestamps
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Audit trail
  source_api TEXT,
  raw_payload JSONB,
  
  -- Uniqueness constraint to prevent duplicates
  CONSTRAINT finance_ledger_unique_event UNIQUE (provider, transaction_id, event_type, actor_type, actor_id, amount, occurred_at)
);

-- Create indexes for common queries
CREATE INDEX idx_finance_ledger_project_id ON public.finance_ledger(project_id);
CREATE INDEX idx_finance_ledger_transaction_id ON public.finance_ledger(transaction_id);
CREATE INDEX idx_finance_ledger_occurred_at ON public.finance_ledger(occurred_at);
CREATE INDEX idx_finance_ledger_event_type ON public.finance_ledger(event_type);
CREATE INDEX idx_finance_ledger_project_occurred ON public.finance_ledger(project_id, occurred_at);

-- Enable Row Level Security
ALTER TABLE public.finance_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their project ledger entries"
ON public.finance_ledger
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = finance_ledger.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert ledger entries"
ON public.finance_ledger
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Project owners can delete ledger entries"
ON public.finance_ledger
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = finance_ledger.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'manager')
  )
);

-- ============================================
-- FINANCE LEDGER SUMMARY VIEW
-- Aggregates ledger entries by transaction
-- ============================================

CREATE OR REPLACE VIEW public.finance_ledger_summary AS
SELECT
  fl.project_id,
  fl.transaction_id,
  MIN(fl.occurred_at) AS transaction_date,
  (MIN(fl.occurred_at) AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
  
  -- Producer gross (total credit before deductions)
  SUM(CASE WHEN fl.event_type IN ('credit', 'producer') THEN fl.amount ELSE 0 END) AS producer_gross,
  
  -- Deductions
  SUM(CASE WHEN fl.event_type = 'affiliate' THEN ABS(fl.amount) ELSE 0 END) AS affiliate_cost,
  SUM(CASE WHEN fl.event_type = 'coproducer' THEN ABS(fl.amount) ELSE 0 END) AS coproducer_cost,
  SUM(CASE WHEN fl.event_type IN ('platform_fee', 'tax') THEN ABS(fl.amount) ELSE 0 END) AS platform_cost,
  SUM(CASE WHEN fl.event_type IN ('refund', 'chargeback') THEN ABS(fl.amount) ELSE 0 END) AS refunds,
  
  -- Net revenue = Gross - All deductions
  (
    SUM(CASE WHEN fl.event_type IN ('credit', 'producer') THEN fl.amount ELSE 0 END)
    - SUM(CASE WHEN fl.event_type IN ('affiliate', 'coproducer', 'platform_fee', 'tax', 'refund', 'chargeback') THEN ABS(fl.amount) ELSE 0 END)
  ) AS net_revenue,
  
  -- Metadata
  fl.provider,
  COUNT(*) AS event_count

FROM public.finance_ledger fl
GROUP BY fl.project_id, fl.transaction_id, fl.provider;

-- ============================================
-- FINANCE SYNC RUNS - Track sync operations
-- ============================================

CREATE TABLE public.finance_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running',
  -- running, completed, failed
  
  -- Stats
  events_created INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  
  -- Scope
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  apis_synced TEXT[],
  
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_finance_sync_runs_project ON public.finance_sync_runs(project_id);

ALTER TABLE public.finance_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project sync runs"
ON public.finance_sync_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = finance_sync_runs.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage sync runs"
ON public.finance_sync_runs
FOR ALL
WITH CHECK (true);