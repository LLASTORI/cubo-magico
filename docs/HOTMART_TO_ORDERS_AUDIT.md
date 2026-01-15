# HOTMART → ORDERS AUDIT (PROMPT 2)

## Status: ✅ SHADOW MODE ATIVO

Data: 2026-01-15

---

## Implementação

### 1. `resolveHotmartOrderId(payload)`

Função utilitária que resolve o Order ID estável:

```typescript
function resolveHotmartOrderId(payload: any): string | null {
  // Priority 1: order.id (Hotmart V3)
  if (data?.order?.id) return String(data.order.id);
  
  // Priority 2: Para bumps, usar parent transaction
  if (purchase?.order_bump?.is_order_bump && purchase?.order_bump?.parent_purchase_transaction) {
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  // Priority 3: purchase.transaction (mais comum)
  if (purchase?.transaction) return purchase.transaction;
  
  // Priority 4: purchase.code (fallback)
  if (purchase?.code) return purchase.code;
  
  return null;
}
```

### 2. Fluxo de Dados

```
Hotmart Webhook
       │
       ▼
┌─────────────────────────────────────────┐
│         hotmart-webhook/index.ts        │
│  ┌───────────────────────────────────┐  │
│  │   writeOrderShadow()              │  │
│  │   ┌────────────────────────────┐  │  │
│  │   │ 1. UPSERT orders           │  │  │
│  │   │ 2. CREATE order_items      │  │  │
│  │   │ 3. CREATE ledger_events    │  │  │
│  │   │ 4. FILL provider_order_map │  │  │
│  │   └────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3. Mapeamento de Campos

#### `orders`

| Campo | Origem Hotmart |
|-------|----------------|
| provider | `'hotmart'` |
| provider_order_id | `resolveHotmartOrderId(payload)` |
| buyer_email | `buyer.email` |
| buyer_name | `buyer.name` |
| status | `hotmartToOrderStatus[event]` |
| currency | `purchase.price.currency_value` |
| customer_paid | `purchase.full_price.value` (convertido para BRL) |
| gross_base | `SUM(order_items.base_price)` |
| producer_net | Comissão PRODUCER |
| raw_payload | payload completo |

#### `order_items`

| Campo | Origem Hotmart |
|-------|----------------|
| order_id | FK orders |
| provider_product_id | `product.id` |
| provider_offer_id | `purchase.offer.code` |
| product_name | `product.name` |
| offer_name | `purchase.offer.name` |
| item_type | `resolveItemType()` → main/bump/upsell/downsell |
| base_price | `purchase.price.value` |
| quantity | 1 |

#### `ledger_events`

| event_type | Origem | amount |
|------------|--------|--------|
| `sale` | PRODUCER | + (positivo) |
| `platform_fee` | MARKETPLACE | - (negativo) |
| `affiliate` | AFFILIATE | - (negativo) |
| `coproducer` | CO_PRODUCER ou auto-calculado | - (negativo) |
| `refund` | PRODUCER em evento de reembolso | - (negativo) |

---

## Validação com Venda Real: Juliane Coeli

### Dados da Venda

```
Transaction ID: HP08417459380
Buyer: Juliane Coeli
Product: Make Prática 13M
Gross (customer_paid): R$ 39,00
```

### Query de Verificação - Orders

```sql
SELECT 
  o.id,
  o.provider_order_id,
  o.buyer_email,
  o.buyer_name,
  o.status,
  o.customer_paid,
  o.gross_base,
  o.producer_net
FROM orders o
WHERE o.provider = 'hotmart'
  AND o.buyer_name ILIKE '%Juliane%';
```

**Resultado Esperado:**
```
customer_paid = 39.00
gross_base = 39.00
producer_net = 17.75
```

### Query de Verificação - Ledger Events

```sql
SELECT 
  le.event_type,
  le.actor,
  le.amount,
  le.currency
FROM ledger_events le
JOIN orders o ON o.id = le.order_id
WHERE o.provider = 'hotmart'
  AND o.buyer_name ILIKE '%Juliane%'
ORDER BY le.event_type;
```

**Resultado Esperado:**
```
| event_type   | actor      | amount  |
|--------------|------------|---------|
| coproducer   | coproducer | -17.75  |
| platform_fee | platform   | -3.50   |
| sale         | producer   | +17.75  |
```

### Query de Verificação - Order Items

```sql
SELECT 
  oi.product_name,
  oi.item_type,
  oi.base_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.provider = 'hotmart'
  AND o.buyer_name ILIKE '%Juliane%';
```

**Resultado Esperado:**
```
| product_name    | item_type | base_price |
|-----------------|-----------|------------|
| Make Prática 13M| main      | 39.00      |
```

### Prova Matemática

```
customer_paid (39.00)
  - platform_fee (3.50)
  - coproducer (17.75)
  - affiliate (0.00)
  = producer_net (17.75) ✅
