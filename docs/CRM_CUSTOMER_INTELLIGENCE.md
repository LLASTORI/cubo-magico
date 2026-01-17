# Inteligência de Clientes — Documentação UX

> **PROMPT 27**: Reestruturação completa da área de análise de clientes

---

## 📋 Sumário

1. [Diagnóstico UX (Antes)](#diagnóstico-ux-antes)
2. [Nova Estrutura (Depois)](#nova-estrutura-depois)
3. [As 3 Perspectivas](#as-3-perspectivas)
4. [Componentes Atualizados](#componentes-atualizados)
5. [Classificação Canônica](#classificação-canônica)
6. [Melhorias de UX Implementadas](#melhorias-de-ux-implementadas)

---

## 🔴 Diagnóstico UX (Antes)

### Problemas Identificados

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Naming inconsistente** | "Análise de Clientes" não reflete o propósito real |
| 2 | **Jornada parecia lista de produtos** | Sem hierarquia clara Cliente → Pedidos → Produtos |
| 3 | **Ascensão erroneamente legada** | Componente canônico marcado com banner de aviso |
| 4 | **Falta busca por cliente** | Não era possível filtrar por nome/email |
| 5 | **Scroll problemático** | Overflow inconsistente em diferentes resoluções |
| 6 | **Tabs confusas** | 3 tabs com 2 marcadas como "legado" |

### Estrutura Anterior

```
CRM.tsx
├── Tab: Jornada do Cliente (Orders Core) ← PADRÃO
├── Tab: Jornada (Legado) ⚠️ 
└── Tab: Análise de Ascensão ⚠️ ← INCORRETO (era canônico)
```

---

## 🟢 Nova Estrutura (Depois)

### Naming Corrigido

| Antes | Depois |
|-------|--------|
| "Análise de Clientes" | **Inteligência de Clientes** |
| "Jornada do Cliente" | **Jornada** |
| "Análise de Ascensão" | **Ascensão** |
| "Jornada (Legado)" | **Visão Legada** |

### Nova Estrutura de Tabs

```
Inteligência de Clientes
├── Tab: Jornada ← CANÔNICO (Orders Core)
├── Tab: Ascensão ← CANÔNICO (offer_mappings)
└── Tab: Visão Legada ⚠️ ← Apenas para comparação
```

---

## 📊 As 3 Perspectivas

### 1. Jornada (Canônica)

**Componente:** `CustomerJourneyOrders`

**Hierarquia implementada:**
```
Clientes
└── Pedidos
    └── Produtos
```

**Features:**
- ✅ Busca por nome/email
- ✅ Agrupamento por cliente (não por pedido)
- ✅ Cards expansíveis
- ✅ Badge "1ª Compra" destacado
- ✅ Scroll corrigido com altura dinâmica

**Fonte de dados:** `crm_journey_orders_view` (Orders Core)

### 2. Ascensão (Canônica)

**Componente:** `AscensionAnalysis`

**O que analisa:**
- Produto de entrada → Produto de destino
- Taxa de ascensão por funil
- Breakdown por cliente

**Fonte de dados:** `crm_transactions` + `offer_mappings`

> **IMPORTANTE:** Embora use `crm_transactions`, a Ascensão é **CANÔNICA** porque:
> 1. Usa `offer_mappings` como fonte de verdade para produtos/ofertas
> 2. Faz análise de fluxo, não contagem de eventos
> 3. Será migrada para Orders Core quando houver items suficientes

### 3. Visão Legada (Comparativo)

**Componente:** `CustomerJourneyAnalysis`

**Quando usar:**
- Comparação com dados históricos
- Debugging de discrepâncias
- Período de transição

**NÃO usar para:**
- Análises oficiais
- Decisões de negócio
- Relatórios para clientes

---

## 🧩 Componentes Atualizados

### CRM.tsx (Página)

```typescript
// ANTES
const [activeTab, setActiveTab] = useState('orders');

// DEPOIS  
const [activeTab, setActiveTab] = useState('journey');
```

**Mudanças:**
- Header: "Inteligência de Clientes" com ícone Brain
- Tabs renomeadas para semântica clara
- AscensionAnalysis não é mais lazy-loaded (é canônica)
- Banner de legado apenas na tab "Visão Legada"

### CustomerJourneyOrders.tsx

**Mudanças UX:**

1. **Nova hierarquia:** `CustomerCard` agrupa pedidos por cliente
2. **Busca:** Input com ícone Search para filtrar
3. **Scroll:** `ScrollArea` com `height` em vez de `maxHeight` problemático
4. **Cards compactos:** Modo `compact` para pedidos dentro do card de cliente

**Novo fluxo visual:**

```
┌─────────────────────────────────────────┐
│ 🔍 Buscar por nome ou email...          │
├─────────────────────────────────────────┤
│ ┌─ Cliente: João Silva ─────── R$ 500 ─┐│
│ │  📧 joao@email.com     2 pedidos     ││
│ │  ┌─ Pedido 1 ──────────────────────┐ ││
│ │  │ Produto X • 1ª Compra           │ ││
│ │  └─────────────────────────────────┘ ││
│ │  ┌─ Pedido 2 ──────────────────────┐ ││
│ │  │ Produto Y + Bump                │ ││
│ │  └─────────────────────────────────┘ ││
│ │            [Ver Perfil Completo →]   ││
│ └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## ✅ Classificação Canônica

| Componente | Status | Fonte de Dados |
|------------|--------|----------------|
| `CustomerJourneyOrders` | **CANÔNICO** | Orders Core |
| `AscensionAnalysis` | **CANÔNICO** | offer_mappings |
| `CustomerJourneyAnalysis` | LEGACY | crm_transactions |

### Por que Ascensão é Canônica?

1. **offer_mappings** é a fonte de verdade para produtos/ofertas configurados
2. A análise de fluxo (entrada → destino) não depende de contagem de eventos
3. Mesmo usando `crm_transactions`, o cálculo de ascensão é baseado em **contatos únicos**
4. Migração para Orders Core é planejada mas não prioritária

---

## 🎨 Melhorias de UX Implementadas

### 1. Busca Instantânea

```tsx
<Input
  placeholder="Buscar por nome ou email..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="pl-9"
/>
```

### 2. Agrupamento por Cliente

```tsx
const customerGroups = useMemo((): CustomerGroup[] => {
  const groups = new Map<string, CustomerGroup>();
  journeyEvents.forEach(event => {
    // Agrupa por email
  });
  // Ordena por total gasto (maior primeiro)
  return Array.from(groups.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}, [journeyEvents]);
```

### 3. Scroll Corrigido

```tsx
<ScrollArea style={{ height: maxHeight }} className="pr-2">
  {/* conteúdo */}
</ScrollArea>
```

### 4. Estados Vazios Claros

- Sem pedidos: Ícone + explicação
- Sem resultados de busca: Ícone diferente + sugestão

---

## 📁 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/CRM.tsx` | Nova estrutura de tabs, naming, classificação |
| `src/components/crm/CustomerJourneyOrders.tsx` | Hierarquia, busca, scroll |
| `docs/CRM_CUSTOMER_INTELLIGENCE.md` | Esta documentação |

---

## 🚀 Próximos Passos (Não neste PROMPT)

1. Migrar `AscensionAnalysis` para usar `order_items` quando disponível
2. Adicionar filtros por data na Jornada
3. Exportação de dados (CSV/PDF)
4. Remover componentes legados após período de transição

---

*Documentação gerada pelo PROMPT 27 — Reestruturação UX + Produto*
