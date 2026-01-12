# Financial Time Model

## Visão Geral

O Financial Time Model é a arquitetura que governa como dados financeiros são consumidos no sistema Cubo. O princípio fundamental é a separação clara entre **dados consolidados (Core)** e **dados em tempo real (Live)**.

## Princípio Fundamental

```
Financial Core = Verdade Histórica
Live Layer = Observação em Tempo Real

Nunca misturar. Nunca sobrescrever. Nunca usar Live para IA.
```

## Camadas de Dados

### 1. Financial Core (Dados Históricos)

- **Fonte**: Views `funnel_financials`, `sales_core_events`, `spend_core_events`
- **Período**: De `financial_core_start_date` até ontem
- **Trust Level**: `core`
- **Uso**: Dashboards, relatórios, IA, otimizações

#### Características
- Dados já processados e consolidados
- Não sofrem alterações retroativas
- Únicos dados permitidos para IA
- Incluem `economic_day` ajustado

### 2. Live Layer (Tempo Real)

- **Fonte**: Views `live_sales_today`, `live_spend_today`, `live_financial_today`
- **Período**: Somente o dia atual
- **Trust Level**: `live`
- **Uso**: Monitoramento em tempo real apenas

#### Características
- Dados diretos das plataformas (Meta, Hotmart)
- Podem mudar ao longo do dia
- Marcados como `is_estimated: true`
- **NUNCA** usados para IA

## Economic Day

O `economic_day` representa a data econômica real do evento, considerando:

1. **Vendas**: Data da confirmação do pagamento (não do checkout)
2. **Gastos**: Data em que o anúncio foi veiculado
3. **Timezone**: Ajustado para America/Sao_Paulo

## Trust Levels

| Trust Level | Descrição | Uso Permitido |
|------------|-----------|---------------|
| `core` | Dados consolidados do Financial Core | Dashboards, IA, relatórios, otimizações |
| `live` | Dados em tempo real do dia atual | Apenas monitoramento |

## Regra Temporal Global

```typescript
if (date < today) {
  use Financial Core (sales_core_events, spend_core_events, views)
} else if (date === today) {
  use:
    - Live Spend (Meta APIs / meta_insights)
    - Live Sales (Hotmart APIs / hotmart_sales)
    - Mark data as "live_estimated"
}
```

## Comparações de Período

Quando o usuário seleciona um período que inclui o dia atual:

1. **Dias anteriores**: Usar Core
2. **Hoje**: Usar Live
3. **UI**: Mostrar badge "Hoje ainda em tempo real"
4. **Cálculos**: Manter separados, não misturar

## IA Safety

### Regras Absolutas

1. IA **NUNCA** consume dados `live`
2. IA **NUNCA** analisa o dia atual
3. IA só recebe `trust_level: 'core'`
4. Validação obrigatória via `validateAISafety()`

### Hooks Protegidos

Os seguintes hooks são "AI-safe" e nunca retornam live data:

- `useCoreOnlyFinancials()`
- `useFunnelAIContext()`
- `useFunnelOptimization()` (internamente)

## UI Indicators

### Badges

| Ícone | Cor | Significado |
|-------|-----|-------------|
| 🔵 | Azul | Live - Dados em tempo real |
| 🟢 | Verde | Core - Dados consolidados |
| 🟡 | Amarelo | Misto - Período com ambos |

### Componentes

```tsx
<FinancialTimeBadge mode="core" />
<FinancialTimeBadge mode="live" />
<FinancialTimeBadge mode="mixed" />

<DataTrustBadge trustLevel="core" />
<LiveDataWarning />
```

## Logging & Auditoria

Toda query financeira é registrada em `financial_query_log`:

```json
{
  "project_id": "uuid",
  "query_context": "funnel_analysis",
  "date_range_start": "2026-01-01",
  "date_range_end": "2026-01-12",
  "mode": "mixed",
  "sources": ["funnel_financials", "live_financial_today"],
  "used_for_ai": false,
  "trust_level": "live"
}
```

## Views do Banco de Dados

### Core Views
- `funnel_revenue` - Receita por funil (Core)
- `funnel_spend` - Gasto por funil (Core)
- `funnel_financials` - Financeiro consolidado (Core)
- `funnel_financials_summary` - Resumo agregado (Core)

### Live Views
- `live_sales_today` - Vendas de hoje (Live)
- `live_spend_today` - Gastos de hoje (Live)
- `live_financial_today` - Financeiro de hoje (Live)
- `live_project_totals_today` - Totais do projeto hoje (Live)

## Proibições

❌ Usar Meta hoje para IA  
❌ Usar Hotmart hoje para IA  
❌ Gravar dados Live dentro do Core  
❌ Misturar sem flag explícita  
❌ Omitir indicadores de fonte na UI  

## Implementação

### Helper Global

```typescript
import { getFinancialDataContext, getTodayString } from '@/lib/financialTimeModel';

const context = getFinancialDataContext(startDate, endDate, coreStartDate);

// context.mode: 'core' | 'live' | 'mixed'
// context.trustLevel: 'core' | 'live'
// context.isAISafe: boolean
// context.sources: string[]
```

### Hook de Dados Time-Aware

```typescript
import { useTimeAwareFinancials } from '@/hooks/useTimeAwareFinancials';

const { coreData, liveData, context, mode } = useTimeAwareFinancials({
  startDate: '2026-01-01',
  endDate: '2026-01-12',
  funnelId: 'optional-uuid'
});
```

### Hook Core-Only (para IA)

```typescript
import { useCoreOnlyFinancials } from '@/hooks/useTimeAwareFinancials';

const { data, isAISafe, trustLevel } = useCoreOnlyFinancials({
  startDate: '2026-01-01',
  endDate: '2026-01-12'
});

// data NUNCA contém dados de hoje
// isAISafe é sempre true
```

## Migração e Compatibilidade

O sistema é retrocompatível. O `financial_core_start_date` define a partir de quando os dados Core são confiáveis. Antes dessa data, dados legados podem estar disponíveis mas são marcados separadamente.
