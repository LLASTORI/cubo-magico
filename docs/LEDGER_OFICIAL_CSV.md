# Ledger Oficial via CSV Hotmart

## Visão Geral

O Ledger Oficial é a fonte definitiva para fechamento financeiro no Cubo Mágico. Ele usa o "Modelo Detalhado de Vendas" exportado diretamente da Hotmart para garantir que os valores financeiros estejam 100% corretos.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HIERARQUIA DE DADOS FINANCEIROS                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. WEBHOOK (Tempo Real)                                          │
│      └── finance_ledger                                             │
│          └── Dados imediatos, mas podem ter pequenas imprecisões   │
│                                                                     │
│   2. CSV OFICIAL (Fechamento)                                      │
│      └── ledger_official                                            │
│          └── Dados definitivos exportados da Hotmart               │
│          └── Sobrescreve/reconcilia finance_ledger                 │
│                                                                     │
│   3. VIEWS ANALÍTICAS                                              │
│      └── finance_ledger_summary                                     │
│      └── financial_daily                                            │
│      └── owner_profit_daily                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Tabelas

### `ledger_official`

Armazena cada transação com breakdown financeiro completo:

| Campo | Descrição |
|-------|-----------|
| `transaction_id` | ID único da transação Hotmart |
| `gross_value` | Valor bruto total |
| `product_price` | Preço do produto |
| `offer_price` | Preço da oferta |
| `platform_fee` | Taxa da Hotmart |
| `affiliate_commission` | Comissão do afiliado |
| `coproducer_commission` | Comissão do co-produtor |
| `taxes` | Impostos retidos |
| `net_value` | Valor líquido na moeda original |
| `exchange_rate` | Taxa de câmbio |
| `net_value_brl` | Valor líquido em BRL |
| `payout_id` | ID do repasse |
| `payout_date` | Data do repasse |
| `is_reconciled` | Se foi reconciliado com webhook |
| `has_divergence` | Se há divergência com webhook |
| `divergence_amount` | Valor da divergência |

### `ledger_import_batches`

Rastreia cada importação de CSV:

| Campo | Descrição |
|-------|-----------|
| `file_name` | Nome do arquivo importado |
| `total_rows` | Total de linhas no CSV |
| `imported_rows` | Linhas importadas com sucesso |
| `reconciled_count` | Transações reconciliadas |
| `divergence_count` | Transações com divergência |
| `new_transactions_count` | Transações sem webhook |
| `total_gross` / `total_net` | Totais financeiros |
| `period_start` / `period_end` | Período coberto |

## Fluxo de Importação

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CSV Hotmart   │────▶│  Parse & Valida  │────▶│  Reconciliação  │
│  (Modelo Det.)  │     │     Colunas      │     │   com Webhook   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
           ┌──────────────────────────────────────────────┴──────────┐
           │                                                         │
           ▼                                                         ▼
┌─────────────────────┐                              ┌─────────────────────┐
│  Transação MATCH    │                              │  Transação NOVA     │
│  (tem no webhook)   │                              │  (só no CSV)        │
├─────────────────────┤                              ├─────────────────────┤
│ Compara net_value   │                              │ Marca como          │
│ CSV vs Webhook      │                              │ new_transaction     │
├──────────┬──────────┤                              └─────────────────────┘
│ < 0.1%   │ ≥ 0.1%   │
│ diff     │ diff     │
├──────────┼──────────┤
│ ✅ MATCH │ ⚠️ DIVERG│
│ is_recon │ has_div  │
│ =true    │ =true    │
└──────────┴──────────┘
           │
           ▼
┌─────────────────────┐
│   ledger_official   │
│   (UPSERT)          │
└─────────────────────┘
```

## Como Exportar o CSV da Hotmart

1. Acesse o painel da Hotmart
2. Vá em **Vendas** → **Histórico de Vendas**
3. Selecione o período desejado
4. Clique em **Exportar** → **Modelo Detalhado**
5. Aguarde o download do CSV

## Mapeamento de Colunas

O sistema reconhece automaticamente as seguintes colunas do CSV Hotmart:

### Campos Obrigatórios
- `Transação` → `transaction_id`
- `Valor Líquido` / `Faturamento Líquido` → `net_value`

### Campos Financeiros
- `Preço Total` / `Valor Bruto` → `gross_value`
- `Taxa Hotmart` → `platform_fee`
- `Comissão Afiliado` → `affiliate_commission`
- `Comissão Co-produtor` → `coproducer_commission`
- `Impostos` → `taxes`
- `Taxa de Câmbio` → `exchange_rate`

### Campos de Repasse
- `ID Repasse` → `payout_id`
- `Data Repasse` → `payout_date`

## Relatório de Reconciliação

Após a importação, o sistema gera um relatório com:

1. **Transações Reconciliadas** ✅
   - CSV e webhook concordam (diferença < 0.1%)
   
2. **Transações com Divergência** ⚠️
   - Mostra diferença entre CSV e webhook
   - Permite investigação manual
   
3. **Transações Novas** 🆕
   - Presentes no CSV mas não no webhook
   - Podem ser vendas antigas ou de outro período

## Validações SQL

### Verificar Reconciliação

```sql
-- Transações reconciliadas vs divergentes
SELECT 
  is_reconciled,
  has_divergence,
  COUNT(*) as count,
  SUM(net_value_brl) as total
FROM ledger_official
WHERE project_id = 'SEU_PROJECT_ID'
GROUP BY is_reconciled, has_divergence;
```

### Listar Divergências

```sql
SELECT 
  transaction_id,
  net_value_brl as csv_value,
  divergence_webhook_value as webhook_value,
  divergence_amount,
  ABS(divergence_amount / NULLIF(divergence_webhook_value, 0) * 100) as pct_diff
FROM ledger_official
WHERE project_id = 'SEU_PROJECT_ID'
  AND has_divergence = true
ORDER BY ABS(divergence_amount) DESC
LIMIT 20;
```

### Comparar Totais

```sql
-- Comparar totais CSV vs Webhook
WITH csv_totals AS (
  SELECT 
    SUM(gross_value) as csv_gross,
    SUM(net_value_brl) as csv_net
  FROM ledger_official
  WHERE project_id = 'SEU_PROJECT_ID'
),
webhook_totals AS (
  SELECT 
    SUM(CASE WHEN event_type IN ('credit', 'producer') THEN amount ELSE 0 END) as webhook_gross,
    SUM(CASE WHEN event_type IN ('credit', 'producer') THEN amount ELSE 0 END)
    - SUM(CASE WHEN event_type IN ('affiliate', 'coproducer', 'platform_fee', 'tax') THEN ABS(amount) ELSE 0 END) as webhook_net
  FROM finance_ledger
  WHERE project_id = 'SEU_PROJECT_ID'
)
SELECT 
  c.csv_gross,
  w.webhook_gross,
  c.csv_net,
  w.webhook_net,
  c.csv_net - w.webhook_net as net_difference
FROM csv_totals c, webhook_totals w;
```

## Próximos Passos

1. **View Consolidada** (futuro)
   - Criar view que prioriza `ledger_official` quando existir
   - Fallback para `finance_ledger` quando não houver CSV
   
2. **Alertas de Divergência**
   - Notificar quando divergência total > X%
   
3. **Fechamento Mensal**
   - Marcar meses como "fechados" após reconciliação
