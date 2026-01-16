# CRM Performance - Fase 1 (Quick Wins)

> **Documento de Implementação de Performance**  
> Versão: 1.0  
> Data: 2026-01-16  
> Status: IMPLEMENTADO

---

## 📋 SUMÁRIO

Este documento registra as otimizações de performance implementadas na Fase 1 (Quick Wins) do CRM, conforme documentado em `CRM_PERFORMANCE_AUDIT.md`.

---

## ✅ O QUE FOI IMPLEMENTADO

### Quick Win #1: Lazy Load das Tabs do Cartão do Contato

**Arquivos alterados:** `src/pages/CRMContactCard.tsx`

**Problema original:**
- 15+ componentes carregavam queries no mount inicial
- Todas as tabs disparavam hooks independentemente de estar visíveis

**Solução implementada:**
1. **React.lazy() para componentes pesados:**
   ```typescript
   const ContactActivitiesList = lazy(() => import('@/components/crm/ContactActivitiesList').then(m => ({ default: m.ContactActivitiesList })));
   const ContactTransactionsList = lazy(() => import('@/components/crm/ContactTransactionsList').then(m => ({ default: m.ContactTransactionsList })));
   const ContactWhatsAppHistory = lazy(() => import('@/components/crm/ContactWhatsAppHistory').then(m => ({ default: m.ContactWhatsAppHistory })));
   // ... demais componentes
   ```

2. **Renderização condicional por tab ativa:**
   ```typescript
   const [activeTab, setActiveTab] = useState('activities');
   
   // Tabs controladas
   <Tabs value={activeTab} onValueChange={setActiveTab}>
     <TabsContent value="transactions">
       <Suspense fallback={<TabLoader />}>
         {activeTab === 'transactions' && <ContactTransactionsList ... />}
       </Suspense>
     </TabsContent>
   </Tabs>
   ```

3. **Suspense em componentes de sidebar:**
   ```typescript
   <Suspense fallback={<TabLoader />}>
     <ContactCognitiveProfile contactId={contactId!} />
   </Suspense>
   ```

**Componentes lazy-loaded:**
- `ContactActivitiesList` (tab)
- `ContactTransactionsList` (tab)
- `ContactWhatsAppHistory` (tab)
- `ContactIdentityTab` (tab)
- `ContactSurveysTab` (tab)
- `ContactSocialTab` (tab)
- `ContactQuizzesTab` (tab)
- `ContactCognitiveProfile` (sidebar)
- `ContactAIRecommendations` (sidebar)
- `ContactAgentSuggestions` (sidebar)
- `ContactMemoryCard` (sidebar)

**Impacto esperado:**
- Queries no mount: ~20-25 → ~5-8
- Tempo de load: ~2-4s → ~0.5-1s

---

### Quick Win #2: CRM Kanban - LIMIT + Remoção de Query Extra

**Arquivo alterado:** `src/pages/CRMKanban.tsx`

**Problema original:**
- Carregava TODOS os contatos sem limite
- Loop de N batches para buscar `last_transaction_date` de cada contato
- Para 500 contatos: 11 queries, ~1.5s

**Solução implementada:**
1. **Limit de 200 contatos:**
   ```typescript
   const { data: contactsData } = await supabase
     .from('crm_contacts')
     .select('id, name, email, phone, ...')
     .eq('project_id', currentProject.id)
     .order('updated_at', { ascending: false })
     .limit(200); // PROMPT 24: Limit para performance
   ```

2. **Remoção da query de transactions:**
   ```typescript
   // REMOVIDO: Loop de batches para crm_transactions
   // O campo last_transaction_date não era usado no visual do Kanban
   
   return contactsData.map(c => ({
     ...c,
     last_transaction_date: null, // Mantido para compatibilidade
   }));
   ```

3. **staleTime explícito:**
   ```typescript
   staleTime: 5 * 60 * 1000, // 5 minutos
   ```

**Impacto esperado:**
- Queries: 11+ → 1
- Tempo de load: ~1.5s → ~0.3s
- Payload: ~200KB → ~50KB

---

### Quick Win #3: Cache Global (staleTime)

**Status:** JÁ IMPLEMENTADO

O projeto já possui staleTime global de 5 minutos configurado em `src/App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
```

Hooks individuais que já tinham staleTime configurado foram mantidos.

---

## ❌ O QUE NÃO FOI FEITO (FASE 2+)

| Item | Motivo | Fase Planejada |
|------|--------|----------------|
| N+1 do WhatsApp | Requer refatoração de hook | Fase 2 |
| Views materializadas | Requer migration | Fase 3 |
| Hook agregador para Cartão | Alto esforço | Fase 3 |
| Paginação virtual no Kanban | Alto esforço | Fase 3 |
| Depreciar CustomerJourneyAnalysis | Impacto em UX | Fase 2 |
| Skeleton loading uniforme | Baixa prioridade | Fase 2 |

---

## 📊 RESULTADOS ESPERADOS

### Antes (Estimado)

| Tela | Queries | Tempo Load | Payload |
|------|---------|------------|---------|
| Cartão do Contato | 20-25 | 2-4s | ~500KB |
| Kanban (500 contatos) | 11 | 1.5s | ~200KB |

### Depois (Fase 1)

| Tela | Queries | Tempo Load | Payload |
|------|---------|------------|---------|
| Cartão do Contato | 5-8 | 0.5-1s | ~100KB |
| Kanban (200 contatos) | 1 | 0.3s | ~50KB |

---

## 📁 ARQUIVOS ALTERADOS

1. `src/pages/CRMContactCard.tsx`
   - Imports lazy para 11 componentes
   - Estado `activeTab` para controle de renderização
   - Suspense em tabs e sidebar

2. `src/pages/CRMKanban.tsx`
   - `.limit(200)` na query de contatos
   - Remoção do loop de transactions
   - staleTime explícito

---

## 🔜 PRÓXIMOS PASSOS RECOMENDADOS

### Fase 2 (Otimizações Médias)
1. Corrigir N+1 em `useWhatsAppConversations.ts` (JOIN em SQL)
2. Depreciar `CustomerJourneyAnalysis` em favor de `CustomerJourneyOrders`
3. Skeleton loading uniforme nos componentes de tab

### Fase 3 (Refatorações)
1. View `crm_kanban_contacts_view` com pré-agregação
2. Hook agregador `useCRMContactFull` com single query
3. Paginação virtual para Kanban 2000+ contatos
4. Views materializadas para análises

---

## 📎 REFERÊNCIAS

- `docs/CRM_PERFORMANCE_AUDIT.md` — Auditoria completa
- `docs/CRM_ARCHITECTURE_CANONICAL_MAP.md` — Arquitetura oficial
- `docs/CRM_ROUTING_FIXES.md` — Correções de navegação

---

**Fase 1 implementada com sucesso. Sistema mais rápido e responsivo.**
