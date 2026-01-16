# PROMPT 9 — Materialização de UTMs no Orders Core

## Data: 2026-01-16

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

UTMs são agora colunas físicas na tabela `orders`, eliminando parsing em runtime.

---

## 🎯 Decisão Arquitetural

> **UTMs são materializados no momento da escrita, não em runtime.**
>
> O frontend e hooks NÃO podem parsear UTMs de `raw_payload`.
> Todos os filtros SQL são feitos diretamente nas colunas.

---

## 📊 Novas Colunas em `orders`

| Coluna | Tipo | Descrição | Origem no SCK |
|--------|------|-----------|---------------|
| `utm_source` | TEXT | Fonte do tráfego (ex: "Meta-Ads", "wpp") | parts[0] |
| `utm_campaign` | TEXT | Campanha (inclui Meta ID no sufixo) | parts[2] |
| `utm_adset` | TEXT | Adset / Conjunto de anúncios | parts[1] (era utm_medium) |
| `utm_placement` | TEXT | Posicionamento (ex: "Instagram_Stories") | parts[3] (era utm_term) |
| `utm_creative` | TEXT | Criativo / Anúncio | parts[4] (era utm_content) |
| `raw_sck` | TEXT | SCK original para auditoria | checkout_origin completo |
| `meta_campaign_id` | TEXT | ID numérico da campanha Meta | Extraído do sufixo de utm_campaign |
| `meta_adset_id` | TEXT | ID numérico do adset Meta | Extraído do sufixo de utm_adset |
| `meta_ad_id` | TEXT | ID numérico do anúncio Meta | Extraído do sufixo de utm_creative |

---

## 🔀 Mapeamento SCK → Orders

```
SCK: Meta-Ads|00_ADVANTAGE_6845240173892|PERPETUO_MAKEPRATICA13M_VENDA33_6845240176292|Instagram_Stories|Teste—VENDA_6858871344292

Resultado:
├── utm_source      = "Meta-Ads"
├── utm_adset       = "00_ADVANTAGE_6845240173892"
├── utm_campaign    = "PERPETUO_MAKEPRATICA13M_VENDA33_6845240176292"
├── utm_placement   = "Instagram_Stories"
├── utm_creative    = "Teste—VENDA_6858871344292"
├── meta_adset_id   = "6845240173892"
├── meta_campaign_id = "6845240176292"
└── meta_ad_id      = "6858871344292"
```

---

## 📝 Arquivos Modificados

### 1. Migration SQL
- Adicionadas 9 colunas UTM na tabela `orders`
- Criados índices otimizados para filtros:
  - `idx_orders_utm_source`
  - `idx_orders_utm_campaign`
  - `idx_orders_utm_adset`
  - `idx_orders_utm_placement`
  - `idx_orders_utm_source_campaign` (composto)
  - `idx_orders_meta_*` para join com Meta Ads

### 2. `supabase/functions/hotmart-webhook/index.ts`
- `writeOrderShadow()` agora extrai SCK do payload
- Insert de orders inclui todas as colunas UTM materializadas
- Log de UTM extraction adicionado

### 3. `supabase/functions/hotmart-orders-backfill-14d/index.ts`
- Adicionadas funções `parseSCKtoUTMs()` e `resolveSCK()`
- Insert de novos orders inclui UTMs materializados
- Update de orders existentes SEM UTM faz backfill automático

---

## 🚀 Índices SQL Criados

```sql
-- Filtros individuais
CREATE INDEX idx_orders_utm_source ON orders(project_id, utm_source);
CREATE INDEX idx_orders_utm_campaign ON orders(project_id, utm_campaign);
CREATE INDEX idx_orders_utm_adset ON orders(project_id, utm_adset);
CREATE INDEX idx_orders_utm_placement ON orders(project_id, utm_placement);

-- Filtro composto (mais comum)
CREATE INDEX idx_orders_utm_source_campaign ON orders(project_id, utm_source, utm_campaign);

-- Meta IDs para join com meta_ads
CREATE INDEX idx_orders_meta_campaign_id ON orders(project_id, meta_campaign_id);
CREATE INDEX idx_orders_meta_adset_id ON orders(project_id, meta_adset_id);
CREATE INDEX idx_orders_meta_ad_id ON orders(project_id, meta_ad_id);
```

---

## 🔍 Validação SQL

```sql
-- Verificar UTMs materializados
SELECT 
  provider_order_id,
  utm_source,
  utm_campaign,
  utm_adset,
  utm_placement,
  utm_creative,
  meta_campaign_id,
  meta_adset_id,
  meta_ad_id
FROM orders
WHERE utm_source IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Contar orders por fonte
SELECT 
  utm_source,
  COUNT(*) as total
FROM orders
WHERE project_id = 'YOUR_PROJECT_ID'
GROUP BY utm_source
ORDER BY total DESC;
```

---

## ⚠️ Regra de Ouro

> **A partir deste prompt, é PROIBIDO parsear UTMs em runtime no frontend ou hooks.**
>
> - ❌ `parseSck(order.raw_payload)` no hook
> - ❌ `order.raw_payload.data.purchase.origin.sck` no componente
> - ✅ `order.utm_source`, `order.utm_campaign`, etc.

---

## 🔄 Backfill de Dados Existentes

Para popular UTMs em orders existentes:

```bash
curl -X POST https://jcbzwxgayxrnxlgmmlni.supabase.co/functions/v1/hotmart-orders-backfill-14d \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{"projectId": "YOUR_PROJECT_ID"}'
```

O backfill:
1. Lê cada evento do `provider_event_log`
2. Extrai SCK do `raw_payload`
3. Parseia para UTMs
4. Atualiza orders existentes sem UTMs
5. Cria novos orders com UTMs materializados

---

## 📌 Próximo Passo (PROMPT 10)

Com UTMs materializados, os filtros SQL podem ser implementados diretamente:

```sql
SELECT * FROM orders
WHERE project_id = ?
  AND utm_source = 'Meta-Ads'
  AND utm_campaign ILIKE '%PERPETUO%'
ORDER BY ordered_at DESC;
```

Isso habilitará filtros server-side na Busca Rápida, resolvendo os problemas de paginação.
