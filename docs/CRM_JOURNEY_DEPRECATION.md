# CRM Journey Deprecation Notice

**Data:** 2026-01-16  
**PROMPT:** 26  
**Status:** ✅ Jornada Canônica Oficial

---

## 📋 Resumo

A **Jornada Canônica** baseada em **Orders Core** foi oficialmente declarada como padrão do CRM.

### Mudanças Implementadas

| Item | Antes | Depois |
|------|-------|--------|
| Tab padrão | `journey` (legado) | `orders` (canônico) |
| CustomerJourneyAnalysis | Principal | Legado (aba secundária) |
| CustomerJourneyOrders | Shadow | **PADRÃO** |
| useCRMJourneyData | Ativo | **DEPRECATED** |

---

## 🏛️ Arquitetura Final

### Jornada Canônica (USAR)

```
CustomerJourneyOrders
    └── useCRMJourneyOrders
            └── crm_journey_orders_view
                    └── orders + order_items (Orders Core)
```

**Regra:** 1 pedido = 1 evento de jornada

### Jornada Legada (NÃO USAR)

```
CustomerJourneyAnalysis
    └── useCRMJourneyData ⚠️ DEPRECATED
            └── crm_transactions (LEGADO)
```

**Problema:** 1 transação = 1 evento (dados inflacionados)

---

## 🔴 O Que Foi Depreciado

### 1. useCRMJourneyData (Hook)

**Arquivo:** `src/hooks/useCRMJourneyData.ts`

```typescript
/**
 * @deprecated Use useCRMJourneyOrders from '@/hooks/useCRMJourneyOrders'
 */
export function useCRMJourneyData(filters: CRMFilters) {
```

**Ações tomadas:**
- ✅ Comentário de depreciação no topo do arquivo
- ✅ JSDoc @deprecated na função
- ✅ Console.warn em desenvolvimento
- ❌ Código não removido (ainda em uso na aba legada)

### 2. CustomerJourneyAnalysis (Componente)

**Arquivo:** `src/components/crm/CustomerJourneyAnalysis.tsx`

**Status:** 
- ✅ Rebaixado para aba secundária "Jornada (Legado)"
- ✅ Carregamento lazy (não dispara por padrão)
- ✅ Banner de aviso amarelo exibido
- ❌ Código não removido

### 3. AscensionAnalysis (Componente)

**Arquivo:** `src/components/crm/AscensionAnalysis.tsx`

**Status:**
- ✅ Mantido como aba secundária
- ✅ Carregamento lazy
- ✅ Banner de aviso exibido
- ⏳ Migração para Orders Core pendente

---

## 🟢 O Que é Canônico Agora

### 1. CustomerJourneyOrders (Componente)

**Arquivo:** `src/components/crm/CustomerJourneyOrders.tsx`

**Status:** PADRÃO

### 2. useCRMJourneyOrders (Hook)

**Arquivo:** `src/hooks/useCRMJourneyOrders.ts`

**Status:** CANÔNICO

### 3. Views de Orders Core

| View | Descrição |
|------|-----------|
| `crm_journey_orders_view` | 1 pedido = 1 evento |
| `crm_orders_view` | Detalhes do pedido |
| `crm_order_items_view` | Itens do pedido |
| `crm_contact_revenue_view` | Receita agregada |
| `crm_contact_attribution_view` | UTMs do primeiro pedido |

---

## 🚫 Proibições

```typescript
// ❌ PROIBIDO em novas implementações:
import { useCRMJourneyData } from '@/hooks/useCRMJourneyData';

// ✅ USAR:
import { useCRMJourneyOrders } from '@/hooks/useCRMJourneyOrders';
```

```sql
-- ❌ PROIBIDO:
SELECT * FROM crm_transactions;

-- ✅ USAR:
SELECT * FROM crm_journey_orders_view;
SELECT * FROM crm_orders_view;
```

---

## 📊 Impacto de Performance

### Antes (Legado como padrão)

- **Queries ao abrir CRM:** 5+ queries pesadas
- **Dados carregados:** Todos os contatos + transações
- **Tempo percebido:** Lento

### Depois (Canônico como padrão)

- **Queries ao abrir CRM:** 1 query (crm_journey_orders_view)
- **Dados carregados:** Pedidos agregados
- **Tempo percebido:** Rápido

### Tabs Legadas

- ✅ Só carregam quando selecionadas (lazy)
- ✅ Não disparam por padrão
- ✅ Aviso visual para usuário

---

## 📅 Roadmap de Remoção

### Fase 1 (Atual - PROMPT 26) ✅
- [x] CustomerJourneyOrders como padrão
- [x] Legado rebaixado para aba secundária
- [x] useCRMJourneyData marcado como deprecated
- [x] Lazy loading para legado

### Fase 2 (Futuro - PROMPT 27+)
- [ ] Migrar AscensionAnalysis para Orders Core
- [ ] Remover CustomerJourneyAnalysis
- [ ] Remover useCRMJourneyData
- [ ] Remover crm_transactions da UI

### Fase 3 (Futuro - PROMPT 30+)
- [ ] Avaliar remoção de crm_transactions do banco
- [ ] Consolidar views de Orders Core

---

## ✅ Verificação

```bash
# Componentes usando hook legado:
grep -r "useCRMJourneyData" src/

# Esperado apenas em:
# - src/hooks/useCRMJourneyData.ts (definição)
# - src/components/crm/CustomerJourneyAnalysis.tsx (uso legado)
```

---

## 📁 Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/CRM.tsx` | Tab padrão = orders, lazy load legado |
| `src/hooks/useCRMJourneyData.ts` | @deprecated + warning |
| `docs/CRM_JOURNEY_DEPRECATION.md` | Este documento |

---

## 🔗 Documentação Relacionada

- `docs/CRM_ORDERS_MIGRATION_VALIDATION.md` - Migração Orders Core
- `docs/CRM_JOURNEY_ORDERS_SHADOW.md` - Shadow migration
- `docs/CRM_ARCHITECTURE_CANONICAL_MAP.md` - Arquitetura CRM
- `docs/CRM_PERFORMANCE_PHASE1.md` - Otimizações Fase 1
