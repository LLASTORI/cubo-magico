# CRM Contact LTV Orders - Métricas Canônicas por Pedido

## Contexto

Este documento descreve a implementação das métricas canônicas de contato baseadas em **PEDIDOS** (Orders Core), em paralelo ao CRM legado que usa **transações**.

## Problema com o CRM Legado

O CRM atual calcula métricas baseadas em `crm_transactions`, o que causa:

1. **LTV inflado**: Um pedido com 3 produtos gera 3 transações → LTV multiplicado por 3
2. **Contagem de compras errada**: 1 pedido = 3 "compras" no legado
3. **Timeline distorcida**: 3 eventos onde deveria haver 1

## Solução Canônica

### Regra Fundamental

```
1 PEDIDO = 1 EVENTO DE COMPRA
Order items são detalhes do pedido, não eventos separados
```

### View SQL: `crm_contact_orders_metrics_view`

```sql
CREATE OR REPLACE VIEW public.crm_contact_orders_metrics_view AS
SELECT 
  c.id AS contact_id,
  c.email AS contact_email,
  c.name AS contact_name,
  c.project_id,
  
  -- Order counts
  COALESCE(COUNT(DISTINCT o.id), 0)::integer AS orders_count,
  COALESCE(COUNT(oi.id), 0)::integer AS items_count,
  
  -- Revenue metrics (canonical LTV)
  COALESCE(SUM(o.customer_paid), 0)::numeric AS total_customer_paid,
  COALESCE(SUM(o.producer_net), 0)::numeric AS total_producer_net,
  
  -- Average ticket (LTV / orders)
  CASE 
    WHEN COUNT(DISTINCT o.id) > 0 
    THEN ROUND((SUM(o.customer_paid) / COUNT(DISTINCT o.id))::numeric, 2)
    ELSE 0
  END AS avg_ticket,
  
  -- Order dates
  MIN(o.ordered_at) AS first_order_at,
  MAX(o.ordered_at) AS last_order_at,
  
  -- Days since last order
  CASE 
    WHEN MAX(o.ordered_at) IS NOT NULL 
    THEN EXTRACT(DAY FROM (NOW() - MAX(o.ordered_at)))::integer
    ELSE NULL
  END AS days_since_last_order,
  
  -- Repeat customer flag
  (COUNT(DISTINCT o.id) > 1) AS is_repeat_customer,
  
  -- Product info, UTM source, provider breakdown...

FROM crm_contacts c
LEFT JOIN orders o ON o.buyer_email = c.email AND o.project_id = c.project_id AND o.status = 'paid'
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id, c.email, c.name, c.project_id;
```

### Fontes de Dados

| ✅ Usar | ❌ Não usar |
|---------|-------------|
| `orders` | `crm_transactions` |
| `order_items` | `hotmart_sales` |
| `crm_contacts` | `ledger_events` |

## Prova de Conceito

### Exemplo Real: julianebborba@gmail.com

| Origem | Nº Compras | LTV | Ticket Médio |
|--------|------------|-----|--------------|
| CRM Legado | 3 | R$ 205,00 (distribuído) | - |
| Orders Core | 1 | R$ 615,00 (correto) | R$ 615,00 |

**Explicação**: O legado dividiu o valor entre as 3 transações. Orders Core reconhece que é 1 pedido com 3 produtos.

### Mais Casos Validados

| Email | Legacy Compras | Legacy LTV | Orders Count | Orders LTV |
|-------|----------------|------------|--------------|------------|
| letcramosa@gmail.com | 6 | R$ 638 | 1 | R$ 1.706,50 |
| renataccrolla@hotmail.com | 4 | R$ 279 | 1 | R$ 1.119,12 |
| rejane.calazans@gmail.com | 4 | R$ 194 | 1 | R$ 777,20 |
| livialimeira@gmail.com | 4 | R$ 194 | 1 | R$ 777,20 |

## Componentes

### Hook: `useCRMContactOrdersMetrics.ts`

```typescript
import { useCRMContactOrdersMetrics } from '@/hooks/useCRMContactOrdersMetrics';

const {
  metrics,
  isLoading,
  ordersCount,         // Número real de pedidos
  totalCustomerPaid,   // LTV canônico
  avgTicket,           // Ticket médio
  isRepeatCustomer,    // Cliente recorrente
  firstOrderAt,
  lastOrderAt,
  daysSinceLastOrder,
} = useCRMContactOrdersMetrics(contactId);
```

### UI: `ContactOrdersMetricsCard.tsx`

Componente exibido na página do contato com:
- Badge "beta" (identifica como nova funcionalidade)
- LTV canônico destacado em verde
- Número de pedidos (não transações)
- Ticket médio
- Badge "Recorrente" se aplicável
- Dias desde última compra com cores de risco
- Footer: "Baseado em pedidos · não em transações"

## Posição na UI

```
CRMContactCard
├── Header
├── Left Column (Tabs)
└── Right Column
    ├── Contact Info
    ├── Cognitive Profile
    ├── 🟦 Métricas por Pedido (beta) ← NOVO (canônico)
    ├── 🟥 Financeiro ← LEGADO (transitório)
    ├── Tags
    └── ...
```

## Critérios para Desligar LTV Legado

O card "Financeiro" (legado) poderá ser removido quando:

1. ✅ View canônica validada em produção
2. ✅ Hook shadow funcionando sem erros
3. ⏳ 30 dias de uso paralelo sem problemas
4. ⏳ Automações migradas para usar Orders Core
5. ⏳ Segmentação RFM migrada
6. ⏳ Aprovação do time

## Regras Canônicas (Documentar no Código)

```typescript
/**
 * REGRA CANÔNICA DE LTV
 * - LTV é calculado por pedido, não por item
 * - Orders Core é a única fonte válida
 * - CRM legado é transitório
 */
```

## Próximos Passos

- **PROMPT 19**: Migrar automações para Orders Core
- **PROMPT 20**: Desligar CRM legacy com segurança

## Histórico

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-16 | 1.0.0 | Criação da view e componentes shadow |