```

---

## Backfill 14 Dias

### Edge Function

`hotmart-orders-backfill-14d`

```bash
# Executar via curl
curl -X POST \
  https://jcbzwxgayxrnxlgmmlni.supabase.co/functions/v1/hotmart-orders-backfill-14d \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "YOUR_PROJECT_ID"}'
```

### Resposta Esperada

```json
{
  "success": true,
  "projectId": "...",
  "eventsProcessed": 150,
  "ordersCreated": 120,
  "ordersUpdated": 30,
  "itemsCreated": 125,
  "ledgerEventsCreated": 350,
  "mappingsCreated": 120,
  "errors": 0
}
```

---

## Queries de Auditoria

### 1. Comparar totais Orders vs Hotmart Sales

```sql
WITH orders_totals AS (
  SELECT 
    COUNT(*) as order_count,
    SUM(customer_paid) as total_customer_paid,
    SUM(producer_net) as total_producer_net
  FROM orders
  WHERE provider = 'hotmart'
    AND project_id = 'YOUR_PROJECT_ID'
    AND ordered_at >= NOW() - INTERVAL '14 days'
),
hotmart_totals AS (
  SELECT 
    COUNT(*) as sale_count,
    SUM(total_price_brl) as total_gross,
    SUM(net_revenue) as total_net
  FROM hotmart_sales
  WHERE project_id = 'YOUR_PROJECT_ID'
    AND sale_date >= NOW() - INTERVAL '14 days'
)
SELECT 
  o.order_count,
  h.sale_count,
  o.total_customer_paid,
  h.total_gross,
  o.total_producer_net,
  h.total_net
FROM orders_totals o, hotmart_totals h;
```

### 2. Verificar Ledger Events por Tipo

```sql
SELECT 
  le.event_type,
  le.actor,
  COUNT(*) as count,
  SUM(le.amount) as total_amount
FROM ledger_events le
JOIN orders o ON o.id = le.order_id
WHERE o.project_id = 'YOUR_PROJECT_ID'
  AND o.provider = 'hotmart'
GROUP BY le.event_type, le.actor
ORDER BY le.event_type;
```

### 3. Verificar Integridade Matemática

```sql
SELECT 
  o.id,
  o.provider_order_id,
  o.customer_paid,
  o.producer_net,
  COALESCE(SUM(CASE WHEN le.event_type = 'platform_fee' THEN ABS(le.amount) ELSE 0 END), 0) as platform_fee,
  COALESCE(SUM(CASE WHEN le.event_type = 'affiliate' THEN ABS(le.amount) ELSE 0 END), 0) as affiliate_cost,
  COALESCE(SUM(CASE WHEN le.event_type = 'coproducer' THEN ABS(le.amount) ELSE 0 END), 0) as coproducer_cost,
  o.customer_paid - 
    COALESCE(SUM(CASE WHEN le.event_type = 'platform_fee' THEN ABS(le.amount) ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN le.event_type = 'affiliate' THEN ABS(le.amount) ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN le.event_type = 'coproducer' THEN ABS(le.amount) ELSE 0 END), 0) as calculated_net,
  CASE 
    WHEN ABS(o.producer_net - (
      o.customer_paid - 
      COALESCE(SUM(CASE WHEN le.event_type = 'platform_fee' THEN ABS(le.amount) ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN le.event_type = 'affiliate' THEN ABS(le.amount) ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN le.event_type = 'coproducer' THEN ABS(le.amount) ELSE 0 END), 0)
    )) < 0.01 THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as validation
FROM orders o
LEFT JOIN ledger_events le ON le.order_id = o.id
WHERE o.project_id = 'YOUR_PROJECT_ID'
  AND o.provider = 'hotmart'
GROUP BY o.id, o.provider_order_id, o.customer_paid, o.producer_net
HAVING o.customer_paid IS NOT NULL
ORDER BY o.ordered_at DESC
LIMIT 20;
```

---

## O Que NÃO Foi Alterado

Este PROMPT 2 apenas adiciona shadow mode. **Nada existente foi modificado:**

- ❌ CRM - não alterado
- ❌ Funis - não alterados
- ❌ Dashboards - não alterados
- ❌ `finance_ledger` - continua funcionando
- ❌ `sales_core_events` - continua funcionando
- ❌ `hotmart_sales` - continua funcionando

O sistema antigo continua como source of truth.
O novo sistema (Orders Core) está em modo shadow, apenas recebendo dados em paralelo.

---

## Próximos Prompts

| Prompt | Objetivo |
|--------|----------|
| ~~PROMPT 1~~ | ✅ Criar chassi Orders Core |
| ~~PROMPT 2~~ | ✅ Hotmart → Orders (Shadow Mode) |
| PROMPT 3 | Backfill histórico completo |
| PROMPT 4 | Migrar views de análise |
| PROMPT 5 | Migrar CRM |
| PROMPT 6 | Migrar Funis |
| PROMPT 7 | Deprecar tabelas antigas |
