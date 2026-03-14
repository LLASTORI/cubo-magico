# Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas.
> Última atualização: 14/03/2026

---

## 🔴 Prioridade Alta

> Todas as tarefas críticas anteriores foram concluídas. ✅

---

## 🟡 Importante — Mas não urgente

- [ ] **Correção estrutural: desacoplar `order_items` de `ledger_events` no webhook**
  - Hoje: falha em order_items aborta a criação do ledger_event
  - Ideal: ledger deve executar independente de order_items
  - Requer refatoração em `hotmart-webhook/index.ts` ~linha 844

- [ ] **Criar alerta automático para orders sem ledger**
  - Detectar divergência entre `orders` e `ledger_events` antes que vire problema
  - Cron SQL simples ou trigger no Supabase

- [ ] **Validar todos os módulos após reconstrução**
  - CRM, automações, mídia paga, quizzes
  - Confirmar que nenhum módulo foi afetado pelas migrations recentes

---

## 🟡 Importante — Mas não urgente (continuação)

- [ ] **Segurança: criptografar `basic_auth` e `client_id` em `project_credentials`**
  - Hoje só `client_secret` é criptografado; `basic_auth` = Base64(client_id:client_secret) em texto puro
  - Quem tiver acesso ao banco consegue decodificar o secret completo via basic_auth
  - Aplicar o mesmo tratamento de criptografia que já existe para `client_secret`

- [ ] **Sync automático de ofertas Hotmart (cron semanal)**
  - Hoje a sincronização é 100% manual (botão "Sincronizar Ofertas")
  - Se o produtor criar oferta nova na Hotmart, não aparece no cubo até admin clicar
  - Criar cron no Supabase que chame `hotmart-products` (action=sync-offers) semanalmente
  - Exibir data do último sync na UI do Hotmart

---

## 🔵 Próximo projeto — Migração de Analytics para ledger-first

> **Contexto:** O sistema tem dois modelos paralelos ativos:
> - **Novo (ledger-first):** `orders` + `order_items` + `ledger_events` — usado pelo webhook e CSV import
> - **Legado:** `sales_core_events` — ainda usado por Funis, Busca Rápida, Análise Mensal e Insights
>
> O webhook escreve nas duas ao mesmo tempo. O CSV import escreve **só no novo**.
> Consequência: vendas importadas via CSV não aparecem nos Funis e Insights.
> O backfill de API preenche `sales_core_events` mas com `net_amount = 0` (dados financeiros vazios).
>
> **Objetivo:** migrar toda leitura de analytics para `orders + ledger_events`, eliminando a dependência de `sales_core_events` e unificando a fonte de verdade.

- [ ] **Mapear todos os hooks que leem `sales_core_events`**
  - `useSalesCore.ts`, `useFinancialCore.ts`, `useFinanceLedger.ts`
  - `useRevenueSplits.ts`, `useMonthlyAnalysis.ts`, `useFunnelFinancials.ts`
  - `useFunnelData.ts`, `useFinanceTracking.ts`, `useProjectOverview.ts`
  - Entender quais campos cada hook precisa e se existem equivalentes em `ledger_events`

- [ ] **Criar views/queries equivalentes sobre `orders + ledger_events`**
  - Substituir `financial_daily`, `sales_daily`, `refunds_daily` por queries sobre ledger
  - Garantir que os filtros de `project_id`, período e `is_active` funcionem

- [ ] **Migrar hooks um a um (começar pelos mais simples)**
  - Ordem sugerida: `useSalesCore` → `useMonthlyAnalysis` → `useProjectOverview` → `useFunnelFinancials` → `useFunnelData` → `useFinancialCore`
  - Manter flag de feature ou período de transição para validar antes de remover legado

- [ ] **Remover escrita em `sales_core_events` do webhook após validação**
  - Função `writeSalesCoreEvent()` em `hotmart-webhook/index.ts` (~linha 1539)
  - Só remover após todos os hooks migrarem e validação em produção

