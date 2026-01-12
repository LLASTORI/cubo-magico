# Correção do Mapeamento Financeiro Hotmart → Sales Core

## Data: 2026-01-12

## 🔴 PROBLEMA IDENTIFICADO

O mapeamento financeiro estava **COMPLETAMENTE ERRADO**, invalidando todos os cálculos de ROAS, lucro, dashboards e IA.

### Mapeamento ANTIGO (Incorreto)

| Campo Semântico | Campo Hotmart | Valor Gravado em `net_amount` |
|-----------------|---------------|-------------------------------|
| Taxa Hotmart | `commissions[0].value` (MARKETPLACE) | ❌ Era gravado como `net_amount` |
| Você recebeu (Owner) | `commissions[1].value` (PRODUCER) | ❌ Ignorado |

### Transação de Referência: HP0232573857

**Dados da Hotmart:**
```
Valor pago pelo comprador: R$ 66,42
Base (sem impostos): R$ 59,01
Taxa Hotmart (MARKETPLACE): R$ 4,78
Coprodutor (PRODUCER): R$ 27,11
Você recebeu: R$ 27,11
```

**Dados no banco (ANTES - ERRADO):**
```sql
SELECT gross_amount, net_amount FROM sales_core_events 
WHERE provider_event_id LIKE '%HP0232573857%';

-- gross_amount: 66.42 ✅ Correto
-- net_amount: 4.78 ❌ ERRADO! Isso é a taxa Hotmart, não o "Você recebeu"
```

## ✅ CORREÇÃO APLICADA

### Estrutura de Commissions da Hotmart

```javascript
commissions: [
  { source: "MARKETPLACE", value: 4.78 },   // Taxa Hotmart → plataforma
  { source: "PRODUCER", value: 27.11 },     // Owner's net → "Você recebeu"
  { source: "CO_PRODUCER", value: X },      // Coprodutor (quando há)
  { source: "AFFILIATE", value: X }         // Afiliado (quando há)
]
```

### Novo Mapeamento (Correto)

| Campo Semântico | Campo Hotmart | Coluna `sales_core_events` |
|-----------------|---------------|---------------------------|
| Valor pago pelo comprador | `full_price.value` | `gross_amount` |
| Taxa Hotmart | `MARKETPLACE` commission | (informativo, não gravado) |
| Coprodutor | `CO_PRODUCER` commission | (informativo, não gravado) |
| Afiliado | `AFFILIATE` commission | (informativo, não gravado) |
| **Você recebeu (Owner)** | `PRODUCER` commission | **`net_amount`** ✅ |

### Arquivos Modificados

1. `supabase/functions/hotmart-api/index.ts`
   - Adicionada função `extractFinancialBreakdown()` para parsing correto
   - Atualizada função `batchWriteSalesCoreEvents()` para usar `ownerNet`
   - Logs detalhados para verificação

2. `supabase/functions/hotmart-webhook/index.ts`
   - Parsing correto de commissions por source
   - `net_revenue` agora usa `PRODUCER` commission
   - `ownerNetRevenue` passado para `writeSalesCoreEvent()`

## 🔄 REPROCESSAMENTO

Para corrigir os dados históricos, execute:

### Passo 1: Marcar eventos antigos como inativos
```sql
UPDATE sales_core_events
SET is_active = false
WHERE provider = 'hotmart'
  AND is_active = true;
```

### Passo 2: Resincronizar via API
Acesse a página de Sincronização no app e execute um sync completo do Hotmart.

### Passo 3: Validar
```sql
-- Verificar se net_amount agora bate com PRODUCER commission
SELECT 
  provider_event_id,
  gross_amount,
  net_amount,
  raw_payload->'data'->'commissions'->0->>'source' as source_0,
  raw_payload->'data'->'commissions'->0->>'value' as value_0,
  raw_payload->'data'->'commissions'->1->>'source' as source_1,
  raw_payload->'data'->'commissions'->1->>'value' as value_1
FROM sales_core_events
WHERE provider = 'hotmart'
  AND is_active = true
ORDER BY economic_day DESC
LIMIT 10;
```

O `net_amount` deve ser igual ao valor de `PRODUCER`, não de `MARKETPLACE`.

## 📊 IMPACTO

### Antes da Correção
- ROAS calculado com Taxa Hotmart como receita
- Lucro subestimado em ~80% (usando taxa de 4,78 em vez de 27,11)
- Dashboards mostrando dados irreais

### Após a Correção
- `net_amount` = Dinheiro real do owner ("Você recebeu")
- ROAS correto baseado na receita líquida real
- Lucro calculado corretamente
- IA com dados confiáveis

## ✅ VALIDAÇÃO FINAL

Após reprocessamento, execute:

```sql
-- Comparar totais do dia
SELECT 
  COUNT(*) as transacoes,
  SUM(gross_amount) as gross_total,
  SUM(net_amount) as net_total,
  ROUND((SUM(net_amount) / NULLIF(SUM(gross_amount), 0)) * 100, 1) as margin_percent
FROM sales_core_events
WHERE provider = 'hotmart'
  AND is_active = true
  AND economic_day = CURRENT_DATE;
```

A margem (`margin_percent`) deve estar entre 30-60% para a maioria dos produtos digitais, **NÃO** 5-10% como estava antes.
