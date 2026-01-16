# CRM PERFORMANCE AUDIT

> **Documento de Auditoria de Performance do CRM**  
> Versão: 1.0  
> Data: 2026-01-16  
> Status: MAPEAMENTO COMPLETO

---

## 📋 SUMÁRIO EXECUTIVO

Esta auditoria mapeia todos os gargalos de performance do CRM, classificando por tipo e propondo soluções sem implementar ainda.

**Áreas auditadas:**
- A) Cartão do Contato (`/crm/contact/:id`)
- B) CRM Kanban (`/crm/kanban`)
- C) CRM Recovery Kanban (`/crm/recovery/kanban`)
- D) CRM Visão Geral / Análises (`/crm`)
- E) CRM Recovery Analytics (`/crm/recovery`)

---

## 1️⃣ CARTÃO DO CONTATO — AUDITORIA COMPLETA

### 1.1 Hooks Disparados no Mount

| # | Hook | Arquivo | Query Principal | Paralelo? | Poderia ser Lazy? |
|---|------|---------|-----------------|-----------|-------------------|
| 1 | `useCRMContact` | `useCRMContact.ts` | `crm_contacts WHERE id = ?` | ✅ Sim | ❌ Não (essencial) |
| 2 | `usePipelineStages` | `usePipelineStages.ts` | `crm_pipeline_stages WHERE project_id` | ✅ Sim | ✅ Sim |
| 3 | `useCRMContactJourney` | `useCRMContactJourney.ts` | `crm_contact_interactions` + joins | ✅ Sim | ✅ Sim (tab) |
| 4 | `useWhatsAppNumbers` | `useWhatsAppNumbers.ts` | `whatsapp_numbers + instances` | ✅ Sim | ✅ Sim |
| 5 | `useWhatsAppConversations` | `useWhatsAppConversations.ts` | `whatsapp_conversations + agents` | ✅ Sim | ✅ Sim (N+1!) |
| 6 | `useProject` | Context | Já carregado | ✅ Sim | - |
| 7 | `useProjectNavigation` | Hook | Sem query | ✅ Sim | - |

### 1.2 Componentes Filhos com Queries Próprias

| # | Componente | Hook Interno | Query | Lazy Load? | Tab Dependente |
|---|------------|--------------|-------|------------|----------------|
| 1 | `ContactTransactionsList` | useQuery inline | `crm_orders_view` + `crm_order_items_view` | ❌ Dispara sempre | `transactions` |
| 2 | `ContactActivitiesList` | `useCRMActivities` | `crm_activities_tasks` | ❌ Dispara sempre | `activities` |
| 3 | `ContactWhatsAppHistory` | useQuery inline | `whatsapp_messages` | ❌ Dispara sempre | `whatsapp` |
| 4 | `ContactIdentityTab` | `useContactIdentity` | `contact_identity_events` | ❌ Dispara sempre | `identity` |
| 5 | `ContactQuizzesTab` | `useContactQuizzes` | `quiz_sessions + responses` | ❌ Dispara sempre | `quizzes` |
| 6 | `ContactSurveysTab` | useQuery inline | `survey_responses` | ❌ Dispara sempre | `surveys` |
| 7 | `ContactSocialTab` | useQuery inline | `social_comments` | ❌ Dispara sempre | `social` |
| 8 | `ContactCognitiveProfile` | `useContactProfile` | `contact_profiles` | ❌ Dispara sempre | sidebar |
| 9 | `ContactOrdersMetricsCard` | `useCRMContactOrdersMetrics` | `crm_contact_orders_metrics_view` | ❌ Dispara sempre | sidebar |
| 10 | `ContactOrdersAttributionCard` | `useContactOrdersAttribution` | Orders Core | ❌ Dispara sempre | sidebar |
| 11 | `ContactAttributionCard` | N/A (usa contact) | Sem query própria | - | sidebar |
| 12 | `ContactAIRecommendations` | `useContactPredictions` | `contact_predictions` | ❌ Dispara sempre | sidebar |
| 13 | `ContactAgentSuggestions` | useQuery inline | `agent_decisions_log` | ❌ Dispara sempre | sidebar |
| 14 | `ContactMemoryCard` | `useContactMemory` | `contact_memory` | ❌ Dispara sempre | sidebar |
| 15 | `ContactSegmentInsights` | Via `useCRMContactJourney` | Já incluso | - | sidebar |

