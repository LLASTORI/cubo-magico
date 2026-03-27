# Sessão 37 — Cubo Mágico: 4 tarefas em sequência

Contexto: continuação da sessão 36. Onda 2E concluída.
Executar as 4 tarefas abaixo em sequência. Após cada tarefa, confirmar build zero erros antes de avançar.

---

## TAREFA 1 — Migrar `useFunnelHealthMetrics` de `hotmart_sales` → `funnel_orders_view`

### Contexto
`useFunnelHealthMetrics` ainda usa a tabela `hotmart_sales` que foi depreciada. Isso faz o bloco
`FunnelHealthMetrics` retornar zeros na tela `LaunchEditionAnalysis` e em qualquer tela que o use.
A fonte canônica é `funnel_orders_view`.

### O que fazer

Localizar `src/hooks/useFunnelHealthMetrics.ts` (ou nome similar) e refatorar:

**Lógica atual (depreciada):**
- Buscava `hotmart_sales` com filtros de `offer_code`, `status`, datas

**Nova lógica (ledger-first):**
- Buscar `funnel_orders_view` filtrada por:
  - `project_id` (obrigatório)
  - `funnel_id` (quando disponível, via `offer_mappings`)
  - `offer_codes` (array com os códigos da oferta)
  - `economic_day` no range de datas
  - `status = 'approved'` (ou equivalente na view)

**Métricas que o hook precisa retornar:**
- `totalSales` — count de pedidos únicos
- `totalRevenue` — soma de `gross_amount`
- `conversionRate` — calculado sobre leads (se disponível)
- `abandonedCount` — de `crm_transactions` onde `status IN ('ABANDONED', 'CANCELLED', 'EXPIRED')`
- `recoveredCount` — de `crm_transactions` onde tag `auto_recovery` existe ou status mudou de abandoned para approved

**Referências importantes (do CLAUDE.md):**
- `funnel_orders_view` é a view canônica — expõe `gross_amount`, `economic_day`, `main_offer_code`, UTMs
- `crm_transactions` mantém TODOS os status (ABANDONED, DELAYED, CANCELLED, EXPIRED) — não dropar, usar para métricas de abandono
- `offer_mappings.codigo_oferta = order_items.provider_offer_id` (chave de join para funil)
- `customer_paid_brl` nunca populado pelo webhook — usar `COALESCE(customer_paid_brl, customer_paid)`

**Parâmetros de entrada do hook:**
```typescript
interface UseFunnelHealthMetricsParams {
  projectId: string;
  funnelId?: string;
  offerCodes?: string[];
  dateFrom?: string;
  dateTo?: string;
}
```

Após refatorar: verificar se `FunnelHealthMetrics.tsx` precisa de ajustes para consumir os novos dados.

**Build:** `npm run build` — zero erros antes de avançar.

---

## TAREFA 2 — Renomear "Análise de Funil" → "Análise de Perpétuos" no menu

### Contexto
A rota `/funis` e o menu lateral chamam a seção de "Análise de Funil". Como o app agora tem análise
específica para lançamentos (`/lancamentos`), a nomenclatura "Análise de Funil" ficou ambígua.
Perpétuos têm sua própria análise e o nome deve refletir isso.

### O que fazer

1. **Menu lateral / navegação** — localizar onde o item de menu "Análise de Funil" está definido
   (provavelmente em `src/components/layout/Sidebar.tsx` ou arquivo de rotas/nav) e renomear para
   **"Análise de Perpétuos"**

2. **Títulos internos de página** — em `FunnelAnalysis.tsx` ou `FunnelDashboard.tsx`, atualizar
   qualquer `<h1>`, `<title>`, breadcrumb ou `PageHeader` que diga "Análise de Funil" para
   "Análise de Perpétuos"

3. **Tooltips e textos de ajuda** — buscar por "Análise de Funil" em todo o codebase e atualizar
   onde fizer sentido. Não alterar nomes de variáveis, funções, hooks ou arquivos — apenas textos
   visíveis para o usuário.

4. **NÃO alterar:**
   - Nomes de arquivos
   - Nomes de hooks (`useFunnelData`, etc.)
   - Nomes de rotas (`/funis`, `/app/:projectCode/funis`)
   - Nomes de componentes internos
   - Nada que possa quebrar imports ou roteamento

**Build:** `npm run build` — zero erros antes de avançar.

---

## TAREFA 3 — Investigar TX ingresso→produto 0% no `LaunchPagoConversaoBlock`

### Contexto
Na tela `LaunchEditionAnalysis`, o bloco "Funil de Conversão" mostra:
- Compradores do ingresso: 28 ✅ (correto)
- Compradores do produto principal: 0 ❌ (suspeito)
- TX ingresso→produto: 0.0% ❌
- Receita produto principal: R$0 ❌

Isso pode ser bug de cálculo ou pode ser real (produto principal ainda não vendido nesta edição).
Precisamos investigar e, se for bug, corrigir.

### O que fazer

**Passo 1 — Diagnóstico via SQL (via MCP Supabase ou SQL Editor):**

