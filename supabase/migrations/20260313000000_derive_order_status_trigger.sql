-- Migration: trigger_derive_order_status
-- Recriado manualmente em 13/03/2026 após ter sido deletado na migration 20260303.
-- Esta migration documenta o estado atual do banco para garantir que
-- futuros resets/branches não percam o trigger.

-- Função auxiliar: deriva o status do pedido a partir dos ledger_events
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
      SELECT
        COALESCE(SUM(CASE WHEN event_type = 'sale' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN event_type IN ('refund', 'chargeback') THEN ABS(amount) ELSE 0 END), 0),
        COALESCE(SUM(amount), 0)
      INTO v_sale_amount, v_refund_amount, v_total_amount
      FROM ledger_events
      WHERE order_id = p_order_id;

      IF v_sale_amount = 0 AND v_refund_amount = 0 THEN
        RETURN NULL;
      END IF;

      v_has_refund := v_refund_amount > 0;

      IF v_sale_amount > 0 AND NOT v_has_refund THEN
        RETURN 'approved';
      END IF;

      IF v_sale_amount > v_refund_amount AND v_has_refund THEN
        RETURN 'partial_refund';
      END IF;

      IF v_sale_amount <= v_refund_amount THEN
        RETURN 'cancelled';
      END IF;

      RETURN 'approved';
    END;
    $function$;

-- Função trigger: atualiza orders.status quando ledger_events muda
CREATE OR REPLACE FUNCTION public.update_order_status_from_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    DECLARE
      v_derived_status TEXT;
      v_current_status TEXT;
      v_order_id UUID;
    BEGIN
      IF TG_OP = 'DELETE' THEN
        v_order_id := OLD.order_id;
      ELSE
        v_order_id := NEW.order_id;
      END IF;

      SELECT status INTO v_current_status
      FROM orders
      WHERE id = v_order_id;

      v_derived_status := derive_order_status_from_ledger(v_order_id);

      IF v_derived_status IS NULL THEN
        RETURN COALESCE(NEW, OLD);
      END IF;

      IF v_current_status IS DISTINCT FROM v_derived_status THEN
        UPDATE orders
        SET status = v_derived_status, updated_at = NOW()
        WHERE id = v_order_id;
      END IF;

      RETURN COALESCE(NEW, OLD);
    END;
    $function$;

-- Trigger em ledger_events: dispara em INSERT, UPDATE e DELETE
DROP TRIGGER IF EXISTS trigger_derive_order_status ON public.ledger_events;
CREATE TRIGGER trigger_derive_order_status
  AFTER INSERT OR UPDATE OR DELETE ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION update_order_status_from_ledger();
