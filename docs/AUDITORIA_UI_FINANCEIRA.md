# 📊 Auditoria de Telas Financeiras (UI → Dados → SQL)

**Data da auditoria:** 2026-01-12  
**Projeto analisado:** 1e1a89a4-81d5-4aa7-8431-538828def2a3

---

## 📋 Sumário Executivo

Esta auditoria mapeia **todas as telas financeiras** do produto, identificando exatamente:
- De onde cada número vem (hook → tabela/view)
- Qual tipo de valor é exibido (Gross/Net/Owner)
- Se a fonte é Legacy ou Core
- Validação cruzada com SQL real

### ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

| Aspecto | Valor Legacy (Exibido) | Valor Core (Correto) | Diferença |
|---------|------------------------|----------------------|-----------|
| Faturamento (30d) | R$ 171.222,59 | R$ 249,52 (net) / R$ 3.208,66 (gross) | **68x inflado** |
| Investimento (30d) | R$ 70.788,43 | R$ 18.909,98 | 3.7x inflado |
| ROAS (30d) | 2.42x | 0.01x | **185x inflado** |

**Causa**: Dashboard usa `hotmart_sales.total_price_brl` (GROSS) + `meta_insights.spend` (LEGACY), enquanto o Core usa `sales_core_events` com `net_amount` e `spend_core_events`.

---

## 1️⃣ TELAS AUDITADAS

### 1.1 Visão Geral do Projeto (Dashboard Inicial)

```
[TELA]
Nome visível no app: Visão Geral / Dashboard
URL / rota: /project-overview (ou /)
Arquivo React da página: src/pages/ProjectOverview.tsx
Componente principal: ProjectOverview
Hook(s) usados: useProjectOverview
```

#### Métricas Analisadas:

**[MÉTRICA: Investimento]**
```
Nome exibido no UI: "Investimento"
De qual hook vem: useProjectOverview → summaryMetrics.totalSpend
De qual view/tabela SQL vem: profit_daily
Campos usados: ad_spend
Fórmula exata: SUM(ad_spend) do período
Tipo de valor:
  (x) Net (após taxas) - via spend_core_events
Fonte de dados:
  (x) Core ✅
```

**[MÉTRICA: Faturamento]**
```
Nome exibido no UI: "Faturamento"
De qual hook vem: useProjectOverview → summaryMetrics.totalRevenue
De qual view/tabela SQL vem: profit_daily
Campos usados: net_revenue
Fórmula exata: SUM(net_revenue) do período
Tipo de valor:
  (x) Net (valor recebido após taxas)
Fonte de dados:
  (x) Core ✅
```

**[MÉTRICA: Lucro]**
```
Nome exibido no UI: "Lucro"
De qual hook vem: useProjectOverview → summaryMetrics.profit
De qual view/tabela SQL vem: profit_daily
Campos usados: profit (= net_revenue - ad_spend)
Fórmula exata: SUM(net_revenue) - SUM(ad_spend)
Tipo de valor:
  (x) Net
Fonte de dados:
  (x) Core ✅
```

**[MÉTRICA: ROAS]**
```
Nome exibido no UI: "ROAS"
De qual hook vem: useProjectOverview → summaryMetrics.roas
De qual view/tabela SQL vem: profit_daily
Campos usados: net_revenue / ad_spend
Fórmula exata: SUM(net_revenue) / SUM(ad_spend)
Tipo de valor:
  (x) Net
Fonte de dados:
  (x) Core ✅
```

**[MÉTRICA: Vendas]**
```
Nome exibido no UI: "Vendas"
De qual hook vem: useProjectOverview → summaryMetrics.totalSales
De qual view/tabela SQL vem: profit_daily
Campos usados: transaction_count
Fórmula exata: SUM(transaction_count)
Fonte de dados:
  (x) Core ✅
```

**Classificação: ✅ 100% Core** (após migração recente)

---

### 1.2 Análise de Funis (CuboMagicoDashboard)

```
[TELA]
Nome visível no app: Análise de Funis / Cubo Mágico
URL / rota: /funis
Arquivo React da página: src/pages/FunnelAnalysis.tsx
Componente principal: CuboMagicoDashboard
Hook(s) usados: useFunnelData, useFunnelHealthMetrics
```

#### Métricas Analisadas:

**[MÉTRICA: Investimento]**
```
Nome exibido no UI: "Investimento" (card e tabela de funis)
De qual hook vem: useFunnelData → metaMetrics.spend
De qual view/tabela SQL vem: meta_insights ⚠️ LEGACY
Campos usados: spend (agregado de insights de anúncios)
Fórmula exata: SUM(spend) WHERE ad_id IS NOT NULL AND campaign_id IN (matching campaigns)
Tipo de valor:
  (x) Gross (gasto reportado pelo Meta)
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: Faturamento]**
```
Nome exibido no UI: "Faturamento" (card e tabela de funis)
De qual hook vem: useFunnelData → summaryMetrics.totalReceita
De qual view/tabela SQL vem: hotmart_sales ⚠️ LEGACY
Campos usados: total_price_brl
Fórmula exata: SUM(total_price_brl) WHERE offer_code IN (funnel offers)
Tipo de valor:
  (x) Gross (valor pago pelo cliente) ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: ROAS]**
```
Nome exibido no UI: "ROAS"
De qual hook vem: useFunnelData → summaryMetrics.roas
De qual view/tabela SQL vem: CALCULADO de hotmart_sales + meta_insights ⚠️
Campos usados: total_price_brl / spend
Fórmula exata: SUM(total_price_brl) / SUM(spend)
Tipo de valor:
  (x) Gross / Legacy ⚠️ ERRADO
Fonte de dados:
  (x) Misturado (ambos legacy) ⚠️
```

**[MÉTRICA: Vendas FRONT]**
```
Nome exibido no UI: "Vendas FRONT"
De qual hook vem: useFunnelData → summaryMetrics.vendasFront
De qual view/tabela SQL vem: hotmart_sales ⚠️ LEGACY
Campos usados: COUNT(*) WHERE tipo_posicao = 'FRONT'
Fonte de dados:
  (x) Legacy ⚠️
```

**Classificação: ❌ 100% Legacy**

---

### 1.3 Análise Mensal

```
[TELA]
Nome visível no app: Análise Mensal
URL / rota: /analise-mensal
Arquivo React da página: src/pages/AnaliseMensal.tsx
Componente principal: AnaliseMensal
Hook(s) usados: useMonthlyAnalysis
```

#### Métricas Analisadas:

**[MÉTRICA: Investimento Mensal]**
```
Nome exibido no UI: "Investimento" (tabela mensal)
De qual hook vem: useMonthlyAnalysis → generalMonthlyData[].investment
De qual view/tabela SQL vem: meta_insights ⚠️ LEGACY
Campos usados: spend
Fórmula exata: SUM(spend) WHERE date_start IN month
Tipo de valor:
  (x) Gross (gasto reportado)
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: Faturado Mensal]**
```
Nome exibido no UI: "Faturado" (tabela mensal)
De qual hook vem: useMonthlyAnalysis → generalMonthlyData[].revenue
De qual view/tabela SQL vem: hotmart_sales ⚠️ LEGACY
Campos usados: total_price_brl (ou total_price)
Fórmula exata: SUM(total_price_brl || total_price)
Tipo de valor:
  (x) Gross (valor pago pelo cliente) ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: Lucro Bruto]**
```
Nome exibido no UI: "Lucro Bruto"
De qual hook vem: useMonthlyAnalysis → generalMonthlyData[].grossProfit
Fórmula exata: revenue - investment (Gross - Legacy Spend)
Tipo de valor:
  (x) Gross - Legacy ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: ROAS]**
```
Nome exibido no UI: "ROAS"
De qual hook vem: useMonthlyAnalysis → generalMonthlyData[].roas
Fórmula exata: revenue / investment (Gross / Legacy)
Tipo de valor:
  (x) Gross ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**Classificação: ❌ 100% Legacy**

---

### 1.4 Meta Ads

```
[TELA]
Nome visível no app: Meta Ads
URL / rota: /meta-ads
Arquivo React da página: src/pages/MetaAds.tsx
Componente principal: MetaAdsContent
Hook(s) usados: Queries diretas no componente
```

#### Métricas Analisadas:

**[MÉTRICA: Spend Total]**
```
Nome exibido no UI: "Gastos" / "Spend"
De qual hook vem: Query direta no componente
De qual view/tabela SQL vem: meta_insights
Campos usados: spend
Fórmula exata: SUM(spend) WHERE ad_id IS NOT NULL
Tipo de valor:
  (x) Gross (reportado pelo Meta)
Fonte de dados:
  (x) Legacy (mas é a fonte primária para spend)
```

**[MÉTRICA: Impressões/Cliques/CTR]**
```
Nome exibido no UI: "Impressões", "Cliques", "CTR"
De qual hook vem: Query direta no componente
De qual view/tabela SQL vem: meta_insights
Campos usados: impressions, clicks, ctr
Fonte de dados:
  (x) Legacy (fonte primária para Meta)
```

**Classificação: ✅ 100% Legacy (mas correto para dados Meta)**

Nota: Para dados do Meta (impressões, cliques, spend), a tabela `meta_insights` É a fonte correta. O problema é quando esses dados são combinados com vendas para calcular ROAS.

---

### 1.5 Lançamentos

```
[TELA]
Nome visível no app: Lançamentos
URL / rota: /lancamentos
Arquivo React da página: src/pages/LaunchDashboard.tsx
Componente principal: LaunchDashboard
Hook(s) usados: useLaunchData
```

#### Métricas Analisadas:

**[MÉTRICA: Investimento]**
```
Nome exibido no UI: "Investimento"
De qual hook vem: useLaunchData → summaryMetrics.totalSpend
De qual view/tabela SQL vem: meta_insights ⚠️ LEGACY
Campos usados: spend
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: Faturamento]**
```
Nome exibido no UI: "Faturamento"
De qual hook vem: useLaunchData → summaryMetrics.totalRevenue
De qual view/tabela SQL vem: hotmart_sales ⚠️ LEGACY
Campos usados: total_price_brl
Tipo de valor:
  (x) Gross ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: Lucro]**
```
Nome exibido no UI: "Lucro"
De qual hook vem: useLaunchData → summaryMetrics.profit
Fórmula exata: totalRevenue - totalSpend (Gross - Legacy)
Tipo de valor:
  (x) Gross - Legacy ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**[MÉTRICA: ROAS]**
```
Nome exibido no UI: "ROAS Geral"
De qual hook vem: useLaunchData → summaryMetrics.roas
Fórmula exata: totalRevenue / totalSpend
Tipo de valor:
  (x) Gross ⚠️ ERRADO
Fonte de dados:
  (x) Legacy ⚠️
```

**Classificação: ❌ 100% Legacy**

---

## 2️⃣ TABELA COMPARATIVA

| Tela | Métrica | View/Tabela | Tipo de Valor | Fonte | Correto? |
|------|---------|-------------|---------------|-------|----------|
| Visão Geral | Investimento | profit_daily | Net | Core | ✅ |
| Visão Geral | Faturamento | profit_daily | Net | Core | ✅ |
| Visão Geral | Lucro | profit_daily | Net | Core | ✅ |
| Visão Geral | ROAS | profit_daily | Net | Core | ✅ |
| Visão Geral | Vendas | profit_daily | - | Core | ✅ |
| **Funis** | **Investimento** | **meta_insights** | **Legacy** | **Legacy** | ❌ |
| **Funis** | **Faturamento** | **hotmart_sales** | **Gross** | **Legacy** | ❌ |
| **Funis** | **ROAS** | **calculado** | **Gross/Legacy** | **Legacy** | ❌ |
| **Funis** | **Vendas** | **hotmart_sales** | **-** | **Legacy** | ❌ |
| **Análise Mensal** | **Investimento** | **meta_insights** | **Legacy** | **Legacy** | ❌ |
| **Análise Mensal** | **Faturado** | **hotmart_sales** | **Gross** | **Legacy** | ❌ |
| **Análise Mensal** | **Lucro** | **calculado** | **Gross-Legacy** | **Legacy** | ❌ |
| **Análise Mensal** | **ROAS** | **calculado** | **Gross** | **Legacy** | ❌ |
| Meta Ads | Spend | meta_insights | Gross | Legacy | ✅ (é a fonte) |
| Meta Ads | Impressões | meta_insights | - | Legacy | ✅ (é a fonte) |
| **Lançamentos** | **Investimento** | **meta_insights** | **Legacy** | **Legacy** | ❌ |
| **Lançamentos** | **Faturamento** | **hotmart_sales** | **Gross** | **Legacy** | ❌ |
| **Lançamentos** | **Lucro** | **calculado** | **Gross-Legacy** | **Legacy** | ❌ |
| **Lançamentos** | **ROAS** | **calculado** | **Gross** | **Legacy** | ❌ |

---

## 3️⃣ VALIDAÇÃO CRUZADA SQL

### 3.1 Dashboard - Período de 30 dias

```sql
-- Resultado da Query de Validação:
```

| Fonte | Valor |
|-------|-------|
| **Core net_revenue** | R$ 249,52 |
| **Core gross_revenue** | R$ 3.208,66 |
| **Core ad_spend** | R$ 18.909,98 |
| **Core profit** | R$ -18.660,46 |
| **Core ROAS** | 0.013 (1.3%) |
| **Legacy gross_revenue** | R$ 171.222,59 |
| **Legacy sales_count** | 1.731 |
| **Legacy spend** | R$ 70.788,43 |
| **Legacy ROAS (gross)** | 2.42 |

#### Análise:
- **Diferença de receita**: R$ 171.222 (legacy) vs R$ 249 (core net) = **686x diferença**
- **Diferença de spend**: R$ 70.788 (legacy) vs R$ 18.909 (core) = **3.7x diferença**
- **ROAS inflado**: 2.42x (legacy) vs 0.01x (core) = **185x inflado**

**CONCLUSÃO**: O Dashboard (Visão Geral) foi migrado para Core e exibe dados corretos. Mas as outras telas (Funis, Análise Mensal, Lançamentos) ainda usam Legacy.

### 3.2 Hoje (2026-01-12)

| Fonte | Valor |
|-------|-------|
| Core net_revenue | R$ 118,87 |
| Core gross_revenue | R$ 1.504,30 |
| Core spend | R$ 1.521,03 |
| Core profit | R$ -1.402,16 |
| Legacy gross_revenue | R$ 3.377,44 |
| Legacy spend | R$ 1.521,04 |

**Análise**:
- Receita Legacy (Gross) é **28x maior** que Core Net
- Spend é praticamente igual entre Legacy e Core (diferença de R$ 0,01)

---

## 4️⃣ FLUXO DE DADOS

### 4.1 Hotmart → Dashboard

```
Webhook Hotmart
    ↓
hotmart_sales (tabela - LEGACY)
    ↓
sales_core_events (tabela - CORE) ← economic_day + net_amount
    ↓
revenue_daily (view - CORE) ← SUM(net_amount)
    ↓
profit_daily (view - CORE) ← revenue_daily JOIN spend_daily
    ↓
useProjectOverview (hook) ← profit_daily
    ↓
ProjectOverview (componente) ← summaryMetrics
    ↓
Dashboard UI ✅
```

### 4.2 Hotmart → Funis (PROBLEMA)

```
Webhook Hotmart
    ↓
hotmart_sales (tabela - LEGACY) ⚠️
    ↓
useFunnelData (hook) ← hotmart_sales.total_price_brl ⚠️ GROSS!
    ↓
CuboMagicoDashboard (componente) ← summaryMetrics.totalReceita ⚠️
    ↓
UI exibe GROSS como "Faturamento" ❌
```

### 4.3 Meta → Dashboard

```
API Meta
    ↓
meta_insights (tabela - fonte primária)
    ↓
spend_core_events (tabela - CORE) ← spend_amount
    ↓
spend_daily (view - CORE) ← SUM(spend_amount)
    ↓
profit_daily (view - CORE) ← revenue_daily JOIN spend_daily
    ↓
useProjectOverview (hook) ← profit_daily
    ↓
ProjectOverview (componente) ← summaryMetrics.totalSpend
    ↓
Dashboard UI ✅
```

### 4.4 Meta → Funis (PROBLEMA)

```
API Meta
    ↓
meta_insights (tabela - LEGACY) ⚠️
    ↓
useFunnelData (hook) ← meta_insights.spend ⚠️
    ↓
CuboMagicoDashboard (componente) ← metaMetrics.spend ⚠️
    ↓
UI exibe Legacy Spend ❌
```

---

## 5️⃣ VIEWS CORE DISPONÍVEIS

### revenue_daily
```sql
SELECT project_id, economic_day,
       SUM(gross_amount) AS gross_revenue,
       SUM(gross_amount - net_amount) AS platform_fees,
       SUM(net_amount) AS net_revenue,
       COUNT(*) AS transaction_count
FROM sales_core_events
WHERE is_active = true AND event_type IN ('purchase','subscription','upgrade')
GROUP BY project_id, economic_day;
```

### spend_daily
```sql
SELECT project_id, economic_day,
       SUM(spend_amount) AS ad_spend,
       COUNT(DISTINCT campaign_id) AS campaigns,
       COUNT(DISTINCT ad_id) AS ads
FROM spend_core_events
WHERE is_active = true
GROUP BY project_id, economic_day;
```

### profit_daily
```sql
SELECT project_id, economic_day,
       gross_revenue, platform_fees, net_revenue,
       ad_spend,
       (net_revenue - ad_spend) AS profit,
       CASE WHEN ad_spend > 0 THEN net_revenue / ad_spend END AS roas
FROM revenue_daily FULL JOIN spend_daily;
```

---

## 6️⃣ RECOMENDAÇÕES

### Telas que precisam migrar para Core:

1. **Funis (CuboMagicoDashboard)** - Prioridade CRÍTICA
   - Hook: useFunnelData
   - Migrar de: hotmart_sales + meta_insights
   - Migrar para: profit_daily + sales_core_events

2. **Análise Mensal** - Prioridade ALTA
   - Hook: useMonthlyAnalysis
   - Migrar de: hotmart_sales + meta_insights
   - Migrar para: profit_daily (já tem profit_monthly?)

3. **Lançamentos** - Prioridade ALTA
   - Hook: useLaunchData
   - Migrar de: hotmart_sales + meta_insights
   - Migrar para: profit_daily + sales_core_events

4. **Comparar Períodos** - Prioridade MÉDIA
   - Componente: PeriodComparison
   - Migrar para usar dados Core

### Views que devem ser usadas:

| Métrica | View Correta | Campo |
|---------|--------------|-------|
| Receita (Faturamento) | revenue_daily | net_revenue |
| Receita Bruta | revenue_daily | gross_revenue |
| Taxas Plataforma | revenue_daily | platform_fees |
| Investimento | spend_daily | ad_spend |
| Lucro | profit_daily | profit |
| ROAS | profit_daily | roas |
| Receita do Produtor | owner_profit_daily | owner_revenue |

---

## 7️⃣ CONCLUSÃO

### Status por Tela:

| Tela | Status | Ação Necessária |
|------|--------|-----------------|
| Visão Geral | ✅ Core | Nenhuma |
| Funis | ❌ 100% Legacy | Migrar para profit_daily |
| Análise Mensal | ❌ 100% Legacy | Migrar para profit_daily |
| Meta Ads | ✅ Legacy (OK) | Nenhuma (é fonte primária) |
| Lançamentos | ❌ 100% Legacy | Migrar para profit_daily |
| Comparar Períodos | ❌ Legacy | Migrar para profit_daily |

### Impacto da Não-Correção:

- **ROAS inflado em até 185x** em algumas telas
- **Lucro errado** - mostra lucro positivo quando é negativo
- **Decisões de negócio baseadas em dados incorretos**
- **Inconsistência** entre telas diferentes
