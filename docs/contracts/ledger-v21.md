# Contrato: Ledger BRL v2.1 (Integração Contábil CSV)

**Versão:** 2.1  
**Data:** 2026-02-02  
**Status:** ✅ Ativo  
**Domínio:** Contabilidade Financeira BRL + Reconciliação CSV

---

## 1. DEFINIÇÃO

O **Ledger v2.1** estende o sistema de contabilidade transacional v2.0 com suporte a:

1. **Webhook Hotmart** = fonte operacional (tempo real)
2. **CSV Hotmart** = fonte contábil de fechamento (accounting)

O CSV **complementa** dados do webhook, especialmente em vendas internacionais onde a decomposição não está disponível via API.

---

## 2. NOVOS CAMPOS

### `ledger_events`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `source_origin` | TEXT | `'webhook'` ou `'csv'` |
| `confidence_level` | TEXT | `'real'` (webhook) ou `'accounting'` (CSV) |
| `reference_period` | DATE | Data de referência do CSV |

### `orders.ledger_status`

| Status | Descrição |
|--------|-----------|
| `complete` | Todos os eventos BRL existem via webhook |
| `partial` | Alguns eventos ausentes (ex: marketplace intl) |
| `pending` | Aguardando processamento |
| `blocked` | Dados insuficientes |
| `accounting_complete` | ✨ **NOVO** - Dados completos via CSV contábil |

---

## 3. REGRAS DE PRECEDÊNCIA

```
┌─────────────────────────────────────────────────────────────┐
│               HIERARQUIA DE AUTORIDADE                       │
├─────────────────────────────────────────────────────────────┤
│  1. CSV Contábil (accounting_complete) → Fechamento oficial │
│  2. Webhook (complete/partial) → Tempo real operacional     │
│  3. provider_event_log → Backup para reconstrução           │
└─────────────────────────────────────────────────────────────┘
```

### Regra de Ouro v2.1

Para métricas financeiras de custos e receita líquida:

```typescript
// INCLUIR ambos os status válidos
const validOrders = orders.filter(o => 
  o.ledger_status === 'complete' || 
  o.ledger_status === 'accounting_complete'
);
```

---

## 4. FLUXO DE IMPORTAÇÃO CSV

```
┌─────────────────────────────────────────────────────────────┐
│                    CSV HOTMART                               │
│              (Modelo Detalhado de Vendas)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  csv-ledger-v21-import       │
          │  Edge Function               │
          └──────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ledger_events│ │    orders    │ │ledger_official│
│ source='csv' │ │  *_brl cols  │ │ reconciliação │
│ conf='accnt' │ │ ledger_status│ │               │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## 5. CAMPOS CRIADOS VIA CSV

Para cada transação importada:

| Evento | amount_brl | Sinal |
|--------|------------|-------|
| `sale` | gross_value | + |
| `platform_fee` | platform_fee | - |
| `affiliate` | affiliate_commission | - |
| `coproducer` | coproducer_commission | - |
| `tax` | taxes | - |

Campos materializados em `orders`:
- `producer_net_brl`
- `platform_fee_brl`
- `affiliate_brl`
- `coproducer_brl`
- `tax_brl`
- `ledger_status = 'accounting_complete'`

---

## 6. REGRAS DE AUDITORIA

| Regra | Descrição |
|-------|-----------|
| CSV nunca apaga webhook | Apenas complementa |
| CSV não sobrescreve | Se evento CSV já existe, pula |
| Tudo rastreável | `source_origin` identifica origem |
| `reference_period` | Data do CSV para fechamento |

---

## 7. EDGE FUNCTION

### `csv-ledger-v21-import`

**Parâmetros:**
```json
{
  "project_id": "uuid",
  "rows": [
    {
      "transaction_id": "HP123...",
      "gross_value": 100.00,
      "net_value_brl": 72.50,
      "platform_fee": 15.00,
      "affiliate_commission": 10.00,
      "coproducer_commission": 0,
      "taxes": 2.50
    }
  ],
  "reference_period": "2026-02-01",
  "file_name": "vendas-janeiro.csv"
}
```

**Resposta:**
```json
{
  "success": true,
  "result": {
    "orders_processed": 50,
    "ledger_events_created": 150,
    "orders_updated_to_accounting_complete": 45,
    "errors": [],
    "totals": {
      "producer_net_brl": 3625.00,
      "platform_fee_brl": 750.00,
      "affiliate_brl": 500.00,
      "coproducer_brl": 0,
      "tax_brl": 125.00
    }
  }
}
```

---

## 8. AGREGAÇÕES NO DASHBOARD

### Receita Bruta
```sql
SUM(orders.customer_paid)
-- SEM filtro de ledger_status
-- Representa dinheiro real pago pelo cliente
```

### Receita Líquida e Custos
```sql
SUM(orders.producer_net_brl)
WHERE ledger_status IN ('complete', 'accounting_complete')
```

---

## 9. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Converter USD→BRL manualmente | ERRO GRAVE |
| ❌ Estimar taxas ausentes | ERRO GRAVE |
| ❌ Sobrescrever eventos webhook | ERRO GRAVE |
| ❌ Apagar eventos via CSV | ERRO GRAVE |
| ❌ Usar source_origin inconsistente | ERRO GRAVE |

---

## 10. INVARIANTES

| Invariante | Descrição |
|------------|-----------|
| BRL-Only | `amount_brl` é a única fonte de verdade |
| Origem Explícita | Todo evento tem `source_origin` |
| Imutabilidade | Eventos nunca são alterados |
| CSV Complementar | CSV só adiciona, nunca substitui |
| Auditoria Total | `reference_period` + `file_name` rastreáveis |

---

*Este documento é a fonte oficial de verdade para o domínio de Contabilidade Financeira BRL v2.1.*
