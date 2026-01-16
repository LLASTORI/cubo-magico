# CRM Orders Shadow Core — Validation

> **Status**: ✅ VALIDATED  
> **Data**: 2026-01-16  
> **Objetivo**: Camada canônica de CRM baseada 100% em Orders + Ledger

---

## 🚫 Regra de Ouro

```
This CRM view is 100% Orders + Ledger. Legacy CRM tables are forbidden.
```

**Proibido nas views CRM Shadow:**
- ❌ `hotmart_sales`
- ❌ `crm_transactions`
- ❌ `crm_contacts`

---

## 📊 Views Criadas

### 1️⃣ `crm_orders_view`
Uma linha por pedido (orders):

| Campo | Descrição |
|-------|-----------|
| `order_id` | UUID do pedido |
| `project_id` | Projeto |
| `provider_order_id` | ID transação Hotmart |
| `buyer_email` | Email comprador |
| `buyer_name` | Nome completo |
| `ordered_at` | Data do pedido |
| `approved_at` | Data aprovação |
| `status` | Status (approved/completed) |
| `customer_paid` | Valor pago pelo cliente |
| `producer_net` | Líquido produtor |
| `item_count` | Quantidade de itens |
| `has_bump` | Tem order bump? |
| `has_upsell` | Tem upsell? |
| `funnel_id` | UUID funil (via offer_mappings) |
| `funnel_name` | Nome do funil |

### 2️⃣ `crm_order_items_view`
Uma linha por item do pedido:

| Campo | Descrição |
|-------|-----------|
| `item_id` | UUID do item |
| `order_id` | UUID do pedido |
| `project_id` | Projeto |
| `buyer_email` | Email comprador |
| `buyer_name` | Nome completo |
| `item_type` | main / bump / upsell / downsell |
| `product_name` | Nome do produto |
| `provider_product_id` | ID produto Hotmart |
| `provider_offer_id` | Código oferta Hotmart |
| `base_price` | Preço base do item |
| `funnel_id` | UUID funil |
| `funnel_name` | Nome do funil |

### 3️⃣ `crm_contact_revenue_view`
Uma linha por contato (agregado):

| Campo | Descrição |
|-------|-----------|
| `project_id` | Projeto |
| `buyer_email` | Email (lowercase) |
| `buyer_name` | Nome mais recente |
| `total_orders` | Total de pedidos |
| `total_customer_paid` | Total pago |
| `total_producer_net` | Total líquido |
| `first_purchase_at` | Primeira compra |
| `last_purchase_at` | Última compra |
| `average_ticket` | Ticket médio |

### 4️⃣ `crm_contact_attribution_view`
Atribuição baseada no primeiro pedido:

| Campo | Descrição |
|-------|-----------|
| `project_id` | Projeto |
| `buyer_email` | Email (lowercase) |
| `buyer_name` | Nome |
| `first_order_at` | Data primeiro pedido |
| `utm_source` | Fonte (Meta-Ads, etc) |
| `meta_campaign_id` | ID campanha Meta |
| `meta_adset_id` | ID adset Meta |
| `utm_placement` | Posicionamento |
| `meta_ad_id` | ID anúncio Meta |
| `raw_sck` | SCK completo |
| `raw_xcod` | XCOD completo |

---

## ✅ Validação — Juliane Coeli Brandão Borba

### Dados do Pedido

| Campo | Valor |
|-------|-------|
| **Email** | julianebborba@gmail.com |
| **Transação** | HP3609747213C1 |
| **Data** | 2026-01-15 16:12:59 |
| **Status** | approved |

### Prova Matemática

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOMER_PAID (Cliente pagou)                                  │
│  = 97 + 39 + 69 = R$ 205,00 ✅                                  │
├─────────────────────────────────────────────────────────────────┤
│  PRODUCER_NET (Líquido produtor)                                │
│  = R$ 94,43 ✅                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ITEM_COUNT                                                     │
│  = 3 itens ✅                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Items do Pedido

| # | Produto | Tipo | Preço | Oferta |
|---|---------|------|-------|--------|
| 1 | Make Rápida em 13 Minutos com Alice Salazar | bump | R$ 97 | hefxqkcl |
| 2 | e-Book Lista Secreta de Produtos e Marcas | bump | R$ 39 | 4ula82eo |
| 3 | Maquiagem 35+ com Alice Salazar | bump | R$ 69 | qrjbsqwb |

**Total Items**: 97 + 39 + 69 = **R$ 205,00** ✅

### Revenue View

| Campo | Valor |
|-------|-------|
| `total_orders` | 1 |
| `total_customer_paid` | R$ 205,00 |
| `total_producer_net` | R$ 94,43 |
| `average_ticket` | R$ 205,00 |

### Attribution View (UTMs)

| Campo | Valor |
|-------|-------|
| `utm_source` | Meta-Ads |
| `meta_campaign_id` | 00_ADVANTAGE_6845240173892 |
| `meta_adset_id` | PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292 |
| `utm_placement` | Instagram_Stories |
| `meta_ad_id` | Teste —VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292 |

### SCK Completo
```
Meta-Ads|00_ADVANTAGE_6845240173892|PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292|Instagram_Stories|Teste —VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292
```

### Funil Identificado
```
Funil: Face | Make Rápida 13 Minutos
ID: d186a8a8-67ae-4fee-a365-bf0d6221dc45
```

---

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORDERS + LEDGER CORE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   orders ──────┬──────────────────────────────────────────────┐ │
│                │                                              │ │
│   order_items ─┴──► crm_orders_view                           │ │
│        │            (1 linha/pedido)                          │ │
│        │                                                      │ │
│        └──────────► crm_order_items_view                      │ │
│                     (1 linha/item)                            │ │
│                                                               │ │
│   orders ──────────► crm_contact_revenue_view                 │ │
│   (GROUP BY email)   (1 linha/contato)                        │ │
│                                                               │ │
│   orders ──────────► crm_contact_attribution_view             │ │
│   (first order)      (UTMs do 1º pedido)                      │ │
│                                                               │ │
└───────────────────────────────────────────────────────────────┘

🚫 PROIBIDO: hotmart_sales, crm_transactions, crm_contacts
```

---

## 🔒 Segurança

As views herdam RLS do schema `orders`:
- Acesso restrito por `project_id`
- Verificação via `project_members` ou owner

---

## 📝 Próximos Passos

1. ⏳ Migrar CRM hooks para usar `crm_orders_view`
2. ⏳ Criar `useCRMOrdersData.ts` hook
3. ⏳ Deprecar uso de `crm_transactions` nos componentes
4. ⏳ Corrigir `item_type` no backfill (todos como 'bump')

---

## 📊 Queries de Validação

```sql
-- Pedidos por projeto
SELECT project_id, COUNT(*) as orders, SUM(customer_paid) as revenue
FROM crm_orders_view
GROUP BY project_id;

-- Top contatos por receita
SELECT buyer_email, total_orders, total_customer_paid
FROM crm_contact_revenue_view
ORDER BY total_customer_paid DESC
LIMIT 10;

-- Atribuição por fonte
SELECT utm_source, COUNT(*) as contacts
FROM crm_contact_attribution_view
WHERE utm_source IS NOT NULL AND utm_source != ''
GROUP BY utm_source;
```

---

**Criado em**: 2026-01-16  
**Versão**: 1.0
