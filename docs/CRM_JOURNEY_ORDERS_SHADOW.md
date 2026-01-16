# CRM Journey → Orders Core: Shadow Migration

**Data:** 2026-01-16  
**Status:** ✅ Shadow Implementado  
**Próximo:** PROMPT 18 - Substituir LTV

---

## 📋 Resumo Executivo

A migração shadow da Jornada do Cliente foi implementada com sucesso. Agora existem **duas jornadas paralelas**:

| Jornada | Fonte | Status |
|---------|-------|--------|
| Legado | `crm_transactions` | ❌ Transitório (não remover ainda) |
| Canônica | `orders` + `order_items` | ✅ Shadow Read-only |

---

## 🗃️ Views SQL Criadas

### 1. `crm_journey_orders_view`

View canônica onde **1 pedido = 1 evento de jornada**.

```sql
CREATE OR REPLACE VIEW crm_journey_orders_view AS
SELECT 
  o.id as order_id,
  o.provider_order_id,
  o.project_id,
  c.id as contact_id,
  COALESCE(c.name, o.buyer_name) as contact_name,
  o.buyer_email as contact_email,
  o.ordered_at,
  COALESCE(o.customer_paid, 0) as customer_paid,
  COALESCE(o.producer_net, 0) as producer_net,
  o.currency,
  o.provider,
  o.utm_source,
  o.utm_campaign,
  o.utm_adset,
  o.utm_placement,
  o.utm_creative,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::int as items_count,
  o.status,
  -- Produtos como JSONB array
  (SELECT jsonb_agg(...) FROM order_items oi WHERE oi.order_id = o.id) as products_detail,
  -- Produto principal
  (SELECT oi.product_name FROM order_items oi WHERE ...) as main_product_name,
  (SELECT oi.funnel_id FROM order_items oi WHERE ...) as main_funnel_id,
  -- Sequência na jornada
  ROW_NUMBER() OVER (PARTITION BY o.buyer_email, o.project_id ORDER BY o.ordered_at) as purchase_sequence
FROM orders o
LEFT JOIN crm_contacts c ON c.email = o.buyer_email AND c.project_id = o.project_id
WHERE o.status = 'approved';
```

### 2. `crm_contact_journey_metrics_view`

Métricas agregadas por contato.

```sql
CREATE OR REPLACE VIEW crm_contact_journey_metrics_view AS
SELECT 
  j.project_id,
  j.contact_id,
  j.contact_email,
  MAX(j.contact_name) as contact_name,
  COUNT(DISTINCT j.order_id) as total_orders,
  SUM(j.customer_paid) as total_customer_paid,
  SUM(j.producer_net) as total_producer_net,
  MIN(j.ordered_at) as first_order_at,
  MAX(j.ordered_at) as last_order_at,
  CASE WHEN COUNT(DISTINCT j.order_id) > 1 THEN true ELSE false END as is_repeat_customer,
  -- Primeiro e último produto
  (...) as first_product,
  (...) as last_product,
  (...) as first_utm_source
FROM crm_journey_orders_view j
GROUP BY j.project_id, j.contact_id, j.contact_email;
```

---

## 🧪 Prova: Juliane Coeli

### Email: `julianebborba@gmail.com`

### Comparação Direta

| Fonte | Resultado |
|-------|-----------|
| **Nova View (Orders Core)** | **1 pedido** · 3 produtos · R$ 205,00 · `purchase_sequence: 1` |
| **CRM Legado (crm_transactions)** | 3 transações separadas (inflação 3x) |

### Dados da Nova View

```json
{
  "order_id": "93c91f0f-9950-40e7-b526-0c7872055380",
  "provider_order_id": "HP3609747213C1",
  "contact_email": "julianebborba@gmail.com",
  "contact_name": "Juliane Coeli Brandão Borba",
  "customer_paid": 205,
  "producer_net": 94.43,
  "items_count": 3,
  "utm_source": "Meta-Ads",
  "purchase_sequence": 1,
  "products_detail": [
    {"item_type": "bump", "product_name": "Make Rápida em 13 Minutos...", "base_price": 97},
    {"item_type": "bump", "product_name": "e-Book Lista Secreta...", "base_price": 39},
    {"item_type": "bump", "product_name": "Maquiagem 35+ com Alice Salazar", "base_price": 69}
  ]
}
```

### Dados do CRM Legado

```
id: 16fe6e21... | product_name: Maquiagem 35+ | R$ 69,00 | APPROVED
id: 3e09a348... | product_name: Make Rápida   | R$ 97,00 | APPROVED
id: 97fbd11d... | product_name: e-Book Lista  | R$ 39,00 | APPROVED
```

**Conclusão:** A nova view mostra corretamente **1 evento com 3 produtos**, enquanto o legado mostra **3 eventos separados**.

