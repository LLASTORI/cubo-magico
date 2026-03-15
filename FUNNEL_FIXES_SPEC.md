# SPEC — Correções Críticas de Funis

> **Data:** 14/03/2026
> **Objetivo:** Corrigir os 4 problemas que estão prejudicando a análise de funis
> **Regra:** Não alterar lógica de negócio — apenas trocar fontes de dados legadas pelas canônicas
> **Após cada correção:** atualizar `debug_log.md` e `TASKS.md`

---

## Contexto — Fontes de dados canônicas (usar sempre)

```
✅ funnel_orders_view         — pedidos com contexto de funil
✅ funnel_revenue             — receita diária por funil
✅ funnel_spend               — gasto Meta Ads por funil
✅ funnel_financials_summary  — health_status e ROAS agregado
✅ finance_ledger_summary     — insights financeiros por transação
✅ finance_tracking_view      — bridge legada (ok usar temporariamente)

❌ hotmart_sales              — legado, apenas 840 de 6.180 registros
❌ sales_core_events          — deprecated
❌ order_items.offer_code     — sempre NULL, usar provider_offer_id
❌ order_items.funnel_id      — sempre NULL, atribuir via offer_mappings
❌ customer_paid_brl sem COALESCE — sempre NULL para webhook
```

---

## Fix 1 — `MonthlyRevenueDetailDialog.tsx`

**Problema:** Query direta em `hotmart_sales` mostra apenas ~840 de 6.180 registros (15% dos dados).

**Arquivo:** `src/components/analise/MonthlyRevenueDetailDialog.tsx`

**O que fazer:**
- Localizar `.from('hotmart_sales')` no arquivo
- Substituir pela query equivalente em `finance_tracking_view` ou `funnel_orders_view`
- Mapear os campos que o componente usa para os campos equivalentes nas novas views
- Garantir que filtros de `project_id` e período continuem funcionando

**Campos de mapeamento:**
```
hotmart_sales.transaction     → finance_tracking_view.transaction_id
hotmart_sales.product_name    → finance_tracking_view.product_name
hotmart_sales.offer_code      → finance_tracking_view.offer_code (provider_offer_id)
hotmart_sales.gross_amount    → finance_tracking_view.gross_amount
hotmart_sales.net_amount      → finance_tracking_view.net_amount
hotmart_sales.status          → finance_tracking_view.hotmart_status
hotmart_sales.purchase_date   → finance_tracking_view.purchase_date
```

**Validação:** após a correção, o dialog deve mostrar ~6.180 registros para o projeto principal.

---

## Fix 2 — `useCRMJourneyData.ts`

**Problema:** Usa coluna `offer_code` que é sempre NULL — quebra atribuição de funil no CRM inteiro.

**Arquivo:** `src/hooks/useCRMJourneyData.ts`

**O que fazer:**
- Localizar todas as referências a `offer_code` no hook
- Substituir por `provider_offer_id` onde a query é em `order_items`
- Verificar se há joins com `offer_mappings` usando `offer_code` — substituir por `offer_mappings.codigo_oferta = order_items.provider_offer_id`
- Testar que a atribuição de funil volta a funcionar

**Join correto com offer_mappings:**
```sql
-- ERRADO (offer_code sempre NULL)
offer_mappings.codigo_oferta = order_items.offer_code

-- CORRETO
offer_mappings.codigo_oferta = order_items.provider_offer_id
```

---

## Fix 3 — `useMonthlyAnalysis.ts`

**Problema:** Usa `finance_tracking_view` com agrupamento manual — deveria usar `funnel_revenue` + `funnel_spend` que já têm os dados agregados corretamente.

**Arquivo:** `src/hooks/useMonthlyAnalysis.ts`

**O que fazer:**
- Ler o que o hook retorna atualmente (quais campos, qual agrupamento)
- Substituir query em `finance_tracking_view` por:
  - `funnel_revenue` para dados de receita agrupados por mês
  - `funnel_spend` para dados de investimento agrupados por mês
- Manter a mesma interface de retorno do hook para não quebrar `AnaliseMensal.tsx`

**Agrupamento mensal:**
```sql
-- Receita mensal por projeto
SELECT
  project_id,
  DATE_TRUNC('month', economic_day) as month,
  SUM(revenue) as total_revenue,
  SUM(gross_revenue) as total_gross,
  SUM(sales_count) as total_sales
FROM funnel_revenue
WHERE project_id = $project_id
GROUP BY project_id, DATE_TRUNC('month', economic_day)
ORDER BY month DESC
```

---

## Fix 4 — `CuboMagicoDashboard.tsx`

**Problema:** Dashboard principal usa `finance_tracking_view` e tem interface `UnifiedSale` com `offer_code` em vez de `provider_offer_id`. Dados incompletos na tela mais importante do sistema.

**Arquivo:** `src/components/funnel/CuboMagicoDashboard.tsx`

**O que fazer:**
- Identificar de onde vêm os dados atualmente (qual hook ou query direta)
- Migrar para `useFunnelData()` que já usa `funnel_orders_view` corretamente
- Atualizar interface `UnifiedSale`:
  ```typescript
  // ANTES
  offer_code: string | null

  // DEPOIS
  provider_offer_id: string | null
  ```
- Atualizar todos os acessos a `.offer_code` no componente para `.provider_offer_id`
- Verificar se `CuboMagicoDashboard` recebe props de `FunnelAnalysis.tsx` — se sim, verificar se `useFunnelData` já está disponível no parent

**Atenção:** Este é o fix mais complexo dos 4. Ler o componente inteiro antes de alterar. Não mudar lógica de cálculo — apenas trocar a fonte e os nomes de campos.

---

## Ordem de execução recomendada

1. **Fix 1** (MonthlyRevenueDetailDialog) — mais isolado, menor risco
2. **Fix 2** (useCRMJourneyData) — impacto no CRM, testar após
3. **Fix 3** (useMonthlyAnalysis) — testar AnaliseMensal após
4. **Fix 4** (CuboMagicoDashboard) — mais complexo, fazer por último

---

## Checklist de validação após todos os fixes

- [ ] Dialog de detalhe mensal mostra ~6.000+ registros
- [ ] CRM consegue atribuir funil a partir do `provider_offer_id`
- [ ] Análise Mensal mostra dados consistentes com o dashboard de funil
- [ ] Dashboard principal `CuboMagicoDashboard` carrega sem erros
- [ ] Nenhuma query direta em `hotmart_sales` permanece ativa
- [ ] `offer_code` removido ou substituído em todos os arquivos corrigidos
- [ ] `debug_log.md` e `TASKS.md` atualizados
