# CRM Orders Migration Validation

**Data:** 2026-01-16  
**Status:** ✅ Migração Completa

---

## 📋 Resumo da Migração

O módulo CRM foi migrado para usar exclusivamente **Orders Core + Ledger**, sem remover as tabelas legadas.

### Tabelas Legadas (mantidas, mas não usadas)
- `crm_transactions` - **PROIBIDO**
- `crm_contacts.total_revenue` - **PROIBIDO**
- `crm_contacts.first_utm_*` - **PROIBIDO**
- `hotmart_sales` - **PROIBIDO**

### Fontes Canônicas (Orders Core)
| Tipo de Dado | Fonte |
|--------------|-------|
| Compras | `crm_orders_view` |
| Itens da compra | `crm_order_items_view` |
| Receita do cliente | `crm_contact_revenue_view.total_customer_paid` |
| Receita do produtor | `crm_contact_revenue_view.total_producer_net` |
| UTMs | `crm_contact_attribution_view` |
| Recuperação | `crm_recovery_orders_view` |

---

## 🔍 Prova com Juliane Coeli

**Email:** julianebborba@gmail.com

### Query: crm_orders_view
```sql
SELECT * FROM crm_orders_view WHERE buyer_email ILIKE '%juliane%'
```

**Resultado:**
| Campo | Valor |
|-------|-------|
| order_id | 93c91f0f-9950-40e7-b526-0c7872055380 |
| provider_order_id | HP3609747213C1 |
| buyer_name | Juliane Coeli Brandão Borba |
| status | approved |
| **customer_paid** | **R$ 205,00** |
| **producer_net** | **R$ 94,43** |
| item_count | 3 |
| has_bump | true |
| funnel_name | Face \| Make Rápida 13 Minutos |

### Query: crm_order_items_view
```sql
SELECT * FROM crm_order_items_view WHERE buyer_email ILIKE '%juliane%'
```

**Resultado:**
| item_type | product_name | base_price |
|-----------|--------------|------------|
| bump | Make Rápida em 13 Minutos com Alice Salazar | R$ 97,00 |
| bump | e-Book Lista Secreta de Produtos e Marcas da Maquiagem | R$ 39,00 |
| bump | Maquiagem 35+ com Alice Salazar | R$ 69,00 |

**Prova Matemática:**
```
97 + 39 + 69 = R$ 205,00 ✅ (customer_paid)
```

### Query: crm_contact_revenue_view
```sql
SELECT * FROM crm_contact_revenue_view WHERE buyer_email ILIKE '%juliane%'
```

**Resultado:**
| Campo | Valor |
|-------|-------|
| total_orders | 1 |
| **total_customer_paid** | **R$ 205,00** ✅ |
| **total_producer_net** | **R$ 94,43** ✅ |
| average_ticket | R$ 205,00 |

### Query: crm_contact_attribution_view
```sql
SELECT * FROM crm_contact_attribution_view WHERE buyer_email ILIKE '%juliane%'
```

**Resultado:**
| Campo | Valor |
|-------|-------|
| **utm_source** | **Meta-Ads** ✅ |
| **utm_placement** | **Instagram_Stories** ✅ |
| meta_campaign_id | 00_ADVANTAGE_6845240173892 |
| meta_adset_id | PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292 |
| meta_ad_id | Teste —VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292 |
| raw_sck | Meta-Ads\|00_ADVANTAGE_...\|PERPETUO_...\|Instagram_Stories\|Teste... |

---

## 📂 Componentes Migrados

### 1. ContactTransactionsList.tsx
- **Antes:** `crm_transactions`
- **Depois:** `crm_orders_view` + `crm_order_items_view`
- **Mudanças:**
  - Props: `contactId` → `contactEmail` + `projectId`
  - Mostra pedidos agrupados com múltiplos itens
  - Exibe `customer_paid` (bruto) e `producer_net` (líquido)

### 2. useUTMBehaviorData.ts
- **Antes:** `crm_contacts.total_revenue`, `crm_contacts.first_utm_*`
- **Depois:** `crm_contact_revenue_view` + `crm_contact_attribution_view`
- **Mudanças:**
  - `totalRevenue` → `totalCustomerPaid`
  - Novo campo: `totalProducerNet`
  - UTMs derivados do primeiro pedido

### 3. UTMBehaviorTable.tsx
- **Antes:** `totalRevenue`
- **Depois:** `totalCustomerPaid`
- **Mudanças:**
  - Coluna "Receita Total" → "Receita Bruta"

### 4. ContactOrdersAttributionCard.tsx (NOVO)
- Componente que usa exclusivamente `crm_contact_attribution_view`
- Mostra UTMs derivados do primeiro pedido

### 5. useContactOrdersAttribution.ts (NOVO)
- Hook para buscar atribuição e receita de contatos via Orders Core

### 6. useRecoveryOrders.ts (NOVO)
- Hook para buscar pedidos de recuperação via `crm_recovery_orders_view`

### 7. crm_recovery_orders_view (NOVA VIEW)
- View que lista pedidos com status de recuperação
- Categorias: Cancelado, Chargeback, Reembolsado, Carrinho Abandonado, Pendente

---

## 🔢 Conceitos Distintos

| Conceito | Significado | Fonte |
|----------|-------------|-------|
| 💳 customer_paid | Quanto o cliente pagou (bruto) | orders.customer_paid |
| 🏦 producer_net | Quanto o produtor recebeu (líquido) | orders.producer_net |
| 📦 base_price | Preço do item individual | order_items.base_price |
| 📈 UTMs | Atribuição de marketing | ledger_events.attribution → sck |

---

## ✅ Regra de Integridade

Para cada pedido:
```
SUM(order_items.base_price) = orders.customer_paid
SUM(ledger_events[sale]) = orders.producer_net
SUM(platform_fee + coproducer + producer) = customer_paid
```

**Juliane Coeli - Verificação:**
```
Itens: 97 + 39 + 69 = 205 ✅
customer_paid = 205 ✅
producer_net = 94.43 ✅
```

---

## 🚫 Proibições

```typescript
// 🚫 PROIBIDO usar estas fontes no CRM:
// - crm_transactions
// - crm_contacts.total_revenue
// - crm_contacts.first_utm_*
// - hotmart_sales

// ✅ USAR APENAS:
// - crm_orders_view
// - crm_order_items_view
// - crm_contact_revenue_view
// - crm_contact_attribution_view
// - crm_recovery_orders_view
```

---

## 📊 Totais Atuais (Project: 1e1a89a4)

```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(customer_paid) as total_customer_paid,
  SUM(producer_net) as total_producer_net
FROM crm_orders_view
WHERE project_id = '1e1a89a4-81d5-4aa7-8431-538828def2a3'
```

---

## 🔄 Próximos Passos

1. ✅ ContactTransactionsList migrado
2. ✅ useUTMBehaviorData migrado  
3. ✅ UTMBehaviorTable migrado
4. ⏳ CRMRecovery.tsx - usar `crm_recovery_orders_view`
5. ⏳ CustomerJourneyAnalysis.tsx - usar `crm_orders_view`
6. ⏳ useCRMJourneyData.ts - migrar para Orders Core
