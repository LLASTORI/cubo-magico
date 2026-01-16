# CRM Journey → Orders Core: Auditoria Forense

**Data:** 2026-01-16  
**Status:** 🔍 Auditoria Completa  
**Próximo:** PROMPT 17 - Migração Shadow

---

## 📋 Resumo Executivo

A Jornada do Cliente no CRM **trabalha no nível de transação** (`crm_transactions`), enquanto o Orders Core **trabalha no nível de pedido** (`orders` + `order_items`).

**Resultado:** Inflação sistemática de "compras" e fragmentação conceitual.

---

## 🗺️ PASSO 1: Mapa Forense UI → Código → Dados

### 1.1 Componentes Envolvidos

| Componente | Arquivo | Função |
|------------|---------|--------|
| Jornada do Cliente | `CustomerJourneyAnalysis.tsx` | Página principal de análise |
| Hook de Dados | `useCRMJourneyData.ts` | Busca e processamento |
| Cartão de Contato | `CRMContactCard.tsx` | Detalhe do lead |
| Lista de Transações | `ContactTransactionsList.tsx` | **JÁ MIGRADO** para Orders Core |

### 1.2 Fluxo de Dados Atual

```
┌─────────────────────────────────────────────────────────────────┐
│                     CustomerJourneyAnalysis                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      useCRMJourneyData                          │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  crm_contacts  │  │ crm_transactions │  │  offer_mappings │  │
│  │     (legado)   │  │     (legado)     │  │                 │  │
│  └────────────────┘  └──────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    CustomerJourney[]
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        totalPurchases   totalSpent   subsequentProducts
        (INFLADO)        (correto)    (fragmentados)
```

### 1.3 Fontes de Dados (Problemáticas)

| Dado | Fonte Atual | Fonte Canônica |
|------|-------------|----------------|
| Eventos da jornada | `crm_transactions` | `orders` |
| Valor por evento | `total_price_brl` | `order_items.base_price` |
| LTV | `SUM(transactions)` | `orders.customer_paid` |
| Contagem de compras | `COUNT(transactions)` | `COUNT(orders)` |
| Produtos | `product_name` (1 por transação) | `order_items[]` (N por pedido) |

---

## 🔬 PASSO 2: Prova com Caso Real - Juliane Coeli

### Email: `julianebborba@gmail.com`

### 2.1 Visão Orders Core (Verdade Canônica)

```sql
SELECT * FROM orders WHERE buyer_email ILIKE '%juliane%borba%'
```

| Campo | Valor |
|-------|-------|
| order_id | `93c91f0f-9950-40e7-b526-0c7872055380` |
| provider_order_id | `HP3609747213C1` |
| status | `approved` |
| **customer_paid** | **R$ 205,00** |
| **producer_net** | **R$ 94,43** |
| **item_count** | **3** |

**Order Items:**

| item_type | product_name | base_price |
|-----------|--------------|------------|
| bump | Maquiagem 35+ com Alice Salazar | R$ 69,00 |
| bump | Make Rápida em 13 Minutos com Alice Salazar | R$ 97,00 |
| bump | e-Book Lista Secreta de Produtos... | R$ 39,00 |

**Total:** 69 + 97 + 39 = **R$ 205,00** ✅

### 2.2 Visão CRM Atual (Tabelas Legadas)

```sql
SELECT * FROM crm_transactions 
WHERE contact_id IN (SELECT id FROM crm_contacts WHERE email ILIKE '%juliane%borba%')
```

| id | product_name | total_price_brl | status |
|----|--------------|-----------------|--------|
| `16fe6e21...` | Maquiagem 35+ com Alice Salazar | R$ 69,00 | APPROVED |
| `3e09a348...` | Make Rápida em 13 Minutos... | R$ 97,00 | APPROVED |
| `97fbd11d...` | e-Book Lista Secreta... | R$ 39,00 | APPROVED |

```sql
SELECT * FROM crm_contacts WHERE email ILIKE '%juliane%borba%'
```

| Campo | Valor |
|-------|-------|
| total_purchases | **3** ❌ |
| total_revenue | R$ 205,00 ✅ |

### 2.3 Comparação Direta

| Métrica | Orders Core | CRM Atual | Divergência |
|---------|-------------|-----------|-------------|
| **Pedidos** | **1** | 3 | ❌ **INFLADO 3x** |
| **Compras exibidas** | 1 evento com 3 itens | 3 eventos separados | ❌ **FRAGMENTADO** |
| **Valor total** | R$ 205,00 | R$ 205,00 | ✅ Correto |
| **Produtos subsequentes** | 0 (mesmo pedido) | 2 (falso positivo) | ❌ **ERRO LÓGICO** |

### 2.4 Impacto na Análise

- **"Taxa de recompra"**: Juliane seria marcada como cliente com 3 compras
- **"Produtos subsequentes"**: 2 produtos apareceriam como "evolução de jornada"
- **"Tempo médio entre compras"**: Seria 0 dias (mesmo timestamp)

**Todos os 3 itens são do MESMO PEDIDO, comprados no mesmo momento.**

---

## 🧬 PASSO 3: Diagnóstico Conceitual

### 3.1 Pergunta: O CRM trabalha em transação, item ou pedido?

**Resposta: TRANSAÇÃO**

O hook `useCRMJourneyData.ts` usa `crm_transactions` como unidade primária:

```typescript
// Linha 208-249: Busca todas as transações
const { data: transactionsData } = useQuery({
  queryKey: ['crm-transactions', projectId, statusFilter],
  queryFn: async () => {
    // ...
    .from('crm_transactions')
    .select('id, contact_id, platform, external_id, product_name, offer_code, total_price_brl, status, transaction_date, funnel_id')
```

Cada linha de `crm_transactions` = 1 evento na jornada.

### 3.2 Pergunta: Isso é compatível com Orders Core?

**Resposta: NÃO**

| Aspecto | CRM Atual | Orders Core |
|---------|-----------|-------------|
| Unidade | Transação (1 produto) | Pedido (N produtos) |
| Granularidade | Item | Pedido |
| Bumps/Upsells | Compras separadas | Items do pedido |
| Contagem | `COUNT(transactions)` | `COUNT(orders)` |
| LTV | `SUM(total_price_brl)` | `SUM(customer_paid)` |

### 3.3 Pergunta: Onde ocorre inflação/fragmentação?

1. **Inflação de Compras**: Cada item do pedido vira uma "compra"
   - Juliane: 1 pedido → 3 "compras"
   - Projeto inteiro: 59 orders → 24.470 transactions (**414x inflação**)

2. **Fragmentação de Jornada**: Bumps aparecem como evolução
   - "Produto subsequente" falso: bump comprado junto ao principal

3. **Taxa de Recompra Artificial**: Cliente com 1 pedido tem "taxa de recompra"
   - `purchases.length > 1` = true (mesmo sendo 1 pedido)

---

## 📜 PASSO 4: Regra Canônica (Contrato Arquitetural)

### Regra Canônica de Jornada do Cliente

```
╔══════════════════════════════════════════════════════════════════╗
║            REGRA CANÔNICA DE JORNADA DO CLIENTE                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. 1 pedido (orders) = 1 evento de compra na jornada           ║
║                                                                  ║
║  2. Produtos (order_items) são detalhes do evento               ║
║     - item_type=main → produto principal                         ║
║     - item_type=bump → order bump (mesmo pedido)                ║
║     - item_type=upsell → upsell (mesmo checkout)                ║
║                                                                  ║
║  3. Ledger NUNCA cria eventos de jornada                        ║
║     - Ledger é financeiro, não comportamental                    ║
║                                                                  ║
║  4. LTV = SUM(orders.customer_paid)                             ║
║     - Valor bruto que o cliente pagou                            ║
║     - Alternativa: producer_net (líquido)                        ║
║                                                                  ║
║  5. Contagem de Compras = COUNT(DISTINCT orders)                ║
║     - Não confundir com count de items                           ║
║                                                                  ║
║  6. Produto Subsequente = pedido posterior no tempo             ║
║     - Não inclui bumps/upsells do mesmo pedido                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Interface Canônica (Proposta)

```typescript
interface CanonicalJourneyEvent {
  // Identificação
  order_id: string;
  provider_order_id: string;
  
  // Timing
  ordered_at: Date;
  
  // Valor
  customer_paid: number;  // Quanto o cliente pagou (bruto)
  producer_net: number;   // Quanto o produtor recebeu (líquido)
  
  // Produtos (detalhes do evento)
  items: {
    item_type: 'main' | 'bump' | 'upsell';
    product_name: string;
    offer_name: string;
    base_price: number;
    funnel_id: string | null;
  }[];
  
  // Atribuição
  utm_source: string | null;
  utm_campaign: string | null;
  funnel_id: string | null;  // Funil do produto principal
  
  // Status
  status: string;
  is_first_purchase: boolean;
}
```

---

## 🛠️ PASSO 5: Plano de Migração Shadow

### 5.1 Nova View Proposta: `crm_journey_orders_view`

```sql
-- View canônica para Jornada do Cliente
CREATE OR REPLACE VIEW crm_journey_orders_view AS
SELECT 
  -- Identificação do pedido
  o.id as order_id,
  o.provider_order_id,
  o.project_id,
  o.buyer_email,
  o.buyer_name,
  
  -- Timing
  o.ordered_at,
  
  -- Valores canônicos
  o.customer_paid,
  o.producer_net,
  
  -- Contagem de items
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
  
  -- Produto principal (primeiro item main ou qualquer)
  (SELECT oi.product_name 
   FROM order_items oi 
   WHERE oi.order_id = o.id 
   ORDER BY CASE oi.item_type WHEN 'main' THEN 0 WHEN 'bump' THEN 1 ELSE 2 END
   LIMIT 1) as main_product,
  
  -- Funil do produto principal
  (SELECT oi.funnel_id 
   FROM order_items oi 
   WHERE oi.order_id = o.id 
   ORDER BY CASE oi.item_type WHEN 'main' THEN 0 WHEN 'bump' THEN 1 ELSE 2 END
   LIMIT 1) as funnel_id,
  
  -- UTMs
  o.utm_source,
  o.utm_campaign,
  o.utm_medium,
  
  -- Status
  o.status,
  
  -- Ordenação para jornada
  ROW_NUMBER() OVER (
    PARTITION BY o.buyer_email, o.project_id 
    ORDER BY o.ordered_at
  ) as purchase_sequence

