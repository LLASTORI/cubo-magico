# Consolidação Total do Orders Core

> **PROMPT 3**: CSV Canônico de Vendas — Replay Histórico de Webhook

---

## 🎯 Motivo Arquitetural

O CSV da Hotmart é tratado como **replay histórico canônico de webhook**, escrevendo diretamente nas tabelas operacionais:

- `orders`
- `order_items`
- `ledger_events`

Isso elimina a necessidade de tabelas paralelas, views especiais ou lógicas condicionais baseadas na origem (csv vs webhook).

---

## 🔄 Fluxo Canônico

```
CSV / Webhook
      ↓
   Orders Core
      ↓
 Ledger Events
      ↓
 CRM / Funis / Dashboard / Jornada
```

---

## 🏗️ Arquitetura de Dados

### Fonte Canônica (obrigatória)

| Domínio | Tabela | Descrição |
|---------|--------|-----------|
| Pedidos | `orders` | Todos os pedidos (CSV + Webhook) |
| Itens | `order_items` | Produtos de cada pedido |
| Financeiro | `ledger_events` | Movimentações financeiras |

### Views Derivadas

| View | Fonte | Uso |
|------|-------|-----|
| `crm_journey_orders_view` | `orders` + `order_items` | Jornada do Cliente |
| `crm_customer_intelligence_overview` | `orders` | Visão Geral CRM |
| `crm_order_automation_events_view` | `orders` | Eventos de Automação |

---

## ❌ Proibições

1. **Leitura direta de `crm_transactions`** - Tabela mantida apenas para retrocompatibilidade
2. **Lógicas condicionais baseadas em origem** - CSV e Webhook são indistinguíveis
3. **Métricas duplicadas ou paralelas** - Uma única fonte de verdade

---

## 📊 Módulos Consolidados

### ✅ CRM

| Área | Fonte | Hook |
|------|-------|------|
| Visão Geral | `crm_customer_intelligence_overview` | `useCustomerIntelligenceOverview` |
| Jornada | `crm_journey_orders_view` | `useCRMJourneyFallback` |
| Ascensão | `orders` + `order_items` | `useAscensionOrdersCore` |
| Fluxos | `orders` + `order_items` | `useFlowsOrdersCore` |

### ✅ Vendas

| Área | Fonte | Hook |
|------|-------|------|
| Pedidos (Busca Rápida) | `orders` + `order_items` | `useOrdersCore` |
| Importar Histórico | Pipeline → `orders` | `HotmartUnifiedCSVImport` |

### ✅ Financeiro

| Área | Fonte |
|------|-------|
| Receita Bruta | `ledger_events.customer_paid` |
| Receita Líquida | `ledger_events.producer_net` |

---

## 🔒 Garantias Técnicas

### Idempotência

- Chave única: `provider_order_id`
- Webhook sempre prevalece sobre CSV
- Eventos futuros (chargeback, cancelamento) atualizam pedidos importados

### Auditoria

Todos os registros incluem:

```json
{
  "raw_payload": {
    "source": "csv",
    "file_name": "historico.csv",
    "imported_at": "2026-01-26T...",
    "imported_by": "user-id"
  }
}
```

### Regras Financeiras

CSV **nunca** cria `ledger_events` se:
- `producer_net <= 0`
- `gross_base <= 0`
- `status !== 'approved'`

---

## 🧹 Limpeza de Legado

### Removido

- Flag `useOrdersCore` no `useCRMJourneyFallback` (sempre true)
- Query fallback para `crm_transactions` na Jornada
- Dependência de `usePaginatedQuery` para `crm_transactions` em Ascensão/Fluxos

### Deprecated (manter para retrocompatibilidade)

- Tabela `crm_transactions` - não deletar, mas não usar em novos módulos
- Trigger `update_contact_financial_data` - continua atualizando CRM

---

## 🚀 Regra de Ouro

> **❌ Nunca criar vendas fora do Orders Core**

Todo novo módulo que envolva vendas, clientes ou receita **deve consumir exclusivamente** o Orders Core.

---

## 📅 Histórico

| Data | Mudança |
|------|---------|
| 2026-01-26 | View `crm_customer_intelligence_overview` migrada para Orders Core |
| 2026-01-26 | Hooks de Ascensão e Fluxos migrados para Orders Core |
| 2026-01-26 | Fallback de `crm_transactions` removido da Jornada |

---

*Documentação criada pelo PROMPT 3 — Consolidação Total do Orders Core*
