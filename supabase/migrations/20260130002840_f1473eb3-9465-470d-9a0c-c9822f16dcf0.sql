-- ═══════════════════════════════════════════════════════════════════════════════
-- CORREÇÃO CANÔNICA: Status Derivado do Ledger
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- PRINCÍPIO: orders.status DEVE ser derivado do SUM(ledger_events.amount)
-- O Ledger é a ÚNICA fonte de verdade financeira.
-- 
-- REGRAS:
-- 1. total_amount > 0 AND sem refund → approved
-- 2. total_amount > 0 AND refund parcial → partial_refund  
-- 3. total_amount <= 0 → cancelled
-- 
-- IMPORTANTE: Cancelamento de ORDER BUMP NUNCA cancela o pedido pai.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- 1. FUNÇÃO: Calcular status derivado do ledger
-- ============================================
CREATE OR REPLACE FUNCTION public.derive_order_status_from_ledger(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================
-- 2. FUNÇÃO: Atualizar status do pedido baseado no ledger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_order_status_from_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_derived_status TEXT;
  v_current_status TEXT;
BEGIN
  -- Determinar qual order_id usar (INSERT/UPDATE usa NEW, DELETE usa OLD)
  DECLARE
    v_order_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_order_id := OLD.order_id;
    ELSE
      v_order_id := NEW.order_id;
    END IF;
    
    -- Obter status atual do pedido
    SELECT status INTO v_current_status
    FROM orders
    WHERE id = v_order_id;
    
    -- Derivar novo status do ledger
    v_derived_status := derive_order_status_from_ledger(v_order_id);
    
    -- Se função retornou NULL, não alterar
    IF v_derived_status IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Atualizar apenas se status mudou
    IF v_current_status IS DISTINCT FROM v_derived_status THEN
      UPDATE orders
      SET 
        status = v_derived_status,
        updated_at = NOW()
      WHERE id = v_order_id;
      
      RAISE NOTICE '[LedgerTrigger] Order % status updated: % → %', v_order_id, v_current_status, v_derived_status;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
  END;
END;
$$;

-- ============================================
-- 3. CRIAR TRIGGER NO LEDGER_EVENTS
-- ============================================
-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_derive_order_status ON ledger_events;

-- Criar novo trigger que dispara após INSERT, UPDATE ou DELETE no ledger
CREATE TRIGGER trigger_derive_order_status
AFTER INSERT OR UPDATE OR DELETE ON ledger_events
FOR EACH ROW
EXECUTE FUNCTION update_order_status_from_ledger();

-- ============================================
-- 4. BACKFILL: Corrigir todos os status existentes
-- ============================================
-- Atualizar todos os pedidos que têm eventos no ledger
UPDATE orders o
SET 
  status = derive_order_status_from_ledger(o.id),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM ledger_events le WHERE le.order_id = o.id
)
AND derive_order_status_from_ledger(o.id) IS NOT NULL
AND status IS DISTINCT FROM derive_order_status_from_ledger(o.id);

-- ============================================
-- 5. COMENTÁRIO DE DOCUMENTAÇÃO
-- ============================================
COMMENT ON FUNCTION derive_order_status_from_ledger IS 
'Função canônica que deriva o status de um pedido baseado na agregação do ledger.
Regras:
- sale > 0 AND refund = 0 → approved
- sale > refund AND refund > 0 → partial_refund  
- sale <= refund → cancelled
O Ledger é a fonte única de verdade. Cancelamento de bump NUNCA cancela pedido pai.';

COMMENT ON TRIGGER trigger_derive_order_status ON ledger_events IS
'Trigger que automaticamente recalcula orders.status quando ledger_events é modificado.
Garante que o status do pedido sempre reflita o estado financeiro real do ledger.';