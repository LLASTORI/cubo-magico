# CUBO ORDERS CORE - Sistema Financeiro Canônico

## Status: ✅ CHASSI CRIADO (PROMPT 1)

Data: 2026-01-15

---

## Conceito Fundamental

> **Uma venda NÃO é uma linha.**  
> **Uma venda é um ORDER com vários ITEMS e vários EVENTOS FINANCEIROS.**

---

## Tabelas Criadas

### 1. `orders` - Pedidos Canônicos

Representa um pedido completo (pode ter múltiplos items).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | |
| project_id | UUID (FK projects) | |
| provider | TEXT | hotmart, stripe, meta, etc |
| provider_order_id | TEXT | ID do pedido na plataforma |
| buyer_email | TEXT | |
| buyer_name | TEXT | |
| contact_id | UUID (FK crm_contacts) | |
| status | TEXT | pending, approved, completed, refunded, chargeback, cancelled |
| currency | TEXT | BRL default |
| customer_paid | NUMERIC | Quanto o cliente pagou (com parcelamento, juros etc) |
| gross_base | NUMERIC | Soma dos preços base dos items |
| producer_net | NUMERIC | Quanto o produtor recebeu (líquido final) |
| ordered_at | TIMESTAMPTZ | Quando o pedido foi feito |
| approved_at | TIMESTAMPTZ | Quando foi aprovado |
| completed_at | TIMESTAMPTZ | Quando foi concluído |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| raw_payload | JSONB | Dados brutos para debug |

**Unique:** `(project_id, provider, provider_order_id)`

---

### 2. `order_items` - Items do Pedido

Items individuais dentro de um pedido (produtos, bumps, upsells).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | |
| order_id | UUID (FK orders) | |
| provider_product_id | TEXT | ID do produto na plataforma |
| provider_offer_id | TEXT | ID da oferta na plataforma |
| product_name | TEXT | |
| offer_name | TEXT | |
| item_type | TEXT | main, bump, upsell, downsell, addon |
| funnel_position | TEXT | front, middle, back |
| base_price | NUMERIC | Preço base do item |
| quantity | INT | |
| funnel_id | UUID (FK funnels) | Mapeamento interno |
| offer_mapping_id | UUID (FK offer_mappings) | Mapeamento interno |
| created_at | TIMESTAMPTZ | |
| metadata | JSONB | |

---

### 3. `ledger_events` - Eventos Financeiros

Eventos financeiros granulares (taxas, splits, afiliados, etc).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | |
| order_id | UUID (FK orders) | |
| project_id | UUID (FK projects) | |
| provider | TEXT | hotmart, stripe, meta, etc |
| event_type | TEXT | sale, refund, chargeback, platform_fee, affiliate, coproducer, tax, payout |
| actor | TEXT | producer, affiliate, coproducer, platform, tax_authority |
| actor_name | TEXT | Nome do afiliado/coprodutor se aplicável |
| amount | NUMERIC | Positivo = receita, negativo = custo |
| currency | TEXT | BRL default |
| provider_event_id | TEXT | ID do evento na plataforma |
| occurred_at | TIMESTAMPTZ | Quando o evento ocorreu |
| created_at | TIMESTAMPTZ | |
| raw_payload | JSONB | |

---

### 4. `provider_order_map` - Mapeamento de Transações

Mapeamento de transaction_id do provider para order_id interno.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | |
| project_id | UUID (FK projects) | |
| provider | TEXT | |
| provider_transaction_id | TEXT | ID da transação na plataforma |
| order_id | UUID (FK orders) | |
| created_at | TIMESTAMPTZ | |

**Unique:** `(project_id, provider, provider_transaction_id)`

---

## View Shadow

### `orders_view_shadow`

Agregação de orders com breakdown de custos do ledger.

```sql
SELECT
  o.*,
  SUM(CASE WHEN le.event_type='platform_fee' THEN le.amount ELSE 0 END) as platform_fee,
  SUM(CASE WHEN le.event_type='affiliate' THEN le.amount ELSE 0 END) as affiliate_cost,
  SUM(CASE WHEN le.event_type='coproducer' THEN le.amount ELSE 0 END) as coproducer_cost,
  SUM(CASE WHEN le.event_type='tax' THEN le.amount ELSE 0 END) as tax_cost,
  SUM(CASE WHEN le.event_type='refund' THEN le.amount ELSE 0 END) as refund_amount,
  SUM(CASE WHEN le.event_type='chargeback' THEN le.amount ELSE 0 END) as chargeback_amount,
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
FROM orders o
LEFT JOIN ledger_events le ON le.order_id = o.id
GROUP BY o.id;
```

**⚠️ NÃO USADA AINDA** - apenas preparação.

---

## Arquitetura de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROVIDER (Hotmart, Stripe, etc)            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                           WEBHOOK                               │
│                    (hotmart-webhook, etc)                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
           ┌────────────┐ ┌────────────┐ ┌────────────────┐
           │   orders   │ │order_items │ │ ledger_events  │
           │            │ │            │ │                │
           │ 1 pedido   │ │ N items    │ │ N eventos      │
           │            │ │ (main,bump │ │ (fees,splits,  │
           │            │ │  upsell)   │ │  refunds)      │
           └────────────┘ └────────────┘ └────────────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │    orders_view_shadow      │
                    │  (agregação com custos)    │
                    └────────────────────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │   UI / Funis / CRM / AI    │
                    └────────────────────────────┘
```

---

## Event Types em `ledger_events`

| event_type | Descrição | amount |
|------------|-----------|--------|
| `sale` | Venda principal | + (receita bruta) |
| `platform_fee` | Taxa da plataforma (Hotmart) | - |
| `affiliate` | Comissão do afiliado | - |
| `coproducer` | Comissão do coprodutor | - |
| `tax` | Impostos retidos | - |
| `refund` | Reembolso | - |
| `chargeback` | Contestação de cobrança | - |
| `payout` | Saque/repasse | (informativo) |

---

## Item Types em `order_items`

| item_type | Descrição |
|-----------|-----------|
| `main` | Produto principal do pedido |
| `bump` | Order bump (addon no checkout) |
| `upsell` | Upsell pós-compra |
| `downsell` | Downsell após recusar upsell |
| `addon` | Addon genérico |

---

## Regra de Ouro 🏆

> **Nenhuma UI, Funil, CRM ou Dashboard pode usar `hotmart_sales` ou `sales_core_events` para dinheiro depois que Orders estiver ativo.**
> 
> **Todos os valores financeiros devem vir de `orders_view` (ou `orders_view_shadow`).**

---

## O Que NÃO Foi Alterado

Este PROMPT 1 criou apenas o chassi. **Nada existente foi modificado:**

- ❌ `hotmart-webhook` - não alterado
- ❌ CRM - não alterado
- ❌ Funis - não alterado
- ❌ Dashboards - não alterados
- ❌ `finance_ledger` - não alterado
- ❌ `sales_core_events` - não alterado
- ❌ `hotmart_sales` - não alterado

---

## Próximos Prompts

| Prompt | Objetivo |
|--------|----------|
| PROMPT 2 | Criar webhook writer para popular orders |
| PROMPT 3 | Backfill de dados históricos |
| PROMPT 4 | Migrar views de análise para orders_view |
| PROMPT 5 | Migrar CRM para orders |
| PROMPT 6 | Migrar Funis para orders |
| PROMPT 7 | Deprecar hotmart_sales e sales_core_events |

---

## RLS Policies

Todas as tabelas têm RLS habilitado com políticas que verificam:
- Usuário é dono do projeto (`projects.user_id = auth.uid()`)
- OU usuário é membro do projeto (`project_members`)

---

## Validação

```sql
-- Verificar estrutura criada
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'order_items', 'ledger_events', 'provider_order_map');

-- Verificar view
SELECT * FROM orders_view_shadow LIMIT 1;

-- Contar (deve ser 0 inicialmente)
SELECT 
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM order_items) as items,
  (SELECT COUNT(*) FROM ledger_events) as events;
```

---

## Suporta Cenários

✅ Hotmart vendas simples  
✅ Hotmart com order bump  
✅ Hotmart com upsell/downsell  
✅ Hotmart com afiliado  
✅ Hotmart com coprodutor  
✅ Hotmart com parcelamento  
✅ Combos (múltiplos produtos)  
✅ Reembolsos parciais  
✅ Chargebacks  
✅ Múltiplas plataformas futuras (Stripe, etc)
