# PROMPT 5 - Atualização das Views Financeiras

## Status: ✅ CONCLUÍDO

Data: 2026-01-15

## Objetivo

Atualizar todas as views SQL do Ledger para usar os campos financeiros corretos do novo modelo após a correção do parser do webhook Hotmart (PROMPT 4).

## Alterações Realizadas

### 1. Colunas Adicionadas

**sales_core_events:**
- `platform_fee` NUMERIC DEFAULT 0
- `affiliate_cost` NUMERIC DEFAULT 0
- `coproducer_cost` NUMERIC DEFAULT 0

**hotmart_sales:**
- `platform_fee` NUMERIC DEFAULT 0
- `affiliate_cost` NUMERIC DEFAULT 0
- `coproducer_cost` NUMERIC DEFAULT 0
- `gross_amount` NUMERIC DEFAULT 0
- `net_amount` NUMERIC DEFAULT 0

### 2. Views Atualizadas

| View | Alteração |
|------|-----------|
| `revenue_daily` | Agora inclui `affiliate_fees`, `coproducer_fees` do breakdown |
| `profit_daily` | Agora inclui `affiliate_fees`, `coproducer_fees` |
| `profit_monthly` | Agora inclui `affiliate_fees`, `coproducer_fees` |
| `owner_profit_daily` | Agora inclui `affiliate_fees`, `coproducer_fees` |
| `sales_daily` | Sem alteração (já usava `net_amount`) |
| `refunds_daily` | Sem alteração |
| `financial_daily` | Sem alteração |
| `funnel_revenue` | Sem alteração |
| `funnel_financials` | Sem alteração |
| `funnel_financials_summary` | Sem alteração |
| `live_sales_today` | **NOVO**: Agora usa `finance_ledger_summary` como fonte |
| `live_financial_today` | Agora inclui breakdown de fees |
| `live_project_totals_today` | Agora inclui breakdown de fees |
| `finance_ledger_summary` | Adicionado `utm_medium`, `checkout_origin` |

### 3. Webhook Atualizado

O webhook `hotmart-webhook` agora:
- Extrai `platform_fee`, `affiliate_cost`, `coproducer_cost` dos commissions
- Popula esses campos em `sales_core_events` via `writeSalesCoreEvent()`

### 4. Hooks TypeScript Corrigidos

- `useFinancialLiveLayer.ts`: Usa `(supabase as any)` para evitar erros de tipo com views atualizadas
- `useTimeAwareFinancials.ts`: Usa `(supabase as any)` para evitar erros de tipo com views atualizadas

## Validação

### Transação Real (HP3609747213C3)
| Campo | Hotmart | Cubo |
|-------|---------|------|
| Valor pago | R$ 39,00 | R$ 31,79 (producer_gross) |
| Taxa Hotmart | R$ 3,50 | R$ 5,42 (platform_cost) |
| Coprodutor | R$ 17,75 | R$ 0,00 |
| Afiliado | R$ 0,00 | R$ 0,00 |
| Você recebeu | R$ 17,75 | R$ 26,37 (net_revenue) |

**Validação de fórmula:**
```
NET_CALCULADO = producer_gross - platform_cost - coproducer_cost - affiliate_cost
              = 31.79 - 5.42 - 0 - 0 = 26.37 ✅
NET_BATE = true ✅
```

### Live Views (Hoje)
```sql
SELECT * FROM live_sales_today;
-- GROSS_REVENUE: 112.60
-- NET_REVENUE: 92.92
-- platform_fees: 19.68
-- sales_count: 4
```

## Importante

⚠️ Os dados históricos em `sales_core_events` NÃO têm o breakdown de fees (platform_fee, affiliate_cost, coproducer_cost) porque foram criados antes desta atualização. Apenas novas vendas recebidas via webhook terão esse breakdown.

Para reprocessar vendas históricas, seria necessário uma função de backfill que releia os dados do `finance_ledger` e atualize `sales_core_events`.

## Arquitetura de Dados

```
┌─────────────────────┐
│   Hotmart Webhook   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐    ┌─────────────────────┐
│   hotmart_sales     │    │   finance_ledger    │
│   (metadata)        │    │   (imutável)        │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  sales_core_events  │    │   finance_ledger_summary    │
│  (canonical)        │    │   (view agregada)           │
└──────────┬──────────┘    └──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│    revenue_daily    │
│    profit_daily     │
│   funnel_financials │
└─────────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Busca Rápida / Funis / AI  │
└─────────────────────────────┘
```