FROM orders o
WHERE o.status = 'approved';
```

### 5.2 View de Métricas do Contato: `crm_contact_journey_metrics_view`

```sql
CREATE OR REPLACE VIEW crm_contact_journey_metrics_view AS
SELECT 
  project_id,
  buyer_email,
  buyer_name,
  COUNT(DISTINCT order_id) as total_orders,  -- Corrigido: pedidos, não transações
  SUM(customer_paid) as total_customer_paid,
  SUM(producer_net) as total_producer_net,
  MIN(ordered_at) as first_order_at,
  MAX(ordered_at) as last_order_at,
  CASE WHEN COUNT(DISTINCT order_id) > 1 THEN true ELSE false END as is_repeat_customer
FROM crm_journey_orders_view
GROUP BY project_id, buyer_email, buyer_name;
```

### 5.3 Estratégia de Convivência

```
┌─────────────────────────────────────────────────────────────────┐
│                      Fase 1: Shadow Read                         │
├─────────────────────────────────────────────────────────────────┤
│  • Criar views novas (não alterar código)                       │
│  • Validar com queries paralelas                                 │
│  • Comparar números lado a lado                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fase 2: Hook Shadow                         │
├─────────────────────────────────────────────────────────────────┤
│  • Criar useCRMJourneyOrdersData (novo hook)                    │
│  • Não remover useCRMJourneyData (manter legado)                │
│  • Toggle para alternar entre eles                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fase 3: UI Migration                        │
├─────────────────────────────────────────────────────────────────┤
│  • CustomerJourneyAnalysis consome novo hook                    │
│  • Ajustar visualização (1 pedido = 1 evento)                   │
│  • Mostrar items como detalhes expandidos                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fase 4: Deprecação                          │
├─────────────────────────────────────────────────────────────────┤
│  • Remover useCRMJourneyData                                    │
│  • Marcar crm_transactions como deprecated                      │
│  • Atualizar documentação                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Critério de Remoção do Legado

A jornada antiga (`crm_transactions`) poderá ser removida quando:

1. ✅ `crm_journey_orders_view` criada e validada
2. ✅ Hook `useCRMJourneyOrdersData` funcionando
3. ✅ Prova com 3+ casos reais (Juliane + outros)
4. ✅ Métricas agregadas batem (total customers, avg LTV, repeat rate)
5. ✅ Zero referências ao hook antigo no código
6. ✅ Deploy em produção por 7+ dias sem incidentes

---

## 📊 Dados de Referência do Projeto

### Comparação de Volume

| Fonte | Total Rows | Unique Contacts |
|-------|------------|-----------------|
| `crm_transactions` (legado) | 24.470 | 14.753 |
| `orders` (canônico) | 59 | 57 |

⚠️ **Nota:** A diferença 24.470 vs 59 indica que a maioria dos dados em `crm_transactions` foi importada de CSV/backfill anterior ao Orders Core. O Orders Core tem apenas os pedidos recentes via webhook.

### Projeção de Impacto na Migração

Se todos os 24.470 transactions fossem consolidados em pedidos:
- Estimativa: ~8.000-10.000 pedidos únicos
- Redução de "compras" por contato: ~3x em média

---

## 🚫 Componentes JÁ Migrados (Não Tocar)

| Componente | Migração | Status |
|------------|----------|--------|
| `ContactTransactionsList.tsx` | `crm_orders_view` | ✅ Completo |
| `useContactOrdersAttribution.ts` | `crm_contact_attribution_view` | ✅ Completo |
| `ContactOrdersAttributionCard.tsx` | `crm_contact_attribution_view` | ✅ Completo |

---

## 📝 Próximos Passos (PROMPT 17)

1. **Criar views** `crm_journey_orders_view` e `crm_contact_journey_metrics_view`
2. **Criar hook** `useCRMJourneyOrdersData` (shadow, read-only)
3. **Validar** com 3 casos reais incluindo Juliane
4. **Não alterar** `useCRMJourneyData` ou `CustomerJourneyAnalysis` ainda

---

## ✅ Checklist de Auditoria

- [x] Mapeado UI → Hook → View → Tabela
- [x] Provado divergência com caso real (Juliane)
- [x] Diagnosticado problema conceitual (transação vs pedido)
- [x] Definida regra canônica
- [x] Proposto plano de migração shadow
- [x] Documentado critério de remoção do legado

---

*Documento gerado pela Auditoria Forense PROMPT 16*