### 1.3 Contagem Total de Queries

```
🔴 CRÍTICO: 15+ queries paralelas no mount inicial

Queries no CRMContactCard.tsx (mount):
├── useCRMContact ................... 1 query
├── usePipelineStages ............... 1 query
├── useCRMContactJourney ............ 1-2 queries
├── useWhatsAppNumbers .............. 1 query
└── useWhatsAppConversations ........ 1 + N queries (N+1 problem!)

Queries em componentes filhos:
├── ContactTransactionsList ......... 2 queries (orders + items)
├── ContactActivitiesList ........... 1 query
├── ContactWhatsAppHistory .......... 1 query
├── ContactIdentityTab .............. 1 query
├── ContactQuizzesTab ............... 2 queries
├── ContactSurveysTab ............... 1 query
├── ContactSocialTab ................ 1 query
├── ContactCognitiveProfile ......... 1 query
├── ContactOrdersMetricsCard ........ 1 query
├── ContactOrdersAttributionCard .... 1 query
├── ContactAIRecommendations ........ 1 query
├── ContactAgentSuggestions ......... 1 query
└── ContactMemoryCard ............... 1 query

TOTAL: ~20-25 queries no mount!
```

### 1.4 Problema N+1 Identificado

```typescript
// useWhatsAppConversations.ts:94-113
const conversationsWithAgents = await Promise.all(
  (data || []).map(async (conv) => {
    if (conv.assigned_to) {
      // 🔴 N+1: 1 query por conversa!
      const { data: agentData } = await supabase
        .from('whatsapp_agents')
        .select('...')
        .eq('user_id', conv.assigned_to)
        .single();
    }
  })
);
```

---

## 2️⃣ CRM KANBAN — AUDITORIA

### 2.1 Queries no Mount

| Query | Tabela | Filtro | Problema |
|-------|--------|--------|----------|
| Contacts | `crm_contacts` | `project_id` | 🔴 Carrega TODOS os contatos |
| Transactions | `crm_transactions` | `project_id + contact_ids` | 🔴 N batches de 50 IDs |
| Stages | `crm_pipeline_stages` | `project_id` | ✅ OK (pequeno) |

### 2.2 Análise de Payload

```typescript
// CRMKanban.tsx:102-142
const { data: contactsData } = await supabase
  .from('crm_contacts')
  .select('id, name, email, phone, pipeline_stage_id, total_revenue, total_purchases, last_activity_at, updated_at, tags')
  .eq('project_id', currentProject.id)
  // 🔴 SEM PAGINAÇÃO - carrega todos!
  .order('updated_at', { ascending: false });

// Depois, para cada batch de 50 contatos:
for (let i = 0; i < contactIds.length; i += batchSize) {
  // 🔴 N queries adicionais para transações
  const { data: transactionsData } = await supabase
    .from('crm_transactions')
    .select('contact_id, transaction_date, created_at')
    .in('contact_id', batchIds);
}
```

### 2.3 Impacto Estimado

| Cenário | Contatos | Queries | Tempo Estimado |
|---------|----------|---------|----------------|
| Pequeno | 100 | 3 | ~500ms |
| Médio | 500 | 11 | ~1.5s |
| Grande | 2000 | 41 | ~5s+ |

---

## 3️⃣ CRM RECOVERY KANBAN — AUDITORIA

### 3.1 Queries no Mount

```typescript
// CRMRecoveryKanban.tsx:220-264
// Query 1: Transações de recuperação
const { data: transactions } = await supabase
  .from('crm_transactions')
  .select('contact_id, status')
  .eq('project_id', currentProject.id)
  .in('status', ['CANCELLED', 'CHARGEBACK', 'REFUNDED', 'ABANDONED']);
  // 🔴 SEM PAGINAÇÃO

// Query 2: Contatos em batches de 100
for (let i = 0; i < contactIds.length; i += batchSize) {
  const { data: contactsData } = await supabase
    .from('crm_contacts')
    .select('id, name, email, phone, total_revenue, recovery_stage_id, ...')
    .in('id', batchIds);
}
```

### 3.2 Problemas Identificados

| Problema | Tipo | Impacto |
|----------|------|---------|
| Carrega todas transações negativas | Overfetch | 🔴 Alto |
| Batches sequenciais de contatos | Arquitetura | 🟠 Médio |
| Sem cache de estágios de recuperação | Performance | 🟡 Baixo |

