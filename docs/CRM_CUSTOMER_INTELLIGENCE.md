# Inteligência de Clientes — Documentação Completa

> **PROMPT 27 + 28 + 29**: Reestruturação completa da área de análise de clientes

---

## 📋 Sumário

1. [Arquitetura Final](#arquitetura-final)
2. [Princípio-Chave](#princípio-chave)
3. [As 4 Perspectivas](#as-4-perspectivas)
4. [Fontes de Dados](#fontes-de-dados)
5. [Componentes](#componentes)
6. [Métricas da View](#métricas-da-view)
7. [Migração para Orders Core](#migração-para-orders-core)

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

### Fallback ≠ Legado

O fallback é uma **estratégia de transição arquitetural**, não dívida técnica.

- ✅ Nada é chamado de "legado"
- ✅ Nada fica confuso para o usuário
- ✅ Nada será refeito depois
- ✅ Transição silenciosa e automática

---

## 📊 As 4 Perspectivas

### 1. Visão Geral (Executiva)

**Pergunta que responde:** "Qual o estado atual da minha base de clientes?"

**Contém:**
- Total de Contatos, Clientes, Leads
- Receita Total, LTV Médio, Ticket Médio
- Taxa de Recompra, Clientes Recorrentes

**NÃO contém:**
- Listas de clientes
- Fluxos visuais
- Filtros avançados

**Componente:** `CustomerIntelligenceOverview`

---

### 2. Jornada (Cliente → Pedidos → Produtos)

**Pergunta que responde:** "Como cada cliente se comportou ao longo do tempo?"

**Contém:**
- Lista de clientes com suas compras
- Busca por nome/email
- Hierarquia clara: Cliente → Pedidos → Produtos
- Badge "1ª Compra"

**Componente:** `CustomerJourneyWithFallback`

---

### 3. Ascensão (Progressão Estratégica)

**Pergunta que responde:** "Quais produtos de entrada geram mais ascensão?"

**Contém:**
- Seleção de produtos/ofertas/funis de entrada
- Seleção de produtos/ofertas/funis de destino
- Taxa de ascensão por entrada
- Breakdown detalhado

**Componente:** `AscensionAnalysis`

---

### 4. Fluxos (Caminhos Visuais)

**Pergunta que responde:** "Qual caminho os clientes realmente percorrem?"

**Contém:**
- Visualização de fluxo (Sankey-like)
- Filtros de passos e mínimo de clientes
- Legenda de produtos
- Estatísticas de fluxo

**NÃO contém:**
- Total de contatos
- LTV
- Cards executivos

**Componente:** `CustomerFlowsAnalysis`

---

## 📂 Fontes de Dados

| Aba | Fonte Atual | Fonte Final |
|-----|-------------|-------------|
| Visão Geral | `crm_customer_intelligence_overview` (view) | Orders Core |
| Jornada | `crm_transactions` (via hook) | Orders Core |
| Ascensão | `crm_transactions` + `offer_mappings` | Orders Core |
| Fluxos | `crm_transactions` | Orders Core |

### Como o Fallback Funciona

1. **Visão Geral**: A view `crm_customer_intelligence_overview` usa `crm_transactions` diretamente
2. **Jornada**: O hook `useCRMJourneyFallback` usa `crm_transactions` por padrão
3. **Ascensão**: Continua usando `crm_transactions` + `offer_mappings`
4. **Fluxos**: Usa `crm_transactions` para calcular transições

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
| `useCRMJourneyFallback` | Jornada com fallback automático |

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

## 🔄 Migração para Orders Core

### ✅ Concluído (PROMPT FORENSE)

A migração foi ativada após confirmação de que:
- CSV Backfill escreve diretamente em `orders`, `order_items`, `ledger_events`
- A view `crm_journey_orders_view` consolida todos os pedidos independente da origem
- Não há distinção entre dados CSV e webhook na camada de apresentação

```typescript
// src/hooks/useCRMJourneyFallback.ts
// ANTES:
const useOrdersCore = false;
// DEPOIS (ativado):
const useOrdersCore = true;
```

### Passo 2: A View já está preparada
A view `crm_customer_intelligence_overview` tem lógica de fallback inteligente.

### Passo 3: Migrar Ascensão e Fluxos
Gradualmente atualizar para usar `order_items` em vez de `crm_transactions`.

---

## ❌ O que foi Removido

- Aba "Avançado" (ex-Legado) — removida do MVP
- Referências a "legado" em todo o código
- Mensagens de "quando for processado"
- `CustomerJourneyAnalysis` da navegação principal

---

## 🚀 Próximos Passos

### PROMPT 30
- Refinar visual do Fluxos (Sankey premium)
- Ajustar microcopy

### PROMPT 31
- Importar CSV
- Popular Orders Core
- Desligar fallback

---

*Documentação atualizada pelo PROMPT 29 — Correção Estrutural*
