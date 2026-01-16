# 🔍 AUDITORIA PREMIUM MULTI-ÁREA — READ-ONLY

**Data da Auditoria:** 2026-01-16  
**Escopo:** `/dashboard`, `/launch-dashboard`, `/analise-mensal`  
**Status:** ⚠️ RISCOS IDENTIFICADOS

---

## 📋 SUMÁRIO EXECUTIVO

| Área | Status | Principal Problema |
|------|--------|-------------------|
| `/dashboard` (ProjectOverview) | 🟡 PARCIALMENTE MIGRADO | Usa `profit_daily` ✅ mas categorias usam `sales_core_events` |
| `/launch-dashboard` | 🔴 LEGADO | Usa `hotmart_sales.total_price_brl` = GROSS |
| `/analise-mensal` | 🔴 LEGADO | Usa `finance_tracking_view.gross_amount` = GROSS |

---

## 1️⃣ DASHBOARD (`/app/{project}/dashboard`)

### Fluxo de Dados
```
ProjectOverview.tsx
    ↓
useProjectOverview.ts
    ↓
┌─────────────────────────────────────────────────┐
│ profit_daily (VIEW) ✅                          │
│   - net_revenue                                 │
│   - ad_spend                                    │
│   - gross_revenue                               │
│   - platform_fees                               │
│                                                 │
│ sales_core_events (TABLE) ⚠️                    │
│   - Usado para categoryMetrics                  │
│   - net_amount para categorias                  │
│                                                 │
│ spend_daily (VIEW) ✅                           │
│   - ad_spend                                    │
└─────────────────────────────────────────────────┘
```

### Métricas Detalhadas

| Métrica | UI Label | Hook | View/Tabela | Campo | Tipo | Status |
|---------|----------|------|-------------|-------|------|--------|
| **Receita** | "Faturamento" | `useProjectOverview` | `profit_daily` | `net_revenue` | NET | ✅ OK |
| **Investimento** | "Investimento" | `useProjectOverview` | `profit_daily` | `ad_spend` | CORE | ✅ OK |
| **Lucro** | "Lucro" | `useProjectOverview` | `profit_daily` | `net_revenue - ad_spend` | NET | ✅ OK |
| **ROAS** | "ROAS" | `useProjectOverview` | `profit_daily` | `net_revenue / ad_spend` | NET | ✅ OK |
| **Vendas** | "Vendas" | `useProjectOverview` | `profit_daily` | `transaction_count` | CORE | ✅ OK |
| **Categorias** | "Faturamento por Categoria" | `useProjectOverview` | `sales_core_events` | `net_amount` | NET | ✅ OK |

### ✅ Aprovado com Observações
- Dashboard principal **MIGRADO** para `profit_daily` ✅
- Usa NET revenue corretamente ✅
- Categorias usam `sales_core_events.net_amount` ✅

---

## 2️⃣ LAUNCH DASHBOARD (`/app/{project}/launch-dashboard`)

### Fluxo de Dados
```
LaunchDashboard.tsx
    ↓
useLaunchData.ts
    ↓
┌─────────────────────────────────────────────────┐
│ 🔴 hotmart_sales (TABLE) - LEGADO!              │
│   - total_price_brl = GROSS                     │
│   - Não usa Orders Core                         │
│   - Não usa Ledger                              │
│                                                 │
│ 🔴 meta_insights (CACHE)                        │
│   - spend direto do cache                       │
│   - Não usa spend_core_events                   │
└─────────────────────────────────────────────────┘
```

### Métricas Detalhadas

| Métrica | UI Label | Hook | View/Tabela | Campo | Tipo | Status |
|---------|----------|------|-------------|-------|------|--------|
| **Receita** | "Faturamento" | `useLaunchData` | 🔴 `hotmart_sales` | `total_price_brl` | 🔴 GROSS | ❌ LEGADO |
| **Investimento** | "Investimento" | `useLaunchData` | 🔴 `meta_insights` | `spend` (cache) | 🟡 CACHE | ⚠️ NÃO USA CORE |
| **Lucro** | "Lucro" | `useLaunchData` | 🔴 Calculado | `revenue - spend` | 🔴 GROSS | ❌ INFLADO |
| **ROAS** | "ROAS" | `useLaunchData` | 🔴 Calculado | `revenue / spend` | 🔴 GROSS/CACHE | ❌ INFLADO |
| **Vendas** | "Vendas" | `useLaunchData` | 🔴 `hotmart_sales` | `COUNT(*)` | LEGADO | ⚠️ OK (COUNT) |
| **Ticket Médio** | "Ticket Médio" | `useLaunchData` | 🔴 Calculado | `revenue / sales` | 🔴 GROSS | ❌ INFLADO |
| **CPA** | "CPA" | `useLaunchData` | 🔴 Calculado | `spend / sales` | CACHE | ⚠️ |

### Código Problemático (useLaunchData.ts:229)
```typescript
// ❌ ERRADO - Usa GROSS
const totalRevenue = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

// ✅ CORRETO - Deveria usar Orders Core
// SELECT customer_paid, producer_net FROM crm_orders_view
```

### 🔴 CRÍTICO - Precisa Migração
1. Trocar `hotmart_sales` → `crm_orders_view`
2. Usar `customer_paid` para "quanto o cliente pagou"
3. Usar `producer_net` para cálculos de lucro/ROAS
4. Trocar `meta_insights` → `spend_daily` ou `spend_core_events`

---

## 3️⃣ ANÁLISE MENSAL (`/app/{project}/analise-mensal`)

### Fluxo de Dados
```
AnaliseMensal.tsx
    ↓
useMonthlyAnalysis.ts
    ↓
┌─────────────────────────────────────────────────┐
│ 🔴 finance_tracking_view (VIEW)                 │
│   - gross_amount = GROSS                        │
│   - Não usa net_amount                          │
│   - Não usa Orders Core                         │
│                                                 │
│ 🔴 meta_insights (CACHE)                        │
│   - spend direto do cache                       │
│   - Não usa spend_core_events                   │
└─────────────────────────────────────────────────┘
```

### Métricas Detalhadas

| Métrica | UI Label | Hook | View/Tabela | Campo | Tipo | Status |
|---------|----------|------|-------------|-------|------|--------|
| **Receita** | "Faturado" | `useMonthlyAnalysis` | 🔴 `finance_tracking_view` | `gross_amount` | 🔴 GROSS | ❌ INFLADO |
| **Investimento** | "Investimento" | `useMonthlyAnalysis` | 🔴 `meta_insights` | `spend` (cache) | 🟡 CACHE | ⚠️ NÃO USA CORE |
| **Lucro Bruto** | "Lucro Bruto" | `useMonthlyAnalysis` | 🔴 Calculado | `revenue - spend` | 🔴 GROSS | ❌ INFLADO |
| **ROAS** | "ROAS" | `useMonthlyAnalysis` | 🔴 Calculado | `revenue / spend` | 🔴 GROSS/CACHE | ❌ INFLADO |
| **Vendas** | "Vendas" | `useMonthlyAnalysis` | 🔴 `finance_tracking_view` | `COUNT(*)` | LEGADO | ⚠️ OK |

### Código Problemático (useMonthlyAnalysis.ts:370)
```typescript
// ❌ ERRADO - Usa GROSS
const revenue = monthSales.reduce((sum, sale) => sum + (sale.gross_amount || 0), 0);

// ✅ CORRETO - Deveria usar NET
// Use profit_daily.net_revenue ou
// SELECT SUM(net_amount) FROM sales_core_events
```

### 🔴 CRÍTICO - Precisa Migração
1. Trocar `finance_tracking_view.gross_amount` → `profit_daily.net_revenue`
2. Trocar `meta_insights` → `profit_daily.ad_spend`
3. Usar views consolidadas do Financial Core

---

## 4️⃣ CUBO MÁGICO DASHBOARD (Componente Compartilhado)

### Fluxo de Dados
```
CuboMagicoDashboard.tsx (embedded em FunnelAnalysis)
    ↓
Local queries + useFunnelData.ts
    ↓
┌─────────────────────────────────────────────────┐
│ 🔴 finance_tracking_view (VIEW)                 │
│   - gross_amount = GROSS                        │
│   - Documentação diz "canonical"                │
│   - MAS USA GROSS!                              │
│                                                 │
│ 🔴 meta_insights (CACHE)                        │
│   - spend direto do cache                       │
│   - Não usa spend_core_events                   │
└─────────────────────────────────────────────────┘
```

### Código Problemático (CuboMagicoDashboard.tsx:1-18)
```typescript
/**
 * CUBO MÁGICO DASHBOARD - CANONICAL FINANCIAL LAYER
 * ...
 * FILTER RULES:
 * - Revenue: gross_amount (CANONICAL)  // ❌ ERRADO!
 * 
 * FORBIDDEN:
 * ❌ hotmart_sales for direct revenue queries
 * ❌ sales_core_events  // ⚠️ MAS DEVERIA USAR!
 * ❌ total_price_brl
 */
```

**O comentário diz "CANONICAL" mas usa GROSS - contradição!**

---

## 5️⃣ VALIDAÇÃO COM JULIANE COELI (HP3609747213C1)

### Dados Esperados (Orders Core)
| Campo | Valor | Fonte |
|-------|-------|-------|
| `customer_paid` | **R$ 205,00** | `crm_orders_view` ✅ |
| `producer_net` | **R$ 94,43** | `crm_orders_view` ✅ |
| Items | **3 produtos** | `crm_order_items_view` ✅ |
| Item 1 | R$ 97 (bump) | `order_items` ✅ |
| Item 2 | R$ 39 (bump) | `order_items` ✅ |
| Item 3 | R$ 69 (bump) | `order_items` ✅ |

### Query de Validação
```sql
-- ✅ CORRETO - Orders Core
SELECT * FROM crm_orders_view 
WHERE provider_order_id = 'HP3609747213C1';

-- Resultado:
-- customer_paid = 205
-- producer_net = 94.43
-- item_count = 3
```

### O que cada dashboard mostraria:

| Dashboard | Usaria | Valor Mostrado | Correto? |
|-----------|--------|----------------|----------|
| `/dashboard` | `profit_daily.net_revenue` | Proporcional ao NET | ✅ |
| `/launch-dashboard` | `hotmart_sales.total_price_brl` | R$ 205 (GROSS) | ❌ |
| `/analise-mensal` | `finance_tracking_view.gross_amount` | R$ 97 (só front-end) | ❌ |

### Problema finance_tracking_view
A `finance_tracking_view` mostra **apenas R$ 97** para essa transação porque:
- Registra por item, não por pedido completo
- Não consolida os 3 bumps como um pedido único

---

## 📊 MAPA DE RISCO CONSOLIDADO

### Classificação por View/Tabela

| Fonte | Usado em | Tipo | Risco |
|-------|----------|------|-------|
| `profit_daily` | Dashboard | NET ✅ | 🟢 SEGURO |
| `spend_daily` | Dashboard | CORE ✅ | 🟢 SEGURO |
| `sales_core_events` | Dashboard (categorias) | NET ✅ | 🟢 SEGURO |
| `crm_orders_view` | CRM (novo) | CUSTOMER_PAID ✅ | 🟢 SEGURO |
| `crm_order_items_view` | CRM (novo) | CORE ✅ | 🟢 SEGURO |
| `hotmart_sales` | Launch Dashboard | 🔴 GROSS | 🔴 ALTO RISCO |
| `finance_tracking_view` | Análise Mensal, Cubo | 🔴 GROSS | 🔴 ALTO RISCO |
| `meta_insights` (cache) | Launch, Análise | 🟡 CACHE | 🟡 MÉDIO RISCO |

### Impacto Estimado (Erro no ROAS)

Se a margem líquida média é 46% (R$ 94,43 / R$ 205 ≈ 46%):

| Cenário | ROAS Mostrado | ROAS Real | Erro |
|---------|---------------|-----------|------|
| R$ 1000 investido, R$ 2000 GROSS | 2.0x | 0.92x (NET) | **+117%** |
| R$ 1000 investido, R$ 3000 GROSS | 3.0x | 1.38x (NET) | **+117%** |

---

## 🎯 RECOMENDAÇÕES POR PRIORIDADE

### 🔴 P0 - CRÍTICO (Fazer Primeiro)

1. **Launch Dashboard (`useLaunchData.ts`)**
   - Trocar `hotmart_sales` → `crm_orders_view`
   - Usar `customer_paid` para receita bruta cliente
   - Usar `producer_net` para cálculos financeiros
   - Trocar `meta_insights` → `spend_daily`

2. **Análise Mensal (`useMonthlyAnalysis.ts`)**
   - Trocar `finance_tracking_view.gross_amount` → `profit_daily.net_revenue`
   - Usar agregação por `economic_day` do `profit_daily`
   - Trocar `meta_insights` → `profit_daily.ad_spend`

### 🟡 P1 - IMPORTANTE

3. **Cubo Mágico Dashboard (`CuboMagicoDashboard.tsx`)**
   - Atualizar comentário: `gross_amount` NÃO é canonical
   - Migrar para `profit_daily` ou `sales_core_events.net_amount`
   - Manter consistência com Financial Core

4. **Documentação**
   - Remover referências a `finance_tracking_view.gross_amount` como "canonical"
   - Documentar que o Financial Core usa NET SEMPRE

### 🟢 P2 - MANUTENÇÃO

5. **Validação Contínua**
   - Adicionar testes de integridade: `SUM(items) = customer_paid`
   - Adicionar alertas se GROSS for usado em cálculos financeiros

---

## 📜 VIEWS CANÔNICAS OBRIGATÓRIAS

Para TODO cálculo financeiro, use EXCLUSIVAMENTE:

| Métrica | View | Campo |
|---------|------|-------|
| Receita Bruta (cliente) | `crm_orders_view` | `customer_paid` |
| Receita Líquida (produtor) | `crm_orders_view` | `producer_net` |
| Receita Diária (NET) | `profit_daily` | `net_revenue` |
| Investimento | `profit_daily` ou `spend_daily` | `ad_spend` |
| Lucro | `profit_daily` | `profit` |
| ROAS | `profit_daily` | `roas` ou calcular `net_revenue / ad_spend` |
| Vendas | `profit_daily` | `transaction_count` |
| LTV | `crm_contact_revenue_view` | `customer_paid` |

---

## ✅ CHECKLIST PRÉ-MIGRAÇÃO

- [ ] Validar que `crm_orders_view` tem todos os pedidos do período
- [ ] Validar que `profit_daily` cobre todo o período histórico
- [ ] Confirmar `financial_core_start_date` do projeto
- [ ] Backup das métricas atuais para comparação pós-migração
- [ ] Planejar rollback se necessário

---

**Documento gerado em:** 2026-01-16  
**Próxima ação:** Executar PROMPT 5 para migrar Launch Dashboard e Análise Mensal
