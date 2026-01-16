# CRM Performance - Fase 2: N+1 WhatsApp

> Documentação da correção do problema N+1 em `useWhatsAppConversations.ts`
> Implementado em: PROMPT 25

## Problema Identificado

### Antes (N+1 Queries)
```typescript
// 1 query para conversas
const { data } = await supabase
  .from('whatsapp_conversations')
  .select(`*, contact:crm_contacts(...), department:whatsapp_departments(...)`)
  ...

// N queries para agentes (1 por conversa com assigned_to)
const conversationsWithAgents = await Promise.all(
  data.map(async (conv) => {
    if (conv.assigned_to) {
      const { data: agentData } = await supabase
        .from('whatsapp_agents')
        .select('id, display_name, user_id')
        .eq('user_id', conv.assigned_to)
        .single(); // 🔴 1 query por conversa!
    }
  })
);
```

**Impacto:**
- Com 50 conversas atribuídas: **51 queries**
- Com 100 conversas atribuídas: **101 queries**
- Tempo proporcional ao número de conversas

---

## Solução Implementada

### Depois (2 Queries Fixas)
```typescript
// Query 1: Conversas com contacts e departments (JOIN)
const { data } = await supabase
  .from('whatsapp_conversations')
  .select(`*, contact:crm_contacts(...), department:whatsapp_departments(...)`)
  ...

// Coletar user_ids únicos
const assignedUserIds = [...new Set(
  data.filter(conv => conv.assigned_to).map(conv => conv.assigned_to)
)];

// Query 2: Batch único de agentes
const { data: agentsData } = await supabase
  .from('whatsapp_agents')
  .select('id, display_name, user_id')
  .eq('project_id', projectId)
  .in('user_id', assignedUserIds); // ✅ 1 query para todos!

// Criar mapa e associar
const agentsMap = agentsData.reduce((acc, agent) => {
  acc[agent.user_id] = agent;
  return acc;
}, {});

return data.map(conv => ({
  ...conv,
  assigned_agent: conv.assigned_to ? agentsMap[conv.assigned_to] : null,
}));
```

**Resultado:**
- Com 50 conversas atribuídas: **2 queries** (fixo)
- Com 100 conversas atribuídas: **2 queries** (fixo)
- Tempo constante independente do número de conversas

---

## Comparativo de Performance

| Cenário | Antes | Depois | Redução |
|---------|-------|--------|---------|
| 10 conversas atribuídas | 11 queries | 2 queries | 82% |
| 50 conversas atribuídas | 51 queries | 2 queries | 96% |
| 100 conversas atribuídas | 101 queries | 2 queries | 98% |
| 200 conversas atribuídas | 201 queries | 2 queries | 99% |

---

## Validação

### Funcionalidade Mantida
- [x] `assigned_agent.display_name` continua aparecendo na lista
- [x] `assigned_agent.id` disponível para operações
- [x] Filtros de status/departamento/atribuição funcionando
- [x] Real-time subscription inalterada
- [x] Mutations (assign, transfer, updateStatus) inalteradas

### Contrato Preservado
```typescript
interface WhatsAppConversation {
  // ... campos inalterados
  assigned_agent?: {
    id: string;
    display_name: string | null;
    user_id: string;
  };
}
```

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useWhatsAppConversations.ts` | Substituído Promise.all + N queries por batch único |

---

## Próximos Passos (Fase 2 Completa)

- [ ] N+1 em outros hooks (se existirem)
- [ ] Considerar view materializada para conversas com métricas
- [ ] Paginação de conversas para volumes muito grandes

---

## Referências

- [CRM_PERFORMANCE_AUDIT.md](./CRM_PERFORMANCE_AUDIT.md) - Auditoria original
- [CRM_PERFORMANCE_PHASE1.md](./CRM_PERFORMANCE_PHASE1.md) - Quick Wins implementados