- [ ] **Decommission final de `sales_core_events`**
  - Migration de drop da tabela
  - Remover edge functions `hotmart-backfill` e `hotmart-ledger-brl-backfill` (já sem UI)
  - Remover `HotmartBackfillSection.tsx` completamente

---

## 🟢 Backlog futuro

- [ ] Mover parsing do CSV para Web Worker (elimina freeze da UI em arquivos grandes)
- [ ] Aumentar chunk size do CSV import de 200 para 500 (reduz de 375 para 150 requisições para imports grandes)
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Revisar e otimizar Edge Functions após estabilização
- [ ] Decommission da edge function `csv-ledger-v21-import` (antiga, substituída por `provider-csv-import`)
- [ ] Fechar batches CSV em status `importing` há mais de 24h como `incomplete` (cron ou trigger)

---

## ✅ Concluído

### Pipeline de vendas (Mar/2026)
- [x] Identificar causa raiz: constraint UNIQUE ausente em `order_items` → webhook abortava antes do ledger
- [x] Adicionar constraint UNIQUE `(order_id, provider_product_id, provider_offer_id)` em `order_items`
- [x] Fix + deploy da função `hotmart-ledger-full-backfill` (coluna errada: `provider_transaction_id` → `provider_order_id`)
- [x] Backfill Grupo A (13 vendas Mar/08–12) — ledgerCreated=136, errors=0 ✅
- [x] Recriar trigger `trigger_derive_order_status` (havia sido deletado em migration 20260303)
- [x] Backfill de status: 741 orders corrigidas de pending → approved/cancelled/refunded
- [x] Fix `item_type` no webhook: `extractOrderItems()` agora usa `resolveItemType()` corretamente
- [x] Backfill de `item_type`: 88 itens atualizados (82 main + 6 bump), zero unknown restantes
- [x] Fix visual modal de pedido: `offer_name` com label "Oferta:" + `provider_offer_id` em pill

### Sistema CSV Import (Mar/2026)
- [x] Implementar sistema de import CSV Hotmart v1 (edge function + frontend)
  - `provider-csv-import` edge function (v1→v2, ACTIVE)
  - `ProviderCSVImport.tsx` + `useProviderCSVImport.ts`
  - Deduplicação: webhook sempre vence (source_origin)
  - Chunks de 200 grupos com acumulação de resultado
- [x] Mover CSV import para Settings → Integrações → Hotmart (saiu de Vendas → Histórico)
- [x] Remover menu Vendas → Histórico do AppHeader
- [x] Implementar CSV Import Safety — 3 camadas:
  - Validação cruzada de produtos no preview (badge verde/amarelo/laranja)
  - Dialog de confirmação obrigatório com nome do projeto
  - Import batch + revert atômico:
    - Tabela `csv_import_batches` (migration `20260314120000`)
    - `batch_id` em `ledger_events.raw_payload`
    - Função SQL SECURITY DEFINER `revert_csv_import_batch()`
    - Edge function `provider-csv-import-revert` (v1, ACTIVE)
    - Componente `CsvImportHistory` com botão "Desfazer" (owner/manager)
- [x] CLAUDE.md reescrito com arquitetura completa
- [x] DEBUG_LOG.md mantido atualizado em tempo real
- [x] Fix parseBrNumber: detecta formato decimal automaticamente (vírgula=BR, ponto=US)
- [x] Fix useProviderCSVImport: invalidateQueries ao finalizar (botão "Desfazer" aparece automaticamente)
- [x] Fix batch único (≤200 grupos) que ficava em status 'importing'
- [x] Grupo B (168 vendas Jan/16–Fev/07): importado via CSV ✅
- [x] Migration `20260311223407_add_order_items_order_product_offer_unique.sql` commitada no git
- [x] Migration `20260313000000_derive_order_status_trigger.sql` criada e commitada

### Infraestrutura
- [x] Instalar MCP do Supabase
- [x] Instalar MCP do Playwright
- [x] Instalar MCP do Context7
- [x] Criar DEBUG_LOG.md para sincronizar contexto entre sessões
