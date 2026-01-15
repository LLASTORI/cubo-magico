# Hotmart Webhook - Financial & UTM Parsing

## Data: 2026-01-15

## 📊 Mapeamento Financeiro CORRETO

### Campos do Webhook Hotmart

```javascript
// Do payload do webhook:
purchase.total_price.value  // Valor pago pelo comprador
purchase.full_price.value   // Valor bruto (com taxas)

// commissions[] array:
commissions = [
  { source: "MARKETPLACE", value: X },  // Taxa Hotmart
  { source: "PRODUCER", value: Y },     // "Você recebeu" (líquido do owner)
  { source: "CO_PRODUCER", value: Z },  // Coprodutor (quando há)
  { source: "AFFILIATE", value: W }     // Afiliado (quando há)
]
```

### Mapeamento para Cubo

| Campo Hotmart | Cubo Campo | Tabela |
|---------------|------------|--------|
| `purchase.full_price.value` | `gross_amount` / `total_price_brl` | hotmart_sales, sales_core_events |
| `MARKETPLACE` commission | `platform_fee` | finance_ledger |
| `PRODUCER` commission | `net_revenue` / `net_amount` | hotmart_sales, sales_core_events, finance_ledger |
| `CO_PRODUCER` commission | `coproducer_cost` | finance_ledger |
| `AFFILIATE` commission | `affiliate_cost` | finance_ledger |

### Validação

```
gross - platform_fee - coproducer_cost - affiliate_cost = net_revenue
```

**Exemplo Real:**
```
Valor pago: R$ 39,00 (gross)
Taxa Hotmart: R$ 3,50 (MARKETPLACE)
Coprodutor: R$ 17,75 (CO_PRODUCER)
Afiliado: R$ 0 (AFFILIATE)
Você recebeu: R$ 17,75 (PRODUCER)

Validação: 39 - 3.50 - 17.75 - 0 = 17.75 ✅
```

## 🔗 Parsing de UTMs do checkout_origin

### Formato do checkout_origin

```
Meta-Ads|campaign_name_ID|adset_name_ID|placement|creative_name_ID
```

**Exemplos reais:**
```
Meta-Ads|01_ADVANTAGE_ABERTA_6840169073892|PERPETUO_MAQUIAGEM35+_VENDA31_CBO_ANDROMEDA_6840169073692|Facebook_Mobile_Feed|Teste — VENDA_IMAGEM_45B_MAKE35+_6868051908092

wpp|g-amg|||
```

### Mapeamento de UTMs

| Posição | Campo | Exemplo |
|---------|-------|---------|
| 0 | `utm_source` | "facebook" (normalizado de "Meta-Ads") |
| 1 | `utm_campaign` | "01_ADVANTAGE_ABERTA_6840169073892" |
| 2 | `utm_adset` | "PERPETUO_MAQUIAGEM35+_VENDA31_CBO_ANDROMEDA_6840169073692" |
| 3 | `utm_placement` / `utm_medium` | "Facebook_Mobile_Feed" |
| 4 | `utm_creative` / `utm_content` | "Teste — VENDA_IMAGEM_45B_MAKE35+_6868051908092" |

### Extração de Meta IDs

Os IDs do Meta são extraídos automaticamente do final dos nomes:
```
campaign_name_6840169073892 → meta_campaign_id = "6840169073892"
adset_name_6840169073692    → meta_adset_id = "6840169073692"
creative_name_6868051908092 → meta_ad_id = "6868051908092"
```

### Normalização de Sources

| checkout_origin | utm_source | utm_medium |
|-----------------|------------|------------|
| `Meta-Ads\|...` | facebook | paid |
| `wpp\|...` | whatsapp | organic |
| `google\|...` | google | paid |
| `organic\|...` | direct | organic |

## 📝 Tabelas Atualizadas

### hotmart_sales
- `checkout_origin` - string raw
- `utm_source` - fonte normalizada
- `utm_medium` - meio (paid/organic)
- `utm_campaign_id` - nome da campanha
- `utm_adset_name` - nome do adset
- `utm_creative` - nome do criativo
- `utm_placement` - posicionamento
- `meta_campaign_id_extracted` - ID numérico
- `meta_adset_id_extracted` - ID numérico
- `meta_ad_id_extracted` - ID numérico

### sales_core_events (attribution JSONB)
```json
{
  "utm_source": "facebook",
  "utm_medium": "paid",
  "utm_campaign": "01_ADVANTAGE_ABERTA_6840169073892",
  "utm_adset": "PERPETUO_MAQUIAGEM35+...",
  "utm_placement": "Facebook_Mobile_Feed",
  "utm_creative": "Teste — VENDA_IMAGEM...",
  "meta_campaign_id": "6840169073892",
  "meta_adset_id": "6840169073692",
  "meta_ad_id": "6868051908092",
  "hotmart_checkout_source": "Meta-Ads|..."
}
```

### finance_ledger
- Ledger entries não contêm UTMs diretamente
- Attribution é vinculada via `transaction_id` → `sales_core_events`

## ✅ Validação SQL

```sql
-- Verificar parsing de UTMs
SELECT 
  transaction_id,
  checkout_origin,
  utm_source,
  utm_medium,
  utm_campaign_id,
  utm_adset_name,
  utm_placement,
  utm_creative,
  meta_campaign_id_extracted,
  meta_adset_id_extracted,
  meta_ad_id_extracted
FROM hotmart_sales 
WHERE checkout_origin IS NOT NULL
  AND utm_source IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Verificar financeiro
SELECT 
  transaction_id,
  total_price_brl as gross,
  net_revenue as net,
  ROUND((net_revenue::numeric / NULLIF(total_price_brl::numeric, 0)) * 100, 1) as margin_pct
FROM hotmart_sales
WHERE status IN ('APPROVED', 'COMPLETE')
ORDER BY created_at DESC
LIMIT 10;
```

A margem (`margin_pct`) deve estar entre 30-60% para produtos digitais típicos.

## 🔄 Reprocessamento de Vendas

Para corrigir vendas existentes com UTMs vazios, é necessário:
1. Re-enviar webhooks da Hotmart (configurar re-envio no painel)
2. OU executar backfill via hotmart-api com resync

O webhook atualiza automaticamente registros existentes quando recebe o mesmo `transaction_id`.
