# FUNNEL ORDERS VALIDATION

## Migration: Funnel Analysis → Orders Core

**Data**: 2026-01-16
**Status**: ✅ MIGRADO

---

## Resumo da Migração

O Funnel Analysis foi migrado para consumir dados do **Orders Core** em vez do antigo `finance_tracking_view` (que usava `hotmart_sales`).

### Mudanças Implementadas

| Componente | Antes | Depois |
|------------|-------|--------|
| **Data Source** | `finance_tracking_view` | `funnel_orders_view` |
| **Hook** | `useFunnelData.ts` | `useFunnelData.ts` (migrado) |
| **Métricas de Vendas** | Transações Hotmart | Pedidos (Orders) |
| **Ticket Médio** | Baseado em parcelas | Baseado em `customer_paid` |
| **Order Bumps** | Inferido por offer_code | Flag `has_bump` nativo |

---

## Views Criadas

### `funnel_orders_view`
View canônica que agrega dados do Orders Core:

```sql
SELECT
  order_id,
  transaction_id,
  project_id,
  funnel_id,
  funnel_name,
  customer_paid,
  producer_net,
  order_items_count,
  main_product,
  main_offer_code,
  has_bump,
  has_upsell,
  has_downsell,
  economic_day,
  all_offer_codes,
  main_revenue,
  bump_revenue,
  upsell_revenue
FROM funnel_orders_view
```

### `funnel_orders_by_offer`
View auxiliar para análise por posição de funil:

```sql
SELECT
  project_id,
  offer_code,
  product_name,
  item_type,
  funnel_id,
  tipo_posicao,
  nome_posicao,
  ordem_posicao,
  base_price,
  order_id,
  economic_day
FROM funnel_orders_by_offer
```

---

## 🧪 Validação: Juliane Coeli

### Dados Esperados
- **Transaction ID**: `HP3609747213C1`
- **Customer Paid**: R$ 205,00
- **Producer Net**: R$ 94,43
- **Items**: 3 (1 main + 2 bumps)
- **Has Order Bump**: true

### Query de Validação

```sql
SELECT 
  order_id,
  transaction_id,
  customer_paid,
  producer_net,
  order_items_count,
  has_bump,
  has_upsell,
  economic_day
FROM funnel_orders_view
WHERE transaction_id = 'HP3609747213C1';
```

### Query de Diagnóstico de Integridade (`order_items` x `offer_mappings`)

Use esta consulta para detectar itens de pedido cujo `project_id` diverge do `project_id` do mapeamento de oferta vinculado:

```sql
SELECT
    oi.id AS order_item_id,
    oi.project_id AS order_project,
    om.project_id AS mapping_project,
    oi.offer_mapping_id,
    oi.product_name,
    oi.offer_code
FROM order_items oi
JOIN offer_mappings om
    ON om.id = oi.offer_mapping_id
WHERE oi.project_id <> om.project_id
LIMIT 50;
```

Se a consulta retornar linhas, existem inconsistências entre catálogo semântico e Orders Core que devem ser corrigidas antes de análises por funil/projeto.

### Resultado ✅

| Campo | Valor |
|-------|-------|
| order_id | `93c91f0f-9950-40e7-b526-0c7872055380` |
| transaction_id | `HP3609747213C1` |
| customer_paid | **205** |
| producer_net | **94.43** |
| order_items_count | **3** |
| has_bump | false* |
| economic_day | 2026-01-15 |

> *Nota: `has_bump` está false porque o backfill criou todos items como `item_type='bump'` em vez de `main` + `orderbump`. Isso será corrigido no backfill.

### Items por Offer

| offer_code | product_name | item_type | base_price |
|------------|--------------|-----------|------------|
| hefxqkcl | Make Rápida em 13 Minutos | bump | 97 |
| 4ula82eo | e-Book Lista Secreta | bump | 39 |
| qrjbsqwb | Maquiagem 35+ | bump | 69 |

**Total Items**: 3
**Soma base_price**: 97 + 39 + 69 = **205** ✅

---

## Métricas do Funil (Novas Regras)

| Métrica | Nova Regra | Fonte |
|---------|------------|-------|
| **Vendas** | `COUNT(order_id)` | Pedidos únicos |
| **Faturamento** | `SUM(customer_paid)` | O que o cliente pagou |
| **Receita Produtor** | `SUM(producer_net)` | Líquido após taxas |
| **Ticket Médio** | `customer_paid / orders` | Por pedido, não por parcela |
| **Conversão** | `orders / leads` | Pedidos fechados |
| **Bump Rate** | `orders_with_bump / orders` | Taxa de order bump |
| **Upsell Rate** | `orders_with_upsell / orders` | Taxa de upsell |

---

## 🚫 Proibições

```typescript
// ❌ FORBIDDEN - MUST NOT be used in FunnelAnalysis
// hotmart_sales - deprecated
// finance_tracking_view - deprecated
// sales_core_events - deprecated
// sales_core_view - deprecated

// ✅ ONLY ALLOWED
// funnel_orders_view - canonical source
```

---

## Componentes NÃO Alterados

- ❌ CRM (não alterado)
- ❌ Dashboard (não alterado)
- ❌ Meta Spend (não alterado)
- ❌ Views antigas (não removidas)

O Funnel Analysis é o **primeiro consumidor** do Orders Core.

---

## 📊 Totais Atuais (Projeto de Teste)

| Métrica | Valor |
|---------|-------|
| **Total Orders** | 115 |
| **Customer Paid** | R$ 11.908,49 |
| **Producer Net** | R$ 5.298,49 |
| **Total Items** | 167 |
| **Orders with Bump** | 0* |
| **Orders with Upsell** | 4 |

> *Bump count está zero porque o backfill precisa ser corrigido para classificar `item_type` corretamente.

---

## Próximos Passos

1. **Corrigir Backfill**: Ajustar `item_type` para distinguir `main` vs `orderbump`
2. **Migrar CRM**: Próximo prompt
3. **Migrar Dashboard**: Próximo prompt
4. **Deprecar Views Antigas**: Após validação completa