---

## 4️⃣ CRM VISÃO GERAL / ANÁLISES — AUDITORIA

### 4.1 CustomerJourneyAnalysis (LEGADO)

```typescript
// useCRMJourneyData.ts - Queries identificadas:

// Query 1: Todos os contatos
const { data: contacts } = await supabase
  .from('crm_contacts')
  .select('*')
  .eq('project_id', currentProject.id);
  // 🔴 SELECT * sem paginação

// Query 2: Todas as transações
const { data: transactions } = await supabase
  .from('crm_transactions')
  .select('*')
  .eq('project_id', currentProject.id);
  // 🔴 SELECT * sem paginação

// Query 3: Offer mappings
const { data: offerMappings } = await supabase
  .from('offer_mappings')
  .select('*');

// Query 4: Funnels
const { data: funnels } = await supabase
  .from('funnels')
  .select('id, name');
```

### 4.2 Processamento Client-Side

```typescript
// 🔴 CRÍTICO: Todo o processamento é feito no cliente!
// useCRMJourneyData.ts processa:
// - Agrupamento por contato
// - Cálculo de jornadas
// - Métricas de cohort
// - Análise de origem
// - Breakdowns por produto/funil/source
```

### 4.3 AscensionAnalysis

| Query | Tabela | Problema |
|-------|--------|----------|
| Jornadas | Via `useCRMJourneyData` | 🔴 Mesmos problemas |
| Filtros | Client-side | 🔴 Re-processa tudo |

---

## 5️⃣ CRM RECOVERY ANALYTICS — AUDITORIA

### 5.1 RecoveryAnalytics Component

```typescript
// RecoveryAnalytics.tsx:55-142 - Queries identificadas:

// Query 1: Transações negativas (paginadas!)
let allTransactions: any[] = [];
while (hasMore) {
  const { data } = await supabase
    .from('crm_transactions')
    .select('*')
    .in('status', ['REFUNDED', 'CANCELLED', 'CHARGEBACK'])
    .gte('transaction_date', startDateTime)
    .lte('transaction_date', endDateTime)
    .range(page * pageSize, (page + 1) * pageSize - 1);
  // ✅ Paginação implementada, mas:
  // 🔴 Carrega TODOS os resultados em memória
}

// Query 2: Transações aprovadas (mesmo padrão)
// 🔴 Carrega todas para calcular taxa de perda
```

### 5.2 CRMRecovery Page

```typescript
// CRMRecovery.tsx:114-371 - Queries identificadas:

// Query 1: Transações CRM de recuperação
const { data: transactions } = await supabase
  .from('crm_transactions')
  .select('contact_id, status, transaction_date')
  .in('status', crmRecoveryStatuses)
  .gte('transaction_date', startDateTime)
  .lte('transaction_date', endDateTime);
  // ✅ Filtro de data

// Query 2: Carrinhos abandonados (hotmart_sales)
const { data: abandonedSales } = await supabase
  .from('hotmart_sales')
  .select('buyer_email, buyer_name, buyer_phone, sale_date, total_price, ...')
  .eq('status', 'ABANDONED')
  .gte('sale_date', startDateTime);
  // 🔴 Múltiplos batches

// Query 3: Contatos por email (batches)
// Query 4: Compras aprovadas (para verificar conversão)
// Query 5: Contatos por ID (batches)
```

---

## 6️⃣ CLASSIFICAÇÃO DE PROBLEMAS

### 🔴 CRÍTICOS (Arquitetura)

| # | Problema | Local | Tipo | Impacto |
|---|----------|-------|------|---------|
| 1 | 20+ queries no mount do Cartão | `CRMContactCard.tsx` | Arquitetura | 🔴 Muito Alto |
| 2 | N+1 em WhatsApp conversations | `useWhatsAppConversations.ts` | SQL | 🔴 Alto |
| 3 | SELECT * sem paginação | `useCRMJourneyData.ts` | Overfetch | 🔴 Muito Alto |
| 4 | Processamento client-side massivo | `useCRMJourneyData.ts` | Arquitetura | 🔴 Muito Alto |
| 5 | Todos contatos no Kanban | `CRMKanban.tsx` | Overfetch | 🔴 Alto |

