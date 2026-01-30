-- ═══════════════════════════════════════════════════════════════════════════════
-- CORREÇÃO: Remover ledger_events órfãos (refunds sem sales correspondentes)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- PROBLEMA: O webhook estava criando ledger_events de "refund" para cancelamentos
-- de itens que NUNCA tiveram uma venda aprovada (ex: order bumps cancelados 
-- antes de serem aprovados).
-- 
-- REGRA CANÔNICA: Um refund só pode existir se houver uma venda prévia.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Identificar e deletar ledger_events órfãos por transação
-- (refunds de transações que não têm sales)
WITH orphan_refunds AS (
  SELECT le.id, le.provider_event_id
  FROM ledger_events le
  WHERE le.event_type IN ('refund', 'chargeback')
  -- Extrair transaction_id do provider_event_id (formato: {transaction}_{event_type}_{actor})
  AND NOT EXISTS (
    SELECT 1 FROM ledger_events sale
    WHERE sale.event_type = 'sale'
    AND sale.order_id = le.order_id
    -- Verificar se é a MESMA transação (mesmo prefixo)
    AND SPLIT_PART(sale.provider_event_id, '_', 1) = SPLIT_PART(le.provider_event_id, '_', 1)
  )
)
DELETE FROM ledger_events
WHERE id IN (SELECT id FROM orphan_refunds);

-- 2. Também deletar platform_fee e coproducer órfãos da mesma transação
WITH orphan_fees AS (
  SELECT le.id
  FROM ledger_events le
  WHERE le.event_type IN ('platform_fee', 'coproducer', 'affiliate')
  AND NOT EXISTS (
    SELECT 1 FROM ledger_events sale
    WHERE sale.event_type = 'sale'
    AND sale.order_id = le.order_id
    AND SPLIT_PART(sale.provider_event_id, '_', 1) = SPLIT_PART(le.provider_event_id, '_', 1)
  )
)
DELETE FROM ledger_events
WHERE id IN (SELECT id FROM orphan_fees);

-- 3. Recalcular status de todos os pedidos afetados via trigger
-- O trigger já existe e vai ser disparado automaticamente pelos deletes acima

-- 4. Forçar recálculo de status para pedidos que ainda estejam incorretos
UPDATE orders o
SET 
  status = COALESCE(derive_order_status_from_ledger(o.id), o.status),
  updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM ledger_events le WHERE le.order_id = o.id)
AND status IS DISTINCT FROM COALESCE(derive_order_status_from_ledger(o.id), status);