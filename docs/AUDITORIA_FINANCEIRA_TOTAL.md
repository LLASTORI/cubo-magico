# 🧠 AUDITORIA FINANCEIRA TOTAL

**Data da Auditoria:** 2026-01-12  
**Status:** ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

---

## 1️⃣ MAPEAMENTO DE FONTES REAIS DE DADOS

| Métrica no Front | Fonte (View / Tabela) | Campo | Tipo |
|------------------|----------------------|-------|------|
| **Investimento (Dashboard)** | `meta_insights` (legacy) | `spend` | legacy |
| **Faturamento (Dashboard)** | `hotmart_sales` (legacy) | `total_price_brl` | **GROSS** |
| **Lucro** | Calculado inline | `faturamento - investimento` | **GROSS (ERRADO!)** |
| **ROAS** | Calculado inline | `faturamento / investimento` | **GROSS (ERRADO!)** |
| **Vendas** | `hotmart_sales` (legacy) | `COUNT(*)` | legacy |
| **Faturamento por Categoria** | `sales_core_events` | `net_amount` | net ✓ |
| **ROAS por Funil (Overview)** | `sales_core_events` + `spend_daily` | `net_amount / ad_spend` | net ✓ |
| **Funil → Receita (CuboMagico)** | `hotmart_sales` (legacy) | `total_price_brl` | **GROSS** |
| **Funil → Investimento (CuboMagico)** | `meta_insights` (legacy) | `spend` | legacy |
| **Funil → CPA** | Calculado inline | `investimento / vendas` | legacy |
| **Análise Mensal** | `hotmart_sales` + `meta_insights` | `total_price_brl`, `spend` | **LEGACY + GROSS** |

**Legenda Tipo:**
- `gross` = Valor pago pelo cliente (inclui taxas da plataforma)
- `net` = Valor líquido após taxas da plataforma (Hotmart)
- `owner_net` = Valor do produtor após splits com afiliados/coprodutores
- `legacy` = Tabela antiga, não normalizada
- `mixed` = Mistura dados de diferentes eras

---

## 2️⃣ FLUXO DE DADOS

### Hotmart (Receita)

```
Webhook Hotmart → hotmart_sales (legacy) → hotmart-webhook → sales_core_events (Core)
                        ↓                                            ↓
                   total_price_brl (GROSS)              gross_amount + net_amount
                        ↓                                            ↓
               useFunnelData.ts                              revenue_daily (view)
                        ↓                                            ↓
             CuboMagicoDashboard.tsx ← USA GROSS!          profit_daily (view)
                                                                     ↓
                                                           useProjectOverview.ts ← USA NET ✓
```

**Onde entra o dinheiro:** `hotmart_sales.total_price_brl` (GROSS)  
**Onde entram taxas:** Calculado em `sales_core_events` como `gross_amount - net_amount`  
**Onde entram splits:** `product_revenue_splits` → `revenue_allocations_daily`  
**PROBLEMA:** CuboMagicoDashboard usa `total_price_brl` (GROSS), ignorando taxas!

### Meta Ads (Investimento)

```
API Meta → meta-api/index.ts → meta_insights (legacy) → spend_core_events (Core)
                                       ↓                          ↓
                                    spend                    spend_amount
                                       ↓                          ↓
                              useFunnelData.ts              spend_daily (view)
                                       ↓                          ↓
                        CuboMagicoDashboard.tsx ← LEGACY    profit_daily (view)
                                                                  ↓
                                                      useProjectOverview.ts ← CORE ✓
```

**PROBLEMA:** CuboMagicoDashboard usa `meta_insights.spend` (legacy)

---

## 3️⃣ CONFLITOS DE ERAS (Legacy vs Core)

| Tela | Usa Legacy? | Usa Core? | Mistura? | Status |
|------|-------------|-----------|----------|--------|
| **CuboMagico Dashboard** | ✅ hotmart_sales, meta_insights | ❌ | ❌ | ⚠️ **TODO LEGACY** |
| **FunnelAnalysis (geral)** | ✅ hotmart_sales, meta_insights | ❌ | ❌ | ⚠️ **TODO LEGACY** |
| **useProjectOverview** | ❌ | ✅ profit_daily, sales_core_events | ❌ | ✅ **CORE** |
| **Análise IA (FunnelAIInsights)** | ✅ via computeFunnelAIContext | ❌ | ⚠️ | ⚠️ **MISTURA** |
| **useFunnelFinancials** | ❌ | ✅ funnel_financials | ❌ | ✅ **CORE** |
| **useProfitDaily** | ❌ | ✅ profit_daily | ❌ | ✅ **CORE** |
| **Análise Mensal** | ✅ hotmart_sales, meta_insights | ❌ | ❌ | ⚠️ **TODO LEGACY** |
| **Comparar Períodos** | ✅ via useFunnelData | ❌ | ❌ | ⚠️ **LEGACY** |

---

## 4️⃣ AUDITORIA DE RECEITA

### Para o número "Faturamento" no CuboMagicoDashboard:

**Resposta:** É o **valor pago pelo cliente (GROSS)** ❌

```typescript
// CuboMagicoDashboard.tsx - Linha 434
const faturamento = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
```

**SQL real que gera esse número:**
```sql
SELECT SUM(total_price_brl) 
FROM hotmart_sales 
WHERE project_id = ? 
  AND status IN ('APPROVED', 'COMPLETE')
  AND sale_date BETWEEN ? AND ?;
```

### Valores reais para 2026-01-12:

| Fonte | Valor | Descrição |
|-------|-------|-----------|
| `hotmart_sales.total_price_brl` | R$ 2.360,20 | GROSS (usado no Dashboard) |
| `sales_core_events.gross_amount` | R$ 1.387,40 | GROSS (Core) |
| `sales_core_events.net_amount` | R$ 109,39 | NET (correto para profit) |
| `platform_fees` | R$ 1.278,01 | Taxas Hotmart |

**⚠️ PROBLEMA CRÍTICO:** Há diferença de R$ 972,80 entre `hotmart_sales` e `sales_core_events`!
- 33 registros em `hotmart_sales` vs 23 em `sales_core_events`
- Provavelmente nem todas as vendas foram migradas para Core ou há duplicatas no legacy

---

## 5️⃣ AUDITORIA DE ROAS

### Fórmula REAL usada hoje (CuboMagicoDashboard):

```
ROAS = total_price_brl / meta_insights.spend
     = GROSS_REVENUE / LEGACY_SPEND
```

**Campos usados:**
- Numerador: `hotmart_sales.total_price_brl` (GROSS)
- Denominador: `meta_insights.spend` (legacy, não deduplicado por ad_id)

### Fórmula CORRETA (profit_daily):

```
ROAS = net_revenue / ad_spend
     = NET_REVENUE / CORE_SPEND
```

**Campos corretos:**
- Numerador: `sales_core_events.net_amount` (NET)
- Denominador: `spend_core_events.spend_amount` (Core)

---

## 6️⃣ SIMULAÇÃO REAL - 2026-01-12

| Fonte | Valor |
|-------|-------|
| **Hotmart gross (hotmart_sales)** | R$ 2.360,20 |
| **Hotmart net (sales_core_events.net_amount)** | R$ 109,39 |
| **Hotmart gross (sales_core_events.gross_amount)** | R$ 1.387,40 |
| **Meta spend (spend_daily view)** | R$ 1.521,03 |
| **Meta spend (meta_insights legacy)** | R$ 1.521,04 |
| **Revenue view - gross_revenue** | R$ 1.387,40 |
| **Revenue view - net_revenue** | R$ 109,39 |
| **Revenue view - platform_fees** | R$ 1.278,01 |
| **Profit view - net_revenue** | R$ 109,39 |
| **Profit view - ad_spend** | R$ 1.521,03 |
| **Profit view - profit** | R$ -1.411,64 |
| **Profit view - roas** | 0.07 |

### Comparativo de ROAS:

| Método | Fórmula | ROAS |
|--------|---------|------|
| Dashboard atual (ERRADO) | 2.360,20 / 1.521,03 | **1.55** |
| Usando Core GROSS (ERRADO) | 1.387,40 / 1.521,03 | **0.91** |
| **Usando Core NET (CORRETO)** | 109,39 / 1.521,03 | **0.07** |

**⚠️ O Dashboard mostra ROAS ~22x maior do que a realidade!**

---

## 7️⃣ PLANO DE CORREÇÃO

### 3 Maiores Erros Hoje no Dashboard:

1. **ROAS inflado 22x:** Usa `total_price_brl` (GROSS) ao invés de `net_amount` (NET)
2. **Fontes legacy:** CuboMagicoDashboard ignora completamente as views canônicas (`profit_daily`, `revenue_daily`)
3. **Discrepância de dados:** `hotmart_sales` tem 33 registros vs 23 em `sales_core_events` - dados não migrados ou duplicatas

### View Correta para Cada Métrica:

| Métrica | View Canônica | Campo |
|---------|--------------|-------|
| **Receita** | `revenue_daily` | `net_revenue` |
| **Lucro** | `profit_daily` | `profit` |
| **ROAS** | `profit_daily` | `roas` |
| **Investimento** | `spend_daily` | `ad_spend` |
| **Funis** | `funnel_financials` / `funnel_financials_summary` | todos |

### Arquivos que Precisam de Correção:

1. **`src/components/funnel/CuboMagicoDashboard.tsx`** - Migrar para `profit_daily`/`revenue_daily`
2. **`src/hooks/useFunnelData.ts`** - Migrar de `hotmart_sales` para `sales_core_events`
3. **`src/hooks/useMonthlyAnalysis.ts`** - Usa legacy `hotmart_sales` + `meta_insights`
4. **`src/hooks/useFunnelAIContext.ts`** - Alimenta IA com dados GROSS
5. **`src/pages/AnaliseMensal.tsx`** - Todo baseado em legacy

### Hooks Canônicos que DEVEM ser usados:

- ✅ `useProfitDaily()` - Para profit e ROAS
- ✅ `useRevenueDaily()` - Para receita
- ✅ `useFunnelFinancialsDaily()` - Para métricas por funil
- ✅ `useFunnelFinancialsSummary()` - Para resumo por funil
- ✅ `useProjectOverview()` - Já usa Core! ✓

---

## ⚠️ REGRA CRÍTICA

**NÃO ALTERAR NADA** antes desta auditoria ser validada pelo responsável.

### Checklist de Validação:

- [ ] Confirmar diferença entre `hotmart_sales` e `sales_core_events`
- [ ] Verificar se todas as vendas estão sendo migradas para Core
- [ ] Confirmar que o campo `net_amount` está sendo calculado corretamente
- [ ] Revisar webhook `hotmart-webhook` para garantir migração correta
- [ ] Definir data de corte para ignorar dados legacy

---

*Gerado automaticamente pela auditoria financeira em 2026-01-12*