```sql
-- Ver offer_mappings vinculados a fases deste funil
SELECT om.id, om.codigo_oferta, om.tipo_posicao, om.phase_id, lp.name as phase_name, lp.phase_type
FROM offer_mappings om
LEFT JOIN launch_phases lp ON lp.id = om.phase_id
WHERE om.funnel_id = '[ID_DO_FUNIL_LAMP_MAR]'
  AND om.is_active = true
ORDER BY om.tipo_posicao;

-- Ver vendas da edição com breakdown por oferta
SELECT oi.provider_offer_id, oi.item_type, COUNT(*) as qtd, SUM(oi.base_price) as receita
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.project_id = '[PROJECT_ID]'
  AND o.created_at BETWEEN '[EDITION_START]' AND '[EDITION_END]'
  AND o.status = 'approved'
GROUP BY oi.provider_offer_id, oi.item_type
ORDER BY qtd DESC;
```

**Passo 2 — Verificar lógica do `LaunchPagoConversaoBlock.tsx`:**
- Como ele identifica "produto principal" vs "ingresso"?
- Usa `phase_id` dos `offer_mappings` ou `item_type` dos `order_items`?
- O `phase_id` está populado nas `offer_mappings` desta edição?

**Passo 3 — Baseado no diagnóstico:**

**Se for bug de lógica:** corrigir o cálculo no componente/hook para identificar corretamente
o produto principal (fase com `phase_type` em `['vendas', 'pitch', 'produto_principal']` ou
`offer_mappings.tipo_posicao = 'FRONT'` e `phase_id` apontando para fase correta).

**Se for dado real** (produto principal genuinamente sem vendas): adicionar estado visual claro
no bloco indicando "Produto principal ainda não tem vendas nesta edição" em vez de mostrar
zeros que parecem bug.

**Adicionar** ao debug_log.md o diagnóstico e conclusão, seja bug ou dado real.

**Build:** `npm run build` — zero erros antes de avançar.

---

## TAREFA 4 — Refinamentos visuais/UX na tela de edição

### Contexto
A tela `LaunchEditionAnalysis` está funcional mas pode ter melhorias visuais e de usabilidade
com base no print da sessão 36.

### O que fazer

Aplicar os seguintes refinamentos (consultar skill `cubo-design` para paleta e padrões):

**4.1 — "Block rate: N/A — Disponível em breve"**
- Verificar se o card de show rate (`block_rate` ou `show_rate`) deve mostrar dado real ou
  continuar como placeholder.
- Se é calculável (presença no evento ÷ ingressos vendidos), implementar o cálculo.
- Se genuinamente não há fonte de dados ainda, melhorar o visual do estado vazio:
  usar ícone + mensagem clara em vez de "N/A" bruto.

**4.2 — Espaçamento e separação entre blocos**
- Garantir que cada bloco (KPIs, PassingDiário, FunnelConversão, PaymentMethod,
  FunnelHealth, UTM, MetaHierarchy) tenha separação visual clara.
- Adicionar `mb-6` ou `space-y-6` consistente entre seções.
- Verificar se há blocos colados um no outro sem respiro visual.

**4.3 — Estado vazio do `FunnelHealthMetrics`**
- Se após a Tarefa 1 ainda houver casos onde o bloco pode ter dados zerados legitimamente,
  adicionar um estado vazio elegante (ícone + texto descritivo), não apenas zeros.

**4.4 — Título da tela de edição**
- Verificar se o título mostra corretamente: nome do funil + nome/número da edição.
- Ex: "LAMP_MAR — Abril 26" ou "Lançamento Março — Edição Abril_26"
- Formato atual adequado ou precisa de ajuste?

**Paleta obrigatória (cubo-design):**
- Background: `#0f1117`
- Cards: `#1a1f2e` com border `#2a3050`
- Destaques: `#22d3ee` (ciano) e `#2563eb` (azul)
- Valores KPI: `text-cyan-400 font-bold`
- Estados vazios: ícone em `text-gray-600` + texto em `text-gray-500`

**Build final:** `npm run build` — zero erros.

---

## Ao final de TODAS as 4 tarefas

1. `npm run build` — confirmar zero erros
2. Atualizar `debug_log.md` com entrada para sessão 37
3. Atualizar `TASKS.md`: marcar Tarefa 1-4 como ✅ e criar "Onda 3" se necessário
4. `git add -A && git commit -m "feat: migra FunnelHealthMetrics + renomeia menu + fixes tela edição (sessão 37)"`

---

## Regras críticas que nunca podem ser violadas

- `offer_code` em `order_items` é sempre NULL — usar `provider_offer_id`
- `provider_event_log` NÃO tem coluna `order_id`
- `customer_paid_brl` nunca populado pelo webhook — usar `COALESCE(customer_paid_brl, customer_paid)`
- Navegação sempre via `useTenantNavigation()` — nunca `useNavigate` direto
- Migrations aplicadas no banco DEVEM ter arquivo `.sql` commitado no git
- Webhook Hotmart é fonte única da verdade financeira — nunca sobrescrever
