# Inteligência de Clientes — Documentação Completa

> **PROMPT 27 + 28 + 29 + PROMPT 3**: Reestruturação completa e consolidação Orders Core

---

## 📋 Sumário

1. [Arquitetura Final](#arquitetura-final)
2. [Princípio-Chave](#princípio-chave)
3. [As 4 Perspectivas](#as-4-perspectivas)
4. [Fontes de Dados](#fontes-de-dados)
5. [Componentes](#componentes)
6. [Métricas da View](#métricas-da-view)
7. [Consolidação Orders Core](#consolidação-orders-core)

---

## 🏗️ Arquitetura Final

```
Inteligência de Clientes
├── Visão Geral      → estado da base (executivo)
├── Jornada          → Cliente → Pedidos → Produtos
├── Ascensão         → progressão estratégica
└── Fluxos           → caminhos reais (visual)
```

---

## 🔑 Princípio-Chave

### Orders Core = Fonte Única

O sistema foi consolidado para usar **exclusivamente** o Orders Core como fonte de verdade:

- ✅ `orders` para todos os pedidos
- ✅ `order_items` para detalhes de produtos
- ✅ `ledger_events` para financeiro
- ❌ `crm_transactions` removido de todas as queries

---

## 📊 As 4 Perspectivas

### 1. Visão Geral (Executiva)

**Pergunta que responde:** "Qual o estado atual da minha base de clientes?"

**Contém:**
- Total de Contatos, Clientes, Leads
- Receita Total, LTV Médio, Ticket Médio
- Taxa de Recompra, Clientes Recorrentes

**Componente:** `CustomerIntelligenceOverview`
**Fonte:** `crm_customer_intelligence_overview` (view baseada em `orders`)

---

### 2. Jornada (Cliente → Pedidos → Produtos)

**Pergunta que responde:** "Como cada cliente se comportou ao longo do tempo?"

**Contém:**
- Lista de clientes com suas compras
- Busca por nome/email
- Hierarquia clara: Cliente → Pedidos → Produtos
- Badge "1ª Compra"

**Componente:** `CustomerJourneyWithFallback`
**Fonte:** `crm_journey_orders_view`

---

### 3. Ascensão (Progressão Estratégica)

**Pergunta que responde:** "Quais produtos de entrada geram mais ascensão?"

**Contém:**
- Seleção de produtos/ofertas/funis de entrada
- Seleção de produtos/ofertas/funis de destino
- Taxa de ascensão por entrada
- Breakdown detalhado

**Componente:** `AscensionAnalysis`
**Fonte:** `orders` + `order_items` (via `useAscensionOrdersCore`)

---

### 4. Fluxos (Caminhos Visuais)

**Pergunta que responde:** "Qual caminho os clientes realmente percorrem?"

**Contém:**
- Visualização de fluxo (Sankey-like)
- Filtros de passos e mínimo de clientes
- Legenda de produtos
- Estatísticas de fluxo

**Componente:** `CustomerFlowsAnalysis`
**Fonte:** `orders` + `order_items` (via `useFlowsOrdersCore`)

---

## 📂 Fontes de Dados

| Aba | Fonte | Hook |
|-----|-------|------|
| Visão Geral | `crm_customer_intelligence_overview` | `useCustomerIntelligenceOverview` |
| Jornada | `crm_journey_orders_view` | `useCRMJourneyFallback` |
| Ascensão | `orders` + `order_items` | `useAscensionOrdersCore` |
| Fluxos | `orders` + `order_items` | `useFlowsOrdersCore` |

---

## 🧩 Componentes

### Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/CRM.tsx` | Página principal com 4 tabs |
| `src/components/crm/CustomerIntelligenceOverview.tsx` | Visão Geral |
| `src/components/crm/CustomerJourneyWithFallback.tsx` | Jornada |
| `src/components/crm/AscensionAnalysis.tsx` | Ascensão |
| `src/components/crm/CustomerFlowsAnalysis.tsx` | Fluxos |

### Hooks

| Hook | Descrição |
|------|-----------|
| `useCustomerIntelligenceOverview` | Métricas agregadas da view |
| `useCRMJourneyFallback` | Jornada via Orders Core |
| `useAscensionOrdersCore` | Ascensão via Orders Core |
| `useFlowsOrdersCore` | Fluxos via Orders Core |

---

## 📈 Métricas da View

A view `crm_customer_intelligence_overview` retorna:

### Bloco 1 — Base de Contatos
- `total_contacts`: Total de contatos na base
- `total_customers`: Contatos com pelo menos 1 compra
- `total_leads`: Contatos sem compra
- `total_prospects`: Reservado para futuro

### Bloco 2 — Valor da Base
- `total_revenue`: Receita total
- `avg_ltv`: LTV médio por cliente
- `avg_ticket`: Ticket médio por pedido
- `total_orders`: Total de pedidos
- `avg_orders_per_customer`: Compras por cliente

### Bloco 3 — Comportamento
- `repeat_customers_count`: Clientes com 2+ compras
- `repeat_rate_percent`: Taxa de recompra

---

## 🔄 Consolidação Orders Core

### ✅ Concluído (PROMPT 3)

A migração foi concluída com sucesso:

1. **View `crm_customer_intelligence_overview`** - Atualizada para usar apenas `orders`
2. **Hook `useCRMJourneyFallback`** - Fallback removido, usa apenas `crm_journey_orders_view`
3. **Hook `useAscensionOrdersCore`** - Criado para substituir `usePaginatedQuery` com `crm_transactions`
4. **Hook `useFlowsOrdersCore`** - Criado para substituir `usePaginatedQuery` com `crm_transactions`

### Arquitetura Atual

```
CSV / Webhook
      ↓
   Orders Core (orders + order_items)
      ↓
   Views Derivadas
      ↓
   Hooks Canônicos
      ↓
   Componentes de UI
```

---

## ❌ O que foi Removido

- Aba "Pedidos Históricos" — CSV é replay de webhook
- Fallback para `crm_transactions` em todos os módulos
- Referências a "legado" em todo o código
- `usePaginatedQuery` com `crm_transactions` em Ascensão/Fluxos

---

## 🚀 Regra de Ouro

> **Todo novo módulo que envolva vendas, clientes ou receita deve consumir exclusivamente o Orders Core.**

---

*Documentação atualizada pelo PROMPT 3 — Consolidação Total do Orders Core*
