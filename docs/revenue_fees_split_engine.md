# Revenue, Fees & Split Engine

## Overview

The Revenue, Fees & Split Engine separates what the customer paid (gross revenue) from what the business actually earned (net revenue after platform fees and partner splits).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    sales_core_events                            │
│  (gross_amount, net_amount, event_type, product info)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      revenue_daily                               │
│  Aggregates: gross_revenue, platform_fees, net_revenue          │
│  Grouped by: project_id, economic_day                           │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────────────┐
│ product_revenue_    │              │       spend_daily           │
│     splits          │              │ (from spend_core_events)    │
│ (owner, coproducer, │              └─────────────────────────────┘
│  affiliate %)       │                          │
└─────────────────────┘                          │
          │                                       │
          ▼                                       │
┌─────────────────────┐                          │
│ revenue_allocations │                          │
│ (per transaction)   │                          │
└─────────────────────┘                          │
          │                                       │
          ▼                                       │
┌─────────────────────┐                          │
│revenue_allocations_ │                          │
│       daily         │                          │
└─────────────────────┘                          │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       profit_daily                               │
│  net_revenue - ad_spend = profit                                │
│  ROAS = net_revenue / ad_spend (NEVER use gross!)               │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────────────┐
│   profit_monthly    │              │   owner_profit_daily        │
│ (aggregated by      │              │ (after partner splits)      │
│  month)             │              └─────────────────────────────┘
└─────────────────────┘
```

## Database Objects

### Views

| View | Purpose | Key Columns |
|------|---------|-------------|
| `revenue_daily` | Daily revenue with fee breakdown | gross_revenue, platform_fees, net_revenue |
| `revenue_allocations` | Per-transaction partner allocations | allocated_amount, partner_type, percentage |
| `revenue_allocations_daily` | Daily summary of allocations | total_allocated, partner_type |
| `profit_daily` | Daily profit = net_revenue - ad_spend | profit, roas (based on net) |
| `profit_monthly` | Monthly profit aggregation | profit, roas |
| `owner_profit_daily` | Owner's share after splits | owner_profit, owner_roas |

### Tables

| Table | Purpose |
|-------|---------|
| `product_revenue_splits` | Split rules per product (owner, coproducer, affiliate) |

## Key Formulas

### Platform Fees
```sql
platform_fees = gross_amount - net_amount
```

### Net Revenue
```sql
net_revenue = SUM(net_amount) -- after platform fees
```

### Profit
```sql
profit = net_revenue - ad_spend
```

### ROAS (IMPORTANT!)
```sql
-- CORRECT: Use NET revenue
roas = net_revenue / ad_spend

-- WRONG: Never use gross revenue!
-- roas = gross_revenue / ad_spend  -- DON'T DO THIS
```

### Partner Allocation
```sql
allocated_amount = net_amount * percentage
```

## Usage Guidelines

### For AI/Optimization
```typescript
// ALWAYS use net_revenue for:
// - ROAS calculations
// - Profit calculations
// - Funnel health metrics
// - Optimization decisions

const { aiContext } = useFunnelAIContext(funnelId);
// aiContext.total_revenue is NET (after fees)
// aiContext.overall_roas is based on NET revenue
```

### For Dashboards
```typescript
// Use profit_daily for accurate metrics
const { summary } = useProfitSummary({ startDate, endDate });
// summary.net_revenue - the actual revenue you keep
// summary.platform_fees - what the platform takes
// summary.profit - net_revenue - ad_spend
```

### For Partner Splits
```typescript
// Manage splits per product
const { data: splits } = useProductRevenueSplits(productId);

// Create a new split
const createSplit = useCreateRevenueSplit();
await createSplit.mutateAsync({
  product_id: '123',
  partner_type: 'coproducer',
  partner_name: 'Partner Name',
  percentage: 0.3, // 30%
});
```

## Validation Query

Run this to verify revenue and profit calculations:

```sql
SELECT 
  economic_day, 
  gross_revenue, 
  platform_fees, 
  net_revenue, 
  ad_spend,
  profit,
  roas
FROM profit_daily
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY economic_day DESC
LIMIT 14;
```

Expected behavior:
- `platform_fees = gross_revenue - net_revenue`
- `profit = net_revenue - ad_spend`
- `roas = net_revenue / ad_spend` (null if no spend)

## Hook Reference

| Hook | Purpose |
|------|---------|
| `useProfitDaily` | Daily profit data |
| `useProfitMonthly` | Monthly profit data |
| `useProfitSummary` | Aggregated profit summary |
| `useOwnerProfitDaily` | Owner-specific profit after splits |
| `useRevenueDaily` | Daily revenue breakdown |
| `useProfitAIContext` | AI-ready profit metrics |
| `useProductRevenueSplits` | Manage product splits |
| `useRevenueAllocations` | View revenue allocations |
| `useRevenueValidation` | Debugging/validation |

## Important Rules

1. **NEVER use gross_revenue for optimization** - Always use net_revenue
2. **ROAS must be based on net_revenue** - This reflects actual business performance
3. **Profit = net_revenue - ad_spend** - Not gross_revenue - ad_spend
4. **AI analysis must use net metrics** - All AI hooks enforce this automatically
5. **Splits apply to net_revenue** - Partners get a percentage of what you actually keep