### 🟠 ALTOS (Lógica)

| # | Problema | Local | Tipo | Impacto |
|---|----------|-------|------|---------|
| 6 | Batches sequenciais de transações | `CRMKanban.tsx` | Performance | 🟠 Alto |
| 7 | Todas transações em Recovery | `CRMRecoveryKanban.tsx` | Overfetch | 🟠 Alto |
| 8 | Reprocessamento em cada filtro | `CustomerJourneyAnalysis.tsx` | Lógica | 🟠 Alto |
| 9 | Múltiplas tabelas em Recovery | `CRMRecovery.tsx` | Arquitetura | 🟠 Médio |

### 🟡 MÉDIOS (UX/Performance)

| # | Problema | Local | Tipo | Impacto |
|---|----------|-------|------|---------|
| 10 | Tabs não são lazy | `CRMContactCard.tsx` | UX/Perf | 🟡 Médio |
| 11 | Sidebar carrega tudo | `CRMContactCard.tsx` | UX/Perf | 🟡 Médio |
| 12 | Sem skeleton loading uniforme | Vários | UX | 🟡 Baixo |
| 13 | staleTime muito baixo | Vários hooks | Cache | 🟡 Baixo |

### 🟢 BAIXOS (Já Otimizados)

| # | Item | Local | Status |
|---|------|-------|--------|
| 14 | `useCRMContactOrdersMetrics` | Hook | ✅ staleTime: 5min |
| 15 | `usePipelineStages` | Hook | ✅ Query simples |
| 16 | RecoveryAnalytics paginação | Component | ✅ Implementada |

---

## 7️⃣ PROPOSTAS DE OTIMIZAÇÃO

### A) CARTÃO DO CONTATO

| Problema | Solução Mínima | Solução Ideal | Impacto |
|----------|----------------|---------------|---------|
| 20+ queries | Lazy load tabs | Hook agregador único | 🔴 Alto |
| N+1 WhatsApp | JOIN em SQL | View materializada | 🟠 Médio |
| Sidebar pesada | Skeleton loading | Lazy on viewport | 🟡 Médio |

**Solução Ideal: Hook Agregador**
```typescript
// Proposta: useCRMContactFull(contactId)
// 1 query única que retorna:
// - contact + stages + metrics + predictions
// Via view: crm_contact_full_view
```

### B) CRM KANBAN

| Problema | Solução Mínima | Solução Ideal | Impacto |
|----------|----------------|---------------|---------|
| Todos contatos | Limit 200 | Paginação virtual | 🔴 Alto |
| Batches de txs | Remover txs | View com last_tx | 🟠 Alto |
| Filtros client | Mover para SQL | Índices + paginação | 🟠 Médio |

**Solução Ideal: View + Paginação**
```sql
-- crm_kanban_contacts_view
SELECT 
  c.id, c.name, c.email, c.phone,
  c.pipeline_stage_id, c.total_revenue, c.tags,
  MAX(t.transaction_date) as last_transaction_date
FROM crm_contacts c
LEFT JOIN crm_transactions t ON t.contact_id = c.id
GROUP BY c.id
```

### C) CRM RECOVERY KANBAN

| Problema | Solução Mínima | Solução Ideal | Impacto |
|----------|----------------|---------------|---------|
| Todas txs negativas | Limit + offset | View materializada | 🟠 Alto |
| Batches contatos | Single query | JOIN direto | 🟠 Médio |

### D) CRM ANÁLISES / JORNADA

| Problema | Solução Mínima | Solução Ideal | Impacto |
|----------|----------------|---------------|---------|
| SELECT * | Colunas específicas | Views agregadas | 🔴 Alto |
| Processing client | Filtros em SQL | Views materializadas | 🔴 Muito Alto |
| Sem cache | staleTime: 10min | React Query persistor | 🟠 Médio |

**Solução Ideal: Migrar para Orders Core**
```
CustomerJourneyAnalysis → CustomerJourneyOrders (já existe!)
useCRMJourneyData → useCRMJourneyOrders (já existe!)
```

### E) CRM RECOVERY ANALYTICS

| Problema | Solução Mínima | Solução Ideal | Impacto |
|----------|----------------|---------------|---------|
| Múltiplas queries | Agregação server | View materializada | 🟠 Médio |
| Cálculos client | useMemo otimizado | Função SQL | 🟡 Baixo |

