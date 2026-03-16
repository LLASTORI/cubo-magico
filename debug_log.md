# DEBUG LOG — Cubo Mágico

> Atualizado a cada passo da investigação/correção. Use este arquivo para retomar contexto em qualquer sessão futura.

---

## 📅 Última atualização
- **Data:** 2026-03-16 (sessão 9)
- **Status geral:** Pipeline restaurado ✅ | Analytics ledger-first ✅ | Onda 1 `funnel_model` concluída ✅ | Próximo passo: Onda 2 métricas de lançamento pago

---

### [2026-03-16] Onda 1: campo funnel_model — ✅ CONCLUÍDO (sessão 9)
- Migration `20260316125658_add_funnel_model.sql` aplicada e commitada
- CHECK constraint com 9 valores: perpetuo, meteorico, lancamento, lancamento_pago, lancamento_interno, webinar, assinatura, high_ticket, custom
- Nullable — zero breaking change em funnels existentes (funnel_model=NULL para todos)
- `FunnelManager.tsx`: FunnelModel type, FUNNEL_MODEL_LABELS, FUNNEL_MODEL_COLORS, interface Funnel atualizada
- UI: Select de modelo no form de criação e inline edit; badge condicional na listagem
- Tipos Supabase regenerados — funnel_model aparece em funnels Row/Insert/Update

---

### [2026-03-16] Auditoria sistema de tipos de funil — ✅ CONCLUÍDO (sessão 9)
- `funnels.funnel_type` já existe com CHECK (`perpetuo`, `lancamento`, `indefinido`) desde migration `20251210123712`
- Colunas satélite para lançamento: `launch_start_date`, `launch_end_date`, `has_fixed_dates`, `launch_tag`
- Tabelas satélite: `launch_phases`, `phase_campaigns`, `launch_products`, `crm_contact_interactions`
- Dashboard por rota: `/funis` → `useFunnelData` (filtra variantes de 'perpetuo') | `/lancamentos` → `useLaunchData` (filtra 'lancamento' exato)
- `funnel-ai-analysis` prompt hardcoded para perpétuos — não recebe `funnel_type` como parâmetro
- Artefato: `docs/FUNNEL_TYPE_AUDIT.md` + `docs/FUNNEL_MODELS.md`

---

### [2026-03-15] UTM Attribution + Fix item_type + useFunnelHealthMetrics — ✅ CONCLUÍDO (sessão 8)
- `funnel_orders_view` recriada com campos UTM
- `useFunnelData.ts` adapter passa UTMs reais
- `UTMAnalysis.tsx` revenue usa `gross_amount` (canônico)
- Backfill `item_type='unknown'` → 88 itens corrigidos; fallback na view
- `useFunnelHealthMetrics` migrado de `hotmart_sales` → `crm_transactions`
- Migration: `20260315280000_backfill_order_items_type_and_main_offer_fallback.sql` ✅

---

### [2026-03-15] Infraestrutura e segurança — ✅ CONCLUÍDO (sessão 7)
- `hotmart-offers-cron` ACTIVE — sync semanal segunda 07:00 UTC
- `orders-health-check` ACTIVE — alerta diário 08:00 UTC
- `client_id` criptografado em `project_credentials`
- Race condition coprodução corrigida: `UNIQUE(order_id, provider_event_id)`
- Backfill 674 orders → ~R$130.000 recuperados nos relatórios

---

### [2026-03-15] CRM e pipeline — ✅ CONCLUÍDO (sessões 5-6)
- `useCRMJourneyData` migrado para `crm_journey_orders_view` (8.455 pedidos)
- `crm_transactions` mantida (log de eventos CRM + trigger detect_auto_recovery)
- CRM aba Transações + pipeline filters corrigidos

---

### [2026-03-14] Analytics ledger-first + decommission legado — ✅ CONCLUÍDO (sessões 2-4)
- `finance_ledger_summary` migrada: 693 → 6.255 pedidos
- `sales_core_events` dropada + edge functions legadas removidas
- CSV Import Safety completo (3 camadas)
- Grupo B: 168 vendas recuperadas via CSV

---

### [2026-03-13] Pipeline de vendas restaurado — ✅ CONCLUÍDO
- Causa raiz: constraint UNIQUE ausente em `order_items`
- Grupo A: 13 vendas recuperadas
- Trigger `trigger_derive_order_status` recriado
- **Receita recuperada: R$ 8.178,18** 🎉

---

## 🔎 Observações Técnicas Permanentes

- `order_items.offer_code` nunca populado — webhook usa `provider_offer_id`
- `order_items.funnel_id` nunca populado — atribuição via `offer_mappings.funnel_id`
- `customer_paid_brl` nunca populado pelo webhook — usar `COALESCE(customer_paid_brl, customer_paid)`
- `offer_mappings.codigo_oferta` = `order_items.provider_offer_id` (chave de join para funil)
- `provider_event_log` NÃO tem coluna `order_id`
- Webhook sempre vence CSV: `exists_webhook_ledger` → skip total
