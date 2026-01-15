# Blindagem do Webhook como Fonte Financeira Única

## Data: 2026-01-15

## 🛡️ OBJETIVO

Garantir que o **webhook da Hotmart seja a ÚNICA fonte de dados financeiros** para o sistema.
O Ledger deve ser:
- ✅ **Imutável** - entradas nunca são modificadas, apenas novas são adicionadas
- ✅ **Versionado** - cada transação pode ter múltiplos eventos
- ✅ **Auditável** - rastreabilidade completa com `raw_payload` e `source_api`
- ✅ **Derivado exclusivamente de webhooks** - `source_api = 'webhook'`

---

## 📊 FLUXO DE DADOS FINANCEIROS

```
Hotmart Webhook (evento de venda/reembolso)
       │
       ▼
┌─────────────────────────────────────────┐
│ hotmart-webhook/index.ts                │
│                                         │
│ 1. Parse commissions[] do payload       │
│    - MARKETPLACE → platform_fee         │
│    - PRODUCER → credit (owner net)      │
│    - AFFILIATE → affiliate              │
│    - CO_PRODUCER → coproducer           │
│                                         │
│ 2. Para REFUNDS/CHARGEBACKS:            │
│    - Valores são NEGATIVOS              │
│    - Se não houver commissions,         │
│      herda do evento original           │
│                                         │
│ 3. Grava em finance_ledger              │
│    (append-only, imutável)              │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ finance_ledger (tabela)                 │
│                                         │
│ - id (UUID)                             │
│ - project_id                            │
│ - transaction_id                        │
│ - event_type (credit/refund/chargeback) │
│ - actor_type (producer/platform/etc)    │
│ - amount (positivo ou negativo)         │
│ - occurred_at                           │
│ - source_api = 'webhook'                │
│ - raw_payload (comissão original)       │
│                                         │
│ UNIQUE: (provider, transaction_id,      │
│         event_type, actor_type,         │
│         actor_id, amount, occurred_at)  │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ finance_ledger_summary (view)           │
│                                         │
│ Agregação por transaction_id:           │
│ - producer_gross                        │
│ - affiliate_cost                        │
│ - coproducer_cost                       │
│ - platform_cost                         │
│ - refunds                               │
│ - net_revenue (calculado)               │
└─────────────────────────────────────────┘
```

---

## 💰 MAPEAMENTO DE COMMISSIONS

| Source Hotmart  | event_type     | actor_type   | Descrição                     |
|-----------------|----------------|--------------|-------------------------------|
| `MARKETPLACE`   | `platform_fee` | `platform`   | Taxa Hotmart                  |
| `PRODUCER`      | `credit`       | `producer`   | "Você recebeu" (owner net)    |
| `CO_PRODUCER`   | `coproducer`   | `coproducer` | Comissão de coprodutor        |
| `AFFILIATE`     | `affiliate`    | `affiliate`  | Comissão de afiliado          |

---

## 🔄 TRATAMENTO DE REFUNDS/CHARGEBACKS

### Cenário 1: Refund COM commissions no payload
```json
{
  "event": "PURCHASE_REFUNDED",
  "data": {
    "commissions": [
      { "source": "PRODUCER", "value": 27.11 }
    ]
  }
}
```
**Resultado:** Gravado como `amount: -27.11` (negativo)

### Cenário 2: Refund SEM commissions no payload
```json
{
  "event": "PURCHASE_REFUNDED",
  "data": {
    "commissions": []
  }
}
```
**Resultado:** 
1. Sistema busca valores originais no `finance_ledger` pela `transaction_id`
2. Cria entradas sintéticas com valores NEGATIVOS herdados
3. Grava no ledger para manter a consistência

---

## 🚫 O QUE FOI DESATIVADO

### hotmart-api/index.ts
- ❌ Removida chamada para `batchWriteSalesCoreEvents()`
- ❌ API não escreve mais valores financeiros
- ✅ Apenas metadados comerciais e mapeamentos de ofertas

### hotmart-financial-sync/index.ts
- ❌ Função completamente desativada (HTTP 410 Gone)
- ❌ Não escreve mais no `finance_ledger`
- ✅ Mensagem de depreciação clara

### hotmart-backfill/index.ts
- ❌ `net_amount` sempre = 0 (intencionalmente)
- ✅ Apenas para reconstrução de histórico comercial
- ⚠️ Dados financeiros reais vêm apenas de webhooks

---

## ✅ VALIDAÇÃO

### Verificar entradas no ledger
```sql
SELECT 
  transaction_id,
  event_type,
  actor_type,
  amount,
  source_api,
  occurred_at
FROM finance_ledger
WHERE project_id = 'YOUR_PROJECT_ID'
  AND source_api = 'webhook'
ORDER BY occurred_at DESC
LIMIT 20;
```

### Verificar refunds com valores herdados
```sql
SELECT 
  fl.transaction_id,
  SUM(CASE WHEN fl.event_type = 'credit' THEN fl.amount ELSE 0 END) as credits,
  SUM(CASE WHEN fl.event_type = 'refund' THEN fl.amount ELSE 0 END) as refunds,
  SUM(fl.amount) as net_balance
FROM finance_ledger fl
WHERE fl.project_id = 'YOUR_PROJECT_ID'
GROUP BY fl.transaction_id
HAVING SUM(CASE WHEN fl.event_type = 'refund' THEN 1 ELSE 0 END) > 0
ORDER BY fl.transaction_id;
```

### Verificar integridade do ledger
```sql
-- Não deve haver source_api diferente de 'webhook'
SELECT DISTINCT source_api, COUNT(*)
FROM finance_ledger
WHERE project_id = 'YOUR_PROJECT_ID'
GROUP BY source_api;

-- Esperado: apenas 'webhook'
```

---

## 📝 ARQUIVOS MODIFICADOS

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/hotmart-webhook/index.ts` | Adicionada escrita direta em `finance_ledger` |
| `supabase/functions/hotmart-api/index.ts` | Removida escrita financeira |
| `supabase/functions/hotmart-financial-sync/index.ts` | Depreciada (HTTP 410) |
| `supabase/functions/hotmart-backfill/index.ts` | `net_amount = 0` forçado |

---

## 🔮 PRÓXIMOS PASSOS

1. **Importação de CSV do Ledger Hotmart** - Para reconciliação com extrato oficial
2. **Alertas de Discrepância** - Quando ledger != extrato Hotmart
3. **Dashboard de Auditoria** - Visualização de entradas do ledger por transação