---

## 8️⃣ PLANO FASEADO DE OTIMIZAÇÃO

### FASE 1: Quick Wins (Baixo Esforço, Alto Impacto)

| # | Ação | Arquivo(s) | Esforço | Impacto |
|---|------|------------|---------|---------|
| 1 | Aumentar staleTime para 5min | Todos os hooks | 🟢 1h | 🟠 Médio |
| 2 | Lazy load tabs do Cartão | `CRMContactCard.tsx` | 🟢 2h | 🔴 Alto |
| 3 | Limit 200 no Kanban | `CRMKanban.tsx` | 🟢 30min | 🔴 Alto |
| 4 | Remover query de transactions no Kanban | `CRMKanban.tsx` | 🟢 1h | 🟠 Médio |

### FASE 2: Otimizações Médias (Médio Esforço, Alto Impacto)

| # | Ação | Arquivo(s) | Esforço | Impacto |
|---|------|------------|---------|---------|
| 5 | Corrigir N+1 WhatsApp | `useWhatsAppConversations.ts` | 🟡 3h | 🟠 Alto |
| 6 | View para Kanban contacts | Migration + Hook | 🟡 4h | 🔴 Alto |
| 7 | Skeleton loading uniforme | Componentes de tab | 🟡 2h | 🟡 Médio |
| 8 | Depreciar `CustomerJourneyAnalysis` | CRM.tsx | 🟡 2h | 🔴 Alto |

### FASE 3: Refatorações (Alto Esforço, Muito Alto Impacto)

| # | Ação | Arquivo(s) | Esforço | Impacto |
|---|------|------------|---------|---------|
| 9 | Hook agregador para Cartão | Novo hook + view | 🔴 8h | 🔴 Muito Alto |
| 10 | Paginação virtual no Kanban | Componente + backend | 🔴 8h | 🔴 Alto |
| 11 | Views materializadas | Migrations | 🔴 6h | 🔴 Muito Alto |
| 12 | Migrar Recovery para Orders Core | Vários | 🔴 12h | 🟠 Médio |

---

## 9️⃣ MÉTRICAS DE SUCESSO

### Antes (Estimado)

| Tela | Queries | Tempo Load | Payload |
|------|---------|------------|---------|
| Cartão do Contato | 20-25 | 2-4s | ~500KB |
| Kanban (500 contatos) | 11 | 1.5s | ~200KB |
| Recovery Kanban | 8-15 | 1-2s | ~150KB |
| Análises/Jornada | 4-5 | 3-5s | ~1MB+ |

### Depois (Meta - Fase 1+2)

| Tela | Queries | Tempo Load | Payload |
|------|---------|------------|---------|
| Cartão do Contato | 5-8 | 0.5-1s | ~100KB |
| Kanban (500 contatos) | 2 | 0.5s | ~50KB |
| Recovery Kanban | 2-3 | 0.5s | ~50KB |
| Análises/Jornada | 2-3 | 1-2s | ~200KB |

### Depois (Meta - Fase 3)

| Tela | Queries | Tempo Load | Payload |
|------|---------|------------|---------|
| Cartão do Contato | 2-3 | <0.5s | ~50KB |
| Kanban (2000+ contatos) | 1-2 | 0.5s | ~50KB (virtual) |
| Todas as telas | <5 | <1s | <100KB |

---

## 🔟 CONCLUSÃO

### Prioridade 1 (Implementar no PROMPT 24)
1. ✅ Lazy load tabs no Cartão do Contato
2. ✅ Limit + remover query extra no Kanban
3. ✅ Aumentar staleTime global

### Prioridade 2 (PROMPT 24B ou 25)
4. Corrigir N+1 WhatsApp
5. Depreciar CustomerJourneyAnalysis
6. Skeleton loading uniforme

### Prioridade 3 (Futuro)
7. Views materializadas
8. Hook agregador para Cartão
9. Paginação virtual

---

## 📎 REFERÊNCIAS

- `docs/CRM_ARCHITECTURE_CANONICAL_MAP.md` — Arquitetura oficial
- `docs/CRM_ROUTING_AND_NAVIGATION_AUDIT.md` — Auditoria de navegação
- `docs/CRM_ROUTING_FIXES.md` — Correções implementadas

---

**Documento de auditoria completo. Base para PROMPT 24 (implementação de otimizações).**
