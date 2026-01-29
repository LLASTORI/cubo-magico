# Contrato: Ledger

**Versão:** 1.0  
**Data:** 2026-01-29  
**Status:** ✅ Ativo  
**Domínio:** Contabilidade Financeira

---

## 1. DEFINIÇÃO

O **Ledger** é o sistema de contabilidade transacional do Cubo Mágico.

Ele registra **todos os eventos financeiros** de forma imutável e auditável.

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
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BRL',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. REGRA DE OURO (ABSOLUTA)

### 🔒 O Ledger é IMUTÁVEL

| Regra | Descrição |
|-------|-----------|
| ❌ Nunca deletar eventos | Histórico deve ser preservado |
| ❌ Nunca modificar eventos existentes | Apenas inserções |
| ✅ Correções via eventos compensatórios | Novo evento com valor inverso |

---

## 4. TIPOS DE EVENTOS

| `event_type` | Descrição | Sinal |
|--------------|-----------|-------|
| `sale` | Venda aprovada | + |
| `refund` | Reembolso | - |
| `chargeback` | Contestação | - |
| `chargeback_reversal` | Reversão de chargeback | + |
| `commission` | Comissão de afiliado | - |
| `fee` | Taxa de plataforma | - |

---

## 5. INTEGRIDADE FINANCEIRA

### 5.1 Contabilidade por Transação

Cada `transaction_id` individual deve ter seus próprios eventos de ledger.

```
Checkout com 2 itens:
├── Transaction A (Produto Principal)
│   └── ledger_event: sale +R$197
└── Transaction B (Order Bump)
    └── ledger_event: sale +R$47
```

### 5.2 Decomposição Financeira

Para cada venda aprovada, o sistema deve registrar:

| Campo | Descrição |
|-------|-----------|
| `gross_base` | Base econômica (sem juros) |
| `customer_paid` | Valor pago pelo cliente (com juros) |
| `platform_fee` | Taxa da plataforma |
| `affiliate_fee` | Comissão de afiliado |
| `coproducer_fee` | Comissão de coprodução |
| `producer_net` | Valor líquido do produtor |

### 5.3 Validação

```
producer_net = gross_base - platform_fee - affiliate_fee - coproducer_fee
```

Se `customer_paid > gross_base`, a diferença são juros de parcelamento.

---

## 6. POLÍTICA DE COBERTURA

### 🚨 ESTADO INVÁLIDO

Um pedido com status `approved` ou `complete` **SEM** `ledger_events` correspondentes é considerado **ESTADO INVÁLIDO DO SISTEMA**.

### Resolução

A edge function `hotmart-ledger-full-backfill` é o padrão para resolver lacunas, garantindo 100% de cobertura contábil.

---

## 7. FONTE DE DADOS

### Hierarquia de Autoridade

```
1. Webhook (tempo real) → Autoridade máxima
2. provider_event_log → Backup para reconstrução
3. CSV (replay histórico) → Nunca sobrescreve webhook
```

### Reconstrução de Ledger

Para backfill, utilizar `provider_event_log` como fonte:

```sql
SELECT * FROM provider_event_log
WHERE project_id = $1
AND event_type IN ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE')
AND NOT EXISTS (
  SELECT 1 FROM ledger_events le
  WHERE le.transaction_id = provider_event_log.transaction
);
```

---

## 8. LIMITES TÉCNICOS

### 8.1 Processamento em Lotes

| Operação | Limite |
|----------|--------|
| Leitura de eventos | 1.000 por página |
| Inserção de ledger_events | 100 por lote |
| Filtros `.in()` | 50 IDs por chunk |

### 8.2 Justificativa

Evitar timeouts e erros de limite de URI (PostgREST/Supabase).

---

## 9. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Deletar ledger_events | ERRO GRAVE |
| ❌ Modificar valores existentes | ERRO GRAVE |
| ❌ Criar ledger paralelo | ERRO GRAVE |
| ❌ Calcular financeiro fora do ledger | ERRO GRAVE |
| ❌ Usar offer_mappings como fonte financeira | ERRO GRAVE |

---

## 10. EDGE FUNCTIONS RELACIONADAS

| Função | Responsabilidade |
|--------|------------------|
| `hotmart-webhook` | Criação de eventos em tempo real |
| `hotmart-ledger-full-backfill` | Reconstrução de lacunas |
| `hotmart-orders-backfill-14d` | Backfill de pedidos recentes |
| `orders-full-backfill` | Backfill histórico completo |

---

## 11. VIEWS DEPENDENTES

O Ledger alimenta todas as views financeiras:

- `crm_customer_intelligence_overview`
- `crm_journey_orders_view`
- Dashboards de receita
- Análises de LTV, Ticket Médio, Recorrência

---

## 12. INVARIANTES

| Invariante | Descrição |
|------------|-----------|
| Cobertura 100% | Todo pedido aprovado tem eventos |
| Consistência | Soma do ledger = receita total |
| Rastreabilidade | Todo evento tem transaction_id |
| Imutabilidade | Eventos nunca são alterados |

---

*Este documento é a fonte oficial de verdade para o domínio de Contabilidade Financeira.*
