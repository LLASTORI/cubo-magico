# PROMPT — Onda 2 Parte A: Lançamento Pago — Fases Automáticas + Tela de Análise

Leia `debug_log.md`, `TASKS.md`, `CLAUDE.md` e `FUNNEL_MODELS.md` antes de começar.
Esta tarefa constrói a experiência central do lançamento pago no Cubo.
**Somente o que está listado aqui. Nada além.**

Ao finalizar: atualizar `debug_log.md` e `TASKS.md`, commitar todas as migrations.

---

## Contexto

O lançamento pago tem edições (tabela `launch_editions`, já existe).
Cada edição tem fases (tabela `launch_phases`, já existe com `edition_id`).
A tela de análise de lançamentos já existe — vamos adaptá-la para lançamento pago,
não criar do zero.

---

## Tarefa 1 — Fases automáticas ao criar uma Edição

Quando o usuário criar uma nova edição via `useLaunchEditions.createEdition()`,
o hook deve criar automaticamente as 4 fases padrão do lançamento pago,
vinculadas à edição criada via `edition_id`.

**As 4 fases padrão:**

```typescript
const FASES_LANCAMENTO_PAGO = [
  {
    phase_type: 'captacao',
    name: 'Ingressos',
    primary_metric: 'cpa',
    phase_order: 1,
    notes: 'Venda de ingressos por lotes. Acompanhar passing diário vs meta.',
  },
  {
    phase_type: 'aquecimento',
    name: 'Comparecimento',
    primary_metric: 'show_rate',
    phase_order: 2,
    notes: 'Garantir presença no evento. Meta: 70%+ de show rate.',
  },
  {
    phase_type: 'vendas',
    name: 'Evento',
    primary_metric: 'conversao',
    phase_order: 3,
    notes: 'Evento ao vivo com pitch. Dias 1 e 2.',
  },
  {
    phase_type: 'vendas',
    name: 'Vendas',
    primary_metric: 'roas',
    phase_order: 4,
    notes: 'Carrinho aberto pós-evento. OBs, upsell, downsell.',
  },
];
```

**Datas automáticas (baseadas na edição):**
- Fase 1 Ingressos: `edition.start_date` → `edition.event_date - 1 dia`
- Fase 2 Comparecimento: `edition.event_date - 7 dias` → `edition.event_date`
- Fase 3 Evento: `edition.event_date` → `edition.event_date + 1 dia`
- Fase 4 Vendas: `edition.event_date + 1 dia` → `edition.end_date`

Se `event_date` ou `start_date` forem null, criar as fases sem datas.
O usuário pode editar tudo depois.

**Cópia de edição anterior:**
Se existir edição anterior, copiar as fases dela (comportamento já implementado no hook).
As fases padrão acima só são criadas se for a PRIMEIRA edição do funil.

---

## Tarefa 2 — Identificar funis de Lançamento Pago na tela existente

Na tela de análise de lançamentos (`/app/:projectCode/analises/lancamentos` ou similar),
os funis com `funnel_model = 'lancamento_pago'` devem ser identificados visualmente.

**Mudanças na listagem:**
- Badge diferenciado: "Lançamento Pago" em amber/laranja (vs "Lançamento" em azul)
- Ao expandir um lançamento pago, mostrar as **edições** em vez das fases diretamente
- Cada edição aparece como uma linha colapsável com: nome, data evento, status, ROAS da edição

**Não alterar** a estrutura para lançamentos clássicos — apenas adicionar o comportamento
para `funnel_model = 'lancamento_pago'`.

---

## Tarefa 3 — Tela de análise da edição

Ao clicar em uma edição, abrir uma tela (modal fullscreen ou nova rota) com a análise
detalhada daquela edição.

**Rota sugerida:** `/app/:projectCode/analises/lancamentos/:funnelId/edicoes/:editionId`

**Estrutura da tela (de cima para baixo):**

### Header
- Nome do lançamento + nome da edição (ex: "Meu Lançamento Pago — Janeiro 2026")
- Status badge + datas (início → evento → encerramento)
- Botão "Editar edição"

### KPIs resumo (4 cards)
- Total de ingressos vendidos
- Faturamento total da edição (ingressos + produto + OBs)
- ROAS da edição
- Show rate (se disponível — pode ser N/A por enquanto)

**Como calcular:**
- Ingressos = `orders` com `funnel_id` do lançamento, `economic_day` entre
  `edition.start_date` e `edition.event_date`, filtrando pelas ofertas da Fase 1
- Faturamento = soma de `orders.customer_paid` no período da edição inteira
- ROAS = Faturamento / investimento Meta no período (via `meta_insights`)

**Atenção:** Use `funnel_orders_view` como fonte canônica. Não criar queries diretas
em `orders` sem passar pela view.

### Gráfico de Passing Diário

Este é o elemento mais importante da tela.

Gráfico de barras com linha de meta sobreposta:
- Eixo X: datas do período de ingressos (start_date → event_date)
- Barras: ingressos vendidos por dia (`economic_day`)
- Linha: meta diária calculada = total de ingressos planejados / dias de venda
  - Se não houver planejamento cadastrado, usar média do período como referência
- Cor das barras: verde se ≥ meta, âmbar se 70-99% da meta, vermelho se < 70%

**Dados:** agrupar `funnel_orders_view` por `economic_day` no período da Fase 1.
Filtrar por `funnel_id` da edição.

**Abaixo do gráfico:** linha com totais
- Ingressos vendidos / meta total / % atingido / média diária / dias restantes

### Métricas por fase (simplificado)

4 cards — um por fase — com a métrica principal de cada uma:
- Fase 1 Ingressos: total vendido, CPA médio, % da meta
- Fase 2 Comparecimento: show rate (N/A se não configurado)
- Fase 3 Evento: N/A por enquanto (dados virão de NPS futuro)
- Fase 4 Vendas: vendas do produto principal, ticket médio, ROAS

### Funil de conversão (reutilizar componente existente)

Reutilizar o componente de análise de funil que já existe no perpétuo:
- Ingressos (FRONT da fase 1) → OBs do ingresso → Produto principal → OBs do produto

Não reinventar — importar e adaptar o componente existente passando os dados
filtrados pelo período da edição.

---

## Tarefa 4 — Navegação

Garantir que a navegação funciona corretamente:
- Tela de lançamentos → clica na edição → abre análise da edição
- Análise da edição → botão "Voltar" → tela de lançamentos
- Usar `useTenantNavigation()` — nunca `useNavigate` direto

---

## O que NÃO fazer neste prompt

- Não construir o planejador integrado (vem na Parte B)
- Não construir comparativo entre edições (vem na Parte B)
- Não construir show rate com dados reais (marcar como N/A por enquanto)
- Não alterar nada na tela de análise do lançamento clássico
- Não refatorar o seletor de funis (backlog separado)
- Não criar relatório final ou exportação

---

## Checklist de encerramento

- [ ] Fases criadas automaticamente ao criar primeira edição
- [ ] Lançamentos pagos identificados visualmente na listagem com edições colapsáveis
- [ ] Rota da análise de edição funcionando
- [ ] KPIs resumo calculados corretamente via `funnel_orders_view`
- [ ] Gráfico de passing diário com barras coloridas + linha de meta
- [ ] Funil de conversão reutilizado na tela da edição
- [ ] Navegação funcionando com `useTenantNavigation()`
- [ ] Build: zero erros
- [ ] `debug_log.md` atualizado
- [ ] `TASKS.md` atualizado
- [ ] Todas as migrations commitadas
