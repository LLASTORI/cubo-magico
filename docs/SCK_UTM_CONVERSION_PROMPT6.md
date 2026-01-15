# PROMPT 6 — Converter SCK da Hotmart de volta para UTM padrão

## Data: 2026-01-15

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

O Cubo Mágico agora converte corretamente o SCK (Serial Checkout Key) da Hotmart para UTMs padrão.

---

## 🧠 1️⃣ Contrato de Dados

### Tráfego Original (Meta Ads, Google Ads, etc)
```
utm_source   = Meta-Ads
utm_medium   = {{adset.name}}_{{adset.id}}
utm_campaign = {{campaign.name}}_{{campaign.id}}
utm_term     = {{placement}}
utm_content  = {{ad.name}}_{{ad.id}}
```

### Script da Página de Vendas
```javascript
sck = utm_source | utm_medium | utm_campaign | utm_term | utm_content
```

### Exemplo Real Enviado pela Hotmart
```
Meta-Ads|00_ADVANTAGE_6845240173892|PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292|Instagram_Stories|Teste—VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292
```

---

## 🔁 2️⃣ Regra de Conversão (Hotmart → Cubo)

| Posição | SCK Part | UTM do Cubo | Exemplo |
|---------|----------|-------------|---------|
| 0 | parts[0] | `utm_source` | "Meta-Ads" |
| 1 | parts[1] | `utm_medium` | "00_ADVANTAGE_6845240173892" |
| 2 | parts[2] | `utm_campaign` | "PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292" |
| 3 | parts[3] | `utm_term` | "Instagram_Stories" |
| 4 | parts[4] | `utm_content` | "Teste—VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292" |
| 5+ | parts[5+] | `extra_params` | "page_name=hm-make-pratica-2" |

### IDs do Meta Extraídos Automaticamente
- `meta_adset_id` ← extraído do final de `utm_medium` (números com 10+ dígitos)
- `meta_campaign_id` ← extraído do final de `utm_campaign`
- `meta_ad_id` ← extraído do final de `utm_content`

---

## 📦 3️⃣ Onde os Dados São Salvos

### hotmart_sales
```sql
utm_source           -- "Meta-Ads" (mantido como-is, sem normalização)
utm_medium           -- "00_ADVANTAGE_6845240173892" (adset.name_adset.id)
utm_campaign_id      -- "PERPETUO_MAKEPRATICA13M..." (campaign.name_campaign.id)
utm_term             -- "Instagram_Stories" (placement)
utm_content          -- "Teste—VENDA_TRAFEGO..." (ad.name_ad.id)
raw_checkout_origin  -- SCK original completo para auditoria

-- Campos legado mantidos por compatibilidade
utm_adset_name       -- Mesmo valor que utm_medium
utm_creative         -- Mesmo valor que utm_content
utm_placement        -- Mesmo valor que utm_term
```

### sales_core_events.attribution (JSONB)
```json
{
  "utm_source": "Meta-Ads",
  "utm_medium": "00_ADVANTAGE_6845240173892",
  "utm_campaign": "PERPETUO_MAKEPRATICA13M...",
  "utm_term": "Instagram_Stories",
  "utm_content": "Teste—VENDA_TRAFEGO...",
  "meta_campaign_id": "6845240176292",
  "meta_adset_id": "6845240173892",
  "meta_ad_id": "6858871344292",
  "raw_checkout_origin": "Meta-Ads|00_ADVANTAGE_...",
  "extra_params": null
}
```

### finance_ledger.attribution (JSONB)
Mesma estrutura que sales_core_events.attribution.

### finance_ledger_summary (View)
```sql
utm_source
utm_medium
utm_campaign
utm_term           -- COALESCE(hs.utm_term, hs.utm_placement)
utm_content        -- COALESCE(hs.utm_content, hs.utm_creative)
raw_checkout_origin
meta_campaign_id
meta_adset_id
meta_ad_id
```

---

## 🔒 4️⃣ Escopo do Parser

O parser SCK→UTM é aplicado **somente para provider = 'hotmart'**.

Outros providers (Meta API direta, Google Ads, TikTok, orgânico, etc.) já enviam UTMs normais e NÃO devem passar por esse parser.

---

## 🔎 5️⃣ Validação

Após receber um webhook com SCK, os dados devem aparecer assim:

```sql
SELECT 
  utm_source,
  utm_medium,
  utm_campaign_id AS utm_campaign,
  utm_term,
  utm_content,
  raw_checkout_origin
FROM hotmart_sales
WHERE checkout_origin IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado:**
```
utm_source   = "Meta-Ads"
utm_medium   = "00_ADVANTAGE_6845240173892"
utm_campaign = "PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292"
utm_term     = "Instagram_Stories"
utm_content  = "Teste—VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292"
```

---

## 📝 Arquivos Modificados

1. `supabase/functions/hotmart-webhook/index.ts`
   - Novo parser `parseSCKtoUTMs()` (linhas 49-167)
   - `extractAttribution()` atualizado para usar novos campos
   - `LedgerEntry` interface inclui `attribution` JSONB
   - `parseCommissionsToLedgerEntries()` aceita attribution
   - Campos `utm_term`, `utm_content`, `raw_checkout_origin` salvos em hotmart_sales

2. Migrations:
   - `hotmart_sales` ganha colunas `utm_term`, `utm_content`, `raw_checkout_origin`
   - `finance_ledger` ganha coluna `attribution` JSONB
   - Index criado em `(project_id, utm_source, utm_medium, utm_campaign_id)`

---

## 🔄 Backfill de Dados Existentes

Vendas antigas podem ser atualizadas via:
1. Re-envio de webhooks no painel Hotmart
2. Backfill via hotmart-api com resync
3. Script SQL de backfill parseando checkout_origin

O webhook atualiza automaticamente registros existentes quando recebe o mesmo `transaction_id`.
