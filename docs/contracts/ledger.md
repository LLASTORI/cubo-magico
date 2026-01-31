# Contrato: Ledger

**Versão:** 2.0  
**Data:** 2026-01-31  
**Status:** ✅ Ativo  
**Domínio:** Contabilidade Financeira BRL

---

## 1. DEFINIÇÃO

O **Ledger** é o sistema de contabilidade transacional do Cubo Mágico.

Ele registra **todos os eventos financeiros** de forma imutável e auditável.

### ⚠️ REGRA DE OURO v2.0

**O Ledger APENAS contém valores BRL REAIS liquidados pela Hotmart.**

---

## 2. TABELA PRINCIPAL

### `ledger_events`

```sql
CREATE TABLE ledger_events (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  order_id UUID NOT NULL,
  transaction_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_name TEXT,
  
  -- LEGACY (mantido para compatibilidade)
  amount NUMERIC NOT NULL,           -- Valor contábil com sinal
  currency TEXT DEFAULT 'BRL',
  
  -- NOVOS CAMPOS BRL (v2.0)
  amount_brl NUMERIC,                -- Valor BRL REAL (fonte de verdade)
  amount_accounting NUMERIC,         -- Valor contábil original (USD/MXN)
  currency_accounting TEXT,          -- Moeda do valor contábil
  conversion_rate NUMERIC,           -- Taxa de conversão (se aplicável)
  source_type TEXT DEFAULT 'legacy', -- native_brl | converted | blocked | legacy
  
  -- METADADOS
  provider_event_id TEXT,
  occurred_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. REGRAS CANÔNICAS v2.0

### 🔒 REGRA 1: Apenas BRL Real

O campo `amount_brl` é a **única fonte de verdade financeira**.

O campo `amount` (legacy) é mantido apenas para compatibilidade.

### 🔒 REGRA 2: Valores Contábeis ≠ Caixa

`commissions[].value` (USD/MXN) é dado **CONTÁBIL** e **NÃO representa caixa**.

Nunca usar `amount` diretamente para cálculos de receita líquida.

### 🔒 REGRA 3: Fonte de Conversão

Sempre que existir `currency_conversion.converted_value`, ele é a fonte.

```typescript
// CORRETO
const brl = commission.currency_conversion?.converted_value;

// INCORRETO
const brl = commission.value * someRate;  // ❌ NUNCA!
```

### 🔒 REGRA 4: Sem Conversão Manual

Nenhuma conversão manual é permitida.

Se o webhook não fornecer conversão, o evento NÃO entra no ledger.

### 🔒 REGRA 5: Decisão B (Plataforma Internacional)

Para pedidos internacionais onde `MARKETPLACE` não possui `currency_conversion`:

| Ação | Descrição |
|------|-----------|
| ❌ NÃO gerar evento | Não criar `platform_fee` |
| ❌ NÃO calcular | Não usar taxa do producer |
| ❌ NÃO estimar | Nenhum valor aproximado |
| ✅ Marcar status | `ledger_status = 'partial'` |

---

## 4. IMUTABILIDADE

### 🔒 O Ledger é IMUTÁVEL

| Regra | Descrição |
|-------|-----------|
| ❌ Nunca deletar eventos | Histórico deve ser preservado |
| ❌ Nunca modificar eventos existentes | Apenas inserções |
| ✅ Correções via eventos compensatórios | Novo evento com valor inverso |

---

## 5. TIPOS DE EVENTOS

| `event_type` | Descrição | `amount_brl` | Sinal |
|--------------|-----------|--------------|-------|
| `sale` | Venda aprovada (producer) | BRL real | + |
| `platform_fee` | Taxa de plataforma | BRL real | - |
| `affiliate` | Comissão de afiliado | BRL real | - |
| `coproducer` | Comissão de coprodução | BRL real | - |
| `refund` | Reembolso | BRL real | - |
| `chargeback` | Contestação | BRL real | - |
| `chargeback_reversal` | Reversão de chargeback | BRL real | + |

---

## 6. SOURCE_TYPE (Origem do BRL)

| `source_type` | Descrição | Conversão |
|---------------|-----------|-----------|
| `native_brl` | Pedido doméstico | `amount = amount_brl` |
| `converted` | Pedido internacional | `currency_conversion.converted_value` |
| `blocked` | Sem conversão disponível | `amount_brl = NULL` |
| `legacy` | Migrado de sistema anterior | Auditoria necessária |

---

## 7. LEDGER STATUS (Cobertura)

Materializado em `orders.ledger_status`:

| Status | Descrição |
|--------|-----------|
| `complete` | Todos os eventos têm BRL válido |
| `partial` | Alguns eventos bloqueados (ex: platform_fee intl) |
| `pending` | Aguardando processamento |
| `blocked` | Dados insuficientes para gerar ledger |

---

## 8. CAMPOS MATERIALIZADOS EM ORDERS

Para performance e UI, valores BRL são materializados:

| Campo | Descrição |
|-------|-----------|
| `orders.producer_net_brl` | Valor líquido do produtor em BRL |
| `orders.platform_fee_brl` | Taxa de plataforma em BRL |
| `orders.affiliate_brl` | Comissão de afiliado em BRL |
| `orders.coproducer_brl` | Comissão de coprodução em BRL |
| `orders.tax_brl` | Impostos em BRL |
| `orders.ledger_status` | Status de cobertura |

---

## 9. VALIDAÇÃO FINANCEIRA

### Golden Rule

Para pedidos `complete`:

```
customer_paid_brl - platform_fee_brl - affiliate_brl - coproducer_brl - tax_brl 
= producer_net_brl (± R$ 0.02)
```

### Estado Inválido

Pedido com status `approved`/`complete` SEM `ledger_events` = **ESTADO INVÁLIDO**.

---

## 10. FLUXO DE INGESTÃO

```
┌─────────────────────────────────────────────────────────────┐
│                    WEBHOOK HOTMART                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  extractBrlFromCommission()  │
          │  Para cada commission:       │
          └──────────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  native_brl  │ │  converted   │ │   blocked    │
