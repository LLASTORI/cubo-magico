# Contrato: Derivação de Status do Pedido via Ledger

**Versão:** 1.0  
**Data:** 2026-01-30  
**Status:** ✅ Ativo  
**Domínio:** Integridade Financeira

---

## 1. PRINCÍPIO FUNDAMENTAL

### 🔒 O Status do Pedido é DERIVADO do Ledger

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIERARQUIA CANÔNICA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     Ledger (verdade financeira)                                 │
│              ↓                                                  │
│     Orders.status (derivação semântica)                         │
│              ↓                                                  │
│     UI (visualização fiel)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. REGRAS DE DERIVAÇÃO

| Condição (ledger agregado por order) | orders.status |
|--------------------------------------|---------------|
| `sale > 0` AND `refund = 0` | `approved` |
| `sale > refund` AND `refund > 0` | `partial_refund` |
| `sale <= refund` | `cancelled` |

### 2.1 Função de Derivação

```sql
derive_order_status_from_ledger(order_id UUID) → TEXT
```

Esta função calcula o status baseado na agregação:
- `SUM(amount) WHERE event_type = 'sale'` → total de vendas
- `SUM(ABS(amount)) WHERE event_type IN ('refund', 'chargeback')` → total de reembolsos

---

## 3. TRIGGER AUTOMÁTICO

### 3.1 Definição

```sql
TRIGGER trigger_derive_order_status
AFTER INSERT OR UPDATE OR DELETE ON ledger_events
FOR EACH ROW
EXECUTE FUNCTION update_order_status_from_ledger();
```

### 3.2 Comportamento

Quando um `ledger_event` é inserido, atualizado ou deletado:
1. O trigger é disparado
2. A função `derive_order_status_from_ledger` é chamada
3. Se o status derivado for diferente do atual, `orders.status` é atualizado

---

## 4. REGRA DO ORDER BUMP

### 🚫 Cancelamento de Bump NUNCA Cancela Pedido Pai

```
Checkout com Main + Bump:
├── Main: APPROVED (R$100) → ledger: sale +R$80
└── Bump: CANCELED → NÃO gera ledger (sem sale prévia)

Resultado: Pedido = APPROVED (valor líquido = R$80 > 0)
```

### 4.1 Lógica no Webhook

Eventos de débito (CANCELED, REFUNDED, CHARGEBACK) **SÓ** geram `ledger_events` se:
- Existir uma `sale` prévia para a **mesma transação**
- A verificação é feita por `transaction_id`, não por `order_id`

```typescript
// Verificar se existe sale para esta transação específica
if (isDebit && transactionId) {
  const { data: existingSale } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('order_id', orderId)
    .ilike('provider_event_id', `${transactionId}_sale_%`)
    .maybeSingle();
  
  if (!existingSale) {
    // SKIP: Não criar ledger para cancelamento sem venda
    skipLedgerCreation = true;
  }
}
```

---

## 5. FILTRO PADRÃO DA UI

### 5.1 Status Incluídos por Padrão

```typescript
// SalesFilters.tsx e useOrdersCore.ts
defaultStatuses = ['approved', 'complete', 'partial_refund']
```

### 5.2 Justificativa

- `partial_refund`: Pedidos com valor líquido **positivo** (ex: bump cancelado, main aprovado)
- Estes pedidos **DEVEM** aparecer na listagem - têm receita real

---

## 6. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Atualizar `orders.status` diretamente no webhook | Status será sobrescrito pelo trigger |
| ❌ Criar ledger de refund sem sale prévia | Dados órfãos que distorcem financeiro |
| ❌ Usar status como fonte financeira | Status é derivação, não fonte |
| ❌ Filtrar UI excluindo `partial_refund` | Pedidos com valor positivo "desaparecem" |

---

## 7. FLUXO DE PROCESSAMENTO

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK HOTMART                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Recebe evento (APPROVED, CANCELED, etc)                     │
│                          ↓                                      │
│  2. Cria/atualiza ORDER (SEM atualizar status)                  │
│                          ↓                                      │
│  3. Cria ORDER_ITEMS (estrutural)                               │
│                          ↓                                      │
│  4. Verifica se pode criar LEDGER_EVENTS:                       │
│     • Evento de crédito → cria                                  │
│     • Evento de débito → só se existir sale prévia              │
│                          ↓                                      │
│  5. TRIGGER dispara automaticamente                             │
│                          ↓                                      │
│  6. Status é DERIVADO do ledger agregado                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. INVARIANTES

| Invariante | Descrição |
|------------|-----------|
| Derivação automática | Status sempre reflete ledger |
| Sem órfãos | Refund só existe com sale prévia |
| Valor positivo visível | partial_refund aparece na UI |
| Bump isolado | Cancelamento de bump não afeta pedido |

---

## 9. VALIDAÇÃO

```sql
-- Verificar pedidos com status inconsistente
SELECT 
  o.id,
  o.status,
  derive_order_status_from_ledger(o.id) as status_correto
FROM orders o
WHERE EXISTS (SELECT 1 FROM ledger_events le WHERE le.order_id = o.id)
AND o.status IS DISTINCT FROM derive_order_status_from_ledger(o.id);

-- Verificar ledger órfãos (refunds sem sales)
SELECT le.*
FROM ledger_events le
WHERE le.event_type IN ('refund', 'chargeback')
AND NOT EXISTS (
  SELECT 1 FROM ledger_events sale
  WHERE sale.event_type = 'sale'
  AND sale.order_id = le.order_id
  AND SPLIT_PART(sale.provider_event_id, '_', 1) = SPLIT_PART(le.provider_event_id, '_', 1)
);
```

---

*Este documento é a fonte oficial de verdade para a derivação de status de pedidos.*