---

## 🪝 Hook Shadow

### Arquivo: `src/hooks/useCRMJourneyOrders.ts`

```typescript
/**
 * REGRA CANÔNICA DE JORNADA:
 * - 1 pedido (orders) = 1 evento de jornada
 * - Order items são detalhes, não eventos
 * - Ledger não cria eventos de jornada
 * - CRM legacy (useCRMJourneyData) é transitório
 */

export function useCRMJourneyOrders(contactEmail?: string): UseCRMJourneyOrdersResult {
  // Consome crm_journey_orders_view
  // Retorna journeyEvents, contactMetrics, summary
}
```

### Interfaces Principais

```typescript
interface JourneyOrderEvent {
  order_id: string;
  provider_order_id: string;
  contact_id: string | null;
  contact_email: string;
  ordered_at: string;
  customer_paid: number;
  producer_net: number;
  items_count: number;
  products: JourneyOrderItem[];
  purchase_sequence: number;
  is_first_purchase: boolean;
  // UTMs, funil, etc.
}

interface JourneyOrderItem {
  item_type: 'main' | 'bump' | 'upsell';
  product_name: string;
  base_price: number;
  funnel_id: string | null;
}
```

---

## 🎨 Componente UI Shadow

### Arquivo: `src/components/crm/CustomerJourneyOrders.tsx`

```typescript
/**
 * SHADOW COMPONENT: CustomerJourneyOrders
 * 
 * Exibe a jornada canônica baseada em Orders Core.
 * DO NOT REMOVE LEGACY (CustomerJourneyAnalysis) YET.
 */

export function CustomerJourneyOrders({ contactEmail }: Props) {
  const { journeyEvents, summary } = useCRMJourneyOrders(contactEmail);
  
  return (
    <Card>
      {/* Summary cards */}
      {/* Lista de pedidos com produtos expandíveis */}
    </Card>
  );
}
```

### Características

- Badge "1ª Compra" para primeiro pedido
- Badge "X produtos" para pedidos com múltiplos items
- Produtos expandíveis com tipo (Principal, Bump, Upsell)
- UTMs de atribuição visíveis
- Link para cartão do contato

---

## 📜 Regra Canônica (Contrato Arquitetural)

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
║                                                                  ║
║  5. Contagem de Compras = COUNT(DISTINCT orders)                ║
║                                                                  ║
║  6. Produto Subsequente = pedido posterior no tempo             ║
║     - Não inclui bumps/upsells do mesmo pedido                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 📊 Critérios para Desligar Jornada Legado

A jornada antiga (`crm_transactions` / `useCRMJourneyData`) poderá ser removida quando:

1. ✅ `crm_journey_orders_view` criada e validada
2. ✅ Hook `useCRMJourneyOrders` funcionando
3. ✅ Componente `CustomerJourneyOrders` implementado
4. ✅ Prova com caso real (Juliane Coeli)
5. ⏳ **LTV migrado para Orders Core** (PROMPT 18)
6. ⏳ **Todas as telas do CRM usando novo hook**
7. ⏳ **Deploy em produção por 7+ dias sem incidentes**

---

## 📁 Arquivos Criados/Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `crm_journey_orders_view` | View SQL | Jornada canônica (1 pedido = 1 evento) |
| `crm_contact_journey_metrics_view` | View SQL | Métricas agregadas por contato |
| `src/hooks/useCRMJourneyOrders.ts` | Hook | Consome views shadow |
| `src/components/crm/CustomerJourneyOrders.tsx` | Componente | UI para jornada canônica |
| `docs/CRM_JOURNEY_ORDERS_SHADOW.md` | Doc | Este documento |

---

## 🚫 O que NÃO foi alterado

- ❌ `useCRMJourneyData.ts` (legado intacto)
- ❌ `CustomerJourneyAnalysis.tsx` (legado intacto)
- ❌ Cálculos de LTV (será PROMPT 18)
- ❌ Nenhuma tela de produção modificada

---

## 🔜 Próximos Passos

| Prompt | Objetivo |
|--------|----------|
| **PROMPT 18** | Migrar cálculo de LTV para Orders Core |
| **PROMPT 19** | Substituir CustomerJourneyAnalysis pelo novo componente |
| **PROMPT 20** | Deprecar `crm_transactions` e hooks legados |

---

## ✅ Checklist Shadow Migration

- [x] View `crm_journey_orders_view` criada
- [x] View `crm_contact_journey_metrics_view` criada
- [x] Hook `useCRMJourneyOrders` implementado
- [x] Componente `CustomerJourneyOrders` implementado
- [x] Prova com Juliane Coeli validada
- [x] Documentação completa
- [x] Regra canônica documentada
- [x] CRM legado intacto