│  currency=BRL│ │  has c_conv  │ │  no c_conv   │
│  amount_brl= │ │  amount_brl= │ │  amount_brl= │
│  comm.value  │ │  c_conv.val  │ │  NULL        │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
   [CREATE]         [CREATE]      [SKIP EVENT]
   ledger_event     ledger_event   Decision B
       │                │                │
       └────────────────┴────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  determineLedgerStatus()     │
          │  complete | partial | blocked│
          └──────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  UPDATE orders SET           │
          │    ledger_status,            │
          │    platform_fee_brl,         │
          │    affiliate_brl,            │
          │    coproducer_brl            │
          └──────────────────────────────┘
```

---

## 11. HIERARQUIA DE AUTORIDADE

```
1. Webhook (tempo real) → Autoridade máxima
2. provider_event_log → Backup para reconstrução
3. CSV (replay histórico) → Nunca sobrescreve webhook
```

---

## 12. EDGE FUNCTIONS

| Função | Responsabilidade |
|--------|------------------|
| `hotmart-webhook` | Criação de eventos em tempo real (v2.0 BRL) |
| `hotmart-ledger-brl-backfill` | Reconstrução com lógica BRL v2.0 |
| `hotmart-ledger-full-backfill` | Backfill legacy (deprecated) |

---

## 13. LIMITES TÉCNICOS

| Operação | Limite |
|----------|--------|
| Leitura de eventos | 1.000 por página |
| Inserção de ledger_events | 100 por lote |
| Filtros `.in()` | 50 IDs por chunk |

---

## 14. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Deletar ledger_events | ERRO GRAVE |
| ❌ Modificar valores existentes | ERRO GRAVE |
| ❌ Criar ledger paralelo | ERRO GRAVE |
| ❌ Calcular financeiro fora do ledger | ERRO GRAVE |
| ❌ Usar `amount` para cálculos (v2.0) | ERRO GRAVE |
| ❌ Converter USD→BRL manualmente | ERRO GRAVE |
| ❌ Gerar evento sem `amount_brl` válido | ERRO GRAVE |

---

## 15. INVARIANTES

| Invariante | Descrição |
|------------|-----------|
| BRL-Only | `amount_brl` é a única fonte de verdade |
| Cobertura Explícita | `ledger_status` reflete cobertura real |
| Rastreabilidade | Todo evento tem `source_type` |
| Imutabilidade | Eventos nunca são alterados |
| Consistência | Soma de `amount_brl` = receita BRL |

---

*Este documento é a fonte oficial de verdade para o domínio de Contabilidade Financeira BRL (v2.0).*
