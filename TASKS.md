# Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas.
> Última atualização: 14/03/2026

---

## 🔴 Prioridade Alta

- [ ] **Grupo B — 168 vendas sem ledger (Jan/16–Fev/07)**
  - CSV safety implementado e testado — pronto para importar
  - Exportar CSV Hotmart do período 16/01 a 07/02/2026
  - Importar via Settings → Integrações → Hotmart → Importar Histórico
  - Verificar no dashboard se as vendas aparecem (R$ 8.178,18 esperado)

- [ ] **Migration oficial para o trigger `trigger_derive_order_status`**
  - Trigger foi recriado manualmente em 13/03, sem migration no git
  - Criar `supabase/migrations/YYYYMMDD_derive_order_status_trigger.sql`
  - Garantir que não seja perdido em futuros resets/branches

- [ ] **Commitar migration `20260311223407_add_order_items_order_product_offer_unique.sql`**
  - Arquivo existe no banco mas está untracked no git
  - Crítico: sem isso um reset de branch perde a constraint UNIQUE de order_items

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

## 🟢 Backlog futuro

- [ ] Mover parsing do CSV para Web Worker (elimina freeze da UI em arquivos grandes)
- [ ] Aumentar chunk size do CSV import de 200 para 500 (reduz de 375 para 150 requisições para imports grandes)
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Revisar e otimizar Edge Functions após estabilização
- [ ] Decommission da edge function `csv-ledger-v21-import` (antiga, substituída por `provider-csv-import`)

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

### Infraestrutura
- [x] Instalar MCP do Supabase
- [x] Instalar MCP do Playwright
- [x] Instalar MCP do Context7
- [x] Criar DEBUG_LOG.md para sincronizar contexto entre sessões
