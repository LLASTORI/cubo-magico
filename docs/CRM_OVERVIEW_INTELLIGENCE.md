# CRM - Visão Geral (Inteligência de Clientes)

**PROMPT 28** - Implementação da aba Visão Geral

## Objetivo

Criar uma aba executiva que responde perguntas macro sobre a base de clientes em menos de 10 segundos, com UX premium nível Cubo Mágico.

## Estrutura Implementada

### 4 Perspectivas da Inteligência de Clientes

| Aba | Propósito | Fonte de Dados |
|-----|-----------|----------------|
| **Visão Geral** | Métricas macro, executiva | `crm_customer_intelligence_overview` (view) |
| **Jornada** | Cliente individual | `crm_journey_orders_view` |
| **Ascensão** | Evolução estratégica | Orders Core + offer_mappings |
| **Avançado** | Análise comparativa | crm_transactions (histórico) |

### Perguntas que a Visão Geral Responde

1. ✅ Quantos contatos existem na base?
2. ✅ Quantos são clientes, leads e prospects?
3. ✅ Quanto vale, em média, cada cliente?
4. ✅ Como é o comportamento médio de compra?
5. ✅ Qual a taxa de recompra?

## Blocos Implementados

### 🔹 BLOCO 1 — BASE DE CONTATOS
- Total de Contatos
- Clientes (com % da base)
- Leads (com % da base)
- Taxa de Conversão (Leads → Clientes)

### 🔹 BLOCO 2 — VALOR DA BASE
- Receita Total
- LTV Médio
- Ticket Médio
- Compras por Cliente

### 🔹 BLOCO 3 — COMPORTAMENTO
- Taxa de Recompra (% clientes com 2+ compras)
- Clientes Recorrentes (número absoluto)
- Potencial de Recompra (clientes com 1 compra)

## Arquitetura Técnica

### View SQL (`crm_customer_intelligence_overview`)

```sql
CREATE OR REPLACE VIEW public.crm_customer_intelligence_overview AS
SELECT 
  c.project_id,
  
  -- Base de Contatos
  COUNT(DISTINCT c.id)::integer AS total_contacts,
  COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END)::integer AS total_customers,
  COUNT(DISTINCT CASE WHEN o.id IS NULL THEN c.id END)::integer AS total_leads,
  
  -- Valor da Base
  COALESCE(SUM(o.customer_paid), 0)::numeric AS total_revenue,
  -- avg_ltv, avg_ticket, avg_orders_per_customer...
  
  -- Comportamento
  -- repeat_customers_count, repeat_rate_percent...

FROM crm_contacts c
LEFT JOIN orders o ON o.buyer_email = c.email 
  AND o.project_id = c.project_id
  AND o.status = 'approved'
GROUP BY c.project_id;
```

### Hook (`useCustomerIntelligenceOverview`)

```typescript
// 1 única query via view agregada
const { data } = await supabase
  .from('crm_customer_intelligence_overview')
  .select('*')
  .eq('project_id', currentProject.id)
  .maybeSingle();
```

### Componente (`CustomerIntelligenceOverview`)

- Cards compactos com ícones
- Tooltips explicativos
- Variantes visuais (primary, success, default)
- Skeleton loading

## Performance

| Métrica | Target | Implementado |
|---------|--------|--------------|
| Queries | 1-2 | ✅ 1 query |
| Tempo de carga | < 500ms | ✅ View agregada |
| Processamento client-side | Mínimo | ✅ Apenas formatação |

## O que NÃO existe na Visão Geral

❌ Fluxo de clientes  
❌ Sankey / gráficos complexos  
❌ Lista de clientes  
❌ Busca por nome/email  
❌ Filtros avançados  
❌ Dados de produto individual  
❌ Referências a "legado"

## Mudanças na Nomenclatura

| Antes | Depois |
|-------|--------|
| "Visão Legada" | "Avançado" |
| Badge de warning | Removido |
| Cores amber/warning | Neutras |
| "crm_transactions (sistema antigo)" | "dados históricos de transações" |

## Arquivos Criados/Modificados

### Criados
- `src/hooks/useCustomerIntelligenceOverview.ts`
- `src/components/crm/CustomerIntelligenceOverview.tsx`
- `docs/CRM_OVERVIEW_INTELLIGENCE.md` (este arquivo)

### Modificados
- `src/pages/CRM.tsx` - Nova estrutura de 4 abas

### Migrations
- View `crm_customer_intelligence_overview`

## Relação com Outras Abas

```
┌─────────────────────────────────────────────────────────────┐
│                  INTELIGÊNCIA DE CLIENTES                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Visão Geral  │  │   Jornada    │  │   Ascensão   │       │
│  │              │  │              │  │              │       │
│  │   Macro      │  │  Individual  │  │  Estratégica │       │
│  │  Executiva   │  │   Cliente    │  │   Evolução   │       │
│  │              │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│   "Estado da base"  "O que o cliente  "Como clientes        │
│   "Em 10 segundos"   comprou?"         evoluem?"            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Critérios de Aceitação ✅

- [x] Cliente entende o estado da base em menos de 10 segundos
- [x] Nenhuma informação parece "fora de lugar"
- [x] Tela leve, premium e intencional
- [x] Sem referência a "legado"
- [x] Sem scroll longo
- [x] Performance < 500ms (1 query)
