# Hotmart API Reposicionamento Arquitetural

**Data:** 2025-01-15  
**Status:** IMPLEMENTADO

## Objetivo

Reposicionar a API da Hotmart para não interferir no cálculo financeiro do sistema.

## Regra Arquitetural

A API da Hotmart (`GET /payments/api/v1/sales/history`) deve ser usada **APENAS** para:
- ✅ Backfill de vendas (reconstrução de histórico)
- ✅ Metadados comerciais (nome do produto, comprador, etc)
- ✅ Mapeamento de ofertas
- ✅ Dados para CRM (contatos, atribuição)

A API **NÃO DEVE** mais:
- ❌ Escrever ou sobrescrever dados financeiros
- ❌ Tocar em `finance_ledger`
- ❌ Alterar `net_amount` em `sales_core_events`
- ❌ Calcular taxas, splits ou lucro

## Fonte de Dados Financeiros

Toda lógica financeira deve ser **EXCLUSIVAMENTE** derivada de:

1. **Webhooks Hotmart** (`commissions[]` array) - fonte primária
2. **Importação de CSV** (ledger oficial) - fonte futura

## Mudanças Implementadas

### 1. `supabase/functions/hotmart-api/index.ts`

**REMOVIDO** (linhas 1072-1106):
- Chamada a `batchFindContactIds()`
- Chamada a `extractFinancialBreakdown()`
- Chamada a `batchWriteSalesCoreEvents()`

**MANTIDO**:
- Escrita em `hotmart_sales` (metadados comerciais)
- Auto-criação de `offer_mappings`
- Sincronização de dados de comprador

### 2. `supabase/functions/hotmart-financial-sync/index.ts`

**STATUS:** DESATIVADO

A função agora retorna HTTP 410 (Gone) com mensagem explicativa:
```json
{
  "error": "FUNCTION_DEPRECATED",
  "message": "Esta função foi desativada. Dados financeiros agora vêm exclusivamente dos webhooks Hotmart.",
  "recommendation": "Use a sincronização normal via API para metadados comerciais (hotmart_sales). Para dados financeiros precisos, os webhooks Hotmart são a única fonte confiável.",
  "migrationDate": "2025-01-15"
}
```

### 3. `supabase/functions/hotmart-backfill/index.ts`

**ALTERADO**:
- `net_amount` agora é **sempre 0** (zero) para eventos de backfill
- `gross_amount` mantido para referência
- Comentários explicando que backfill não pode determinar net_amount preciso

**ANTES:**
```typescript
const netAmount = sale.net_revenue || grossAmount * 0.9; // Fallback: estimate 90% if no net
```

**DEPOIS:**
```typescript
const netAmount = 0; // INTENTIONALLY ZERO - backfill cannot determine accurate net
```

## Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                     DADOS FINANCEIROS                        │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Hotmart Webhook │    │  CSV Import     │                 │
│  │ (commissions[]) │    │  (future)       │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           │                      │                           │
│           ▼                      ▼                           │
│  ┌─────────────────────────────────────────┐                │
│  │          sales_core_events              │                │
│  │  • gross_amount ✓                       │                │
│  │  • net_amount ✓ (from PRODUCER comm)    │                │
│  └─────────────────────────────────────────┘                │
│                      │                                       │
│                      ▼                                       │
│  ┌─────────────────────────────────────────┐                │
│  │          finance_ledger                 │                │
│  │  • platform_fee                         │                │
│  │  • affiliate_cost                       │                │
│  │  • coproducer_cost                      │                │
│  │  • net_revenue                          │                │
│  └─────────────────────────────────────────┘                │
│                      │                                       │
│                      ▼                                       │
│  ┌─────────────────────────────────────────┐                │
│  │    profit_daily / owner_profit_daily    │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   DADOS COMERCIAIS (API)                     │
│                                                              │
│  ┌─────────────────┐                                        │
│  │   Hotmart API   │                                        │
│  │ (sales/history) │                                        │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────┐                │
│  │          hotmart_sales                  │                │
│  │  • Metadados comerciais                 │                │
│  │  • Dados do comprador                   │                │
│  │  • UTMs e atribuição                    │                │
│  │  • NÃO usado para cálculo financeiro    │                │
│  └─────────────────────────────────────────┘                │
│                      │                                       │
│                      ▼                                       │
│  ┌─────────────────┐   ┌─────────────────┐                  │
│  │ offer_mappings  │   │  crm_contacts   │                  │
│  └─────────────────┘   └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Impacto

### Positivo
- ✅ Dados financeiros precisos (vêm dos webhooks)
- ✅ Sem sobrescrita acidental de valores
- ✅ ROAS e lucro calculados corretamente
- ✅ Separação clara de responsabilidades

### Considerações
- ⚠️ Eventos de backfill terão `net_amount = 0` (precisam reconciliação via CSV)
- ⚠️ Dados históricos anteriores aos webhooks podem estar imprecisos
- ⚠️ Necessário implementar importação de CSV para reconciliação completa

## Próximos Passos

1. [ ] Implementar importação de CSV do relatório financeiro Hotmart
2. [ ] Criar job de reconciliação para corrigir `net_amount = 0`
3. [ ] Adicionar alertas quando eventos tiverem `net_amount = 0`
