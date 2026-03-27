# PROMPT — Onda 2E: Blocos reutilizáveis na LaunchEditionAnalysis

Leia `debug_log.md`, `TASKS.md`, `CLAUDE.md` antes de começar.
Adicionar blocos de análise reutilizáveis na tela de edição do lançamento pago.
**Implementar na ordem abaixo. Parar e reportar se algum bloco causar problema.**

Ao finalizar: atualizar `debug_log.md` e `TASKS.md`, commitar tudo.

---

## Contexto

`LaunchEditionAnalysis` já tem: KPIs, PassingDiário, Funil de Conversão.
Faltam: Formas de Pagamento, Saúde do Funil, UTM/Criativos, Meta Hierarchy.

O gap principal identificado no diagnóstico: `salesData` (SaleData[]) completo
filtrado pelo período da edição. Resolver isso primeiro alimenta múltiplos blocos.

---

## Passo 1 — Buscar salesData completo na LaunchEditionAnalysis

Em `useLaunchEditionData` (ou diretamente na página), adicionar query a
`funnel_orders_view` trazendo todos os campos necessários, filtrado por:
- `funnel_id` da edição
- `economic_day` entre `edition.start_date` e `edition.end_date`

O formato de saída deve ser compatível com `SaleData[]` — o mesmo tipo
que `useFunnelData` retorna e que os componentes standalone esperam.

Chamar esse dado de `editionSalesData` para não conflitar com outros.

---

## Passo 2 — Adicionar PaymentMethodAnalysis

Importar `PaymentMethodAnalysis` de `src/components/funnel/`.
Passar `salesData={editionSalesData}` e `funnelOfferCodes` da edição.
Adicionar após o bloco de "Funil de Conversão" na tela.

---

## Passo 3 — Adicionar FunnelHealthMetrics

Chamar `useFunnelHealthMetrics` passando:
- `projectId` do projeto atual
- `offerCodes` das ofertas do funil
- `dateRange` = `{ start: edition.start_date, end: edition.end_date }`

Importar `FunnelHealthMetrics` e adicionar após `PaymentMethodAnalysis`.

**Atenção:** `useFunnelHealthMetrics` pode ainda referenciar `hotmart_sales`
(dívida técnica conhecida). Se retornar zeros, adicionar comentário
`// TODO: migrar para funnel_orders_view` e seguir — não bloquear o resto.

---

## Passo 4 — Adicionar UTMAnalysis

Precisará de:
1. `salesData` = `editionSalesData` (já disponível do Passo 1)
2. `metaInsights` filtrado pelo período da edição — buscar de `meta_insights`
   onde `date_start` >= `edition.start_date` AND `date_stop` <= `edition.end_date`
   AND `project_id` = projeto atual
3. `funnelOfferCodes` da edição

Importar `UTMAnalysis` e adicionar após `FunnelHealthMetrics`.

---

## Passo 5 — Adicionar MetaHierarchyAnalysis

Chamar `useMetaHierarchy(projectId)` que já existe.
Filtrar `meta_insights` pelo período da edição para passar como `insights`.
Importar `MetaHierarchyAnalysis` e adicionar após `UTMAnalysis`.

---

## Passo 6 — Filtrar lançamento pago fora de FunnelAnalysis

Na página `FunnelAnalysis.tsx` (análise de perpétuos), adicionar filtro
para excluir funis com `funnel_model = 'lancamento_pago'` da listagem.

Query atual provavelmente busca todos os funis do projeto — adicionar:
`.neq('funnel_model', 'lancamento_pago')`

**Não alterar** nenhuma outra lógica da página.

---

## O que NÃO fazer

- Não refatorar `CuboMagicoDashboard`
- Não alterar `FunnelAnalysis` além do filtro do Passo 6
- Não criar novos hooks — reutilizar os existentes
- Não alterar componentes standalone — só importar e usar

---

## Checklist

- [ ] `editionSalesData` disponível na `LaunchEditionAnalysis`
- [ ] `PaymentMethodAnalysis` aparece na tela de edição
- [ ] `FunnelHealthMetrics` aparece na tela de edição
- [ ] `UTMAnalysis` aparece na tela de edição com dados reais
- [ ] `MetaHierarchyAnalysis` aparece na tela de edição
- [ ] Lançamento pago não aparece mais em `FunnelAnalysis`
- [ ] Build: zero erros
- [ ] `debug_log.md` e `TASKS.md` atualizados
- [ ] Tudo commitado
