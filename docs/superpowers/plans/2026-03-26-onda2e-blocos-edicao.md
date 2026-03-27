# Onda 2E: Blocos Reutilizaveis na LaunchEditionAnalysis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar blocos de analise reutilizaveis (PaymentMethod, Health, UTM, MetaHierarchy) na tela de edicao do lancamento pago.

**Architecture:** Buscar `editionSalesData` (SaleRecord[]) via `funnel_orders_view` filtrado pelo periodo da edicao. Passar como props aos componentes standalone existentes. Buscar `metaInsights` filtrado e usar `useMetaHierarchy` para hierarquia Meta.

**Tech Stack:** React, TanStack Query, Supabase PostgREST, componentes existentes em `src/components/funnel/` e `src/components/meta/`.

---

## Arquivo principal a modificar

- `src/pages/LaunchEditionAnalysis.tsx` — adicionar queries + importar 4 blocos

## Passo 6 (filtro lancamento_pago em FunnelAnalysis)

Ja resolvido: `useFunnelData` filtra por `funnel_type IN PERPETUO_TYPE_VARIANTS` e funis lancamento_pago tem `funnel_type = 'lancamento'`. Nenhuma alteracao necessaria.

---

### Task 1: editionSalesData — query completa a funnel_orders_view

**Files:**
- Modify: `src/pages/LaunchEditionAnalysis.tsx`

- [ ] **Step 1: Adicionar query editionSalesData**

Apos o `useLaunchEditionData`, adicionar:

```typescript
const { data: editionSalesData = [] } = useQuery({
  queryKey: ['edition-sales', projectId, funnelId, editionData?.id],
  enabled: !!editionData?.start_date && !!projectId && !!funnelId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('funnel_orders_view')
      .select('order_id, customer_paid, producer_net, main_offer_code, all_offer_codes, buyer_email, economic_day, payment_method, meta_campaign_id, meta_adset_id, meta_ad_id, utm_source, utm_medium, utm_campaign, utm_content, utm_adset, utm_placement, checkout_origin, main_revenue, status')
      .eq('project_id', projectId)
      .eq('funnel_id', funnelId!)
      .in('status', ['approved', 'completed', 'partial_refund'])
      .gte('economic_day', editionData!.start_date!)
      .lte('economic_day', editionData!.end_date || editionData!.event_date || editionData!.start_date!);
    if (error) throw error;
    return (data || []).map(r => ({
      offer_code: r.main_offer_code,
      gross_amount: Number(r.customer_paid) || 0,
      net_amount: Number(r.producer_net) || 0,
      buyer_email: r.buyer_email,
      payment_method: r.payment_method,
      economic_day: r.economic_day,
      meta_campaign_id: r.meta_campaign_id,
      meta_adset_id: r.meta_adset_id,
      meta_ad_id: r.meta_ad_id,
      utm_source: r.utm_source,
      utm_medium: r.utm_medium,
      utm_campaign: r.utm_campaign,
      utm_content: r.utm_content,
      utm_adset: r.utm_adset,
      utm_placement: r.utm_placement,
      checkout_origin: r.checkout_origin,
      main_revenue: Number(r.main_revenue) || 0,
      all_offer_codes: r.all_offer_codes,
    }));
  },
});
```

- [ ] **Step 2: Computar funnelOfferCodes**

```typescript
const funnelOfferCodes = useMemo(() => {
  const codes = new Set<string>();
  for (const s of editionSalesData) {
    if (s.offer_code) codes.add(s.offer_code);
    if (s.all_offer_codes) s.all_offer_codes.forEach(c => codes.add(c));
  }
  return Array.from(codes);
}, [editionSalesData]);
```

- [ ] **Step 3: Build e verificar**

Run: `npm run build`
Expected: zero erros

---

### Task 2: PaymentMethodAnalysis

**Files:**
- Modify: `src/pages/LaunchEditionAnalysis.tsx`

- [ ] **Step 1: Importar e renderizar**

Import: `import PaymentMethodAnalysis from "@/components/funnel/PaymentMethodAnalysis";`

Apos bloco "Funil de Conversao":

```tsx
{editionSalesData.length > 0 && (
  <Card className="p-4 space-y-3">
    <h2 className="font-semibold">Formas de Pagamento</h2>
    <PaymentMethodAnalysis
      salesData={editionSalesData}
      funnelOfferCodes={funnelOfferCodes}
    />
  </Card>
)}
```

- [ ] **Step 2: Build**

---

### Task 3: FunnelHealthMetrics

**Files:**
- Modify: `src/pages/LaunchEditionAnalysis.tsx`

- [ ] **Step 1: Importar hook e componente**

```typescript
import { useFunnelHealthMetrics } from "@/hooks/useFunnelHealthMetrics";
import { FunnelHealthMetrics } from "@/components/funnel/FunnelHealthMetrics";
```

- [ ] **Step 2: Chamar hook e renderizar**

Hook (apos editionSalesData):
```typescript
const { healthMetrics, isLoading: healthLoading } = useFunnelHealthMetrics({
  projectId: projectId || undefined,
  startDate,
  endDate,
});
// TODO: useFunnelHealthMetrics ainda usa hotmart_sales — migrar para funnel_orders_view
```

Render (apos PaymentMethodAnalysis):
```tsx
{!healthLoading && healthMetrics && healthMetrics.length > 0 && (
  <Card className="p-4 space-y-3">
    <h2 className="font-semibold">Saude do Funil</h2>
    <FunnelHealthMetrics healthData={healthMetrics[0]} />
  </Card>
)}
```

- [ ] **Step 3: Build**

---

### Task 4: metaInsights + MetaHierarchy + UTMAnalysis

**Files:**
- Modify: `src/pages/LaunchEditionAnalysis.tsx`

- [ ] **Step 1: Query metaInsights filtrado**

```typescript
const { data: editionMetaInsights = [] } = useQuery({
  queryKey: ['edition-meta-insights', projectId, editionData?.id],
  enabled: !!editionData?.start_date && !!projectId,
  queryFn: async () => {
    let q = supabase
      .from('meta_insights')
      .select('*')
      .eq('project_id', projectId);
    if (editionData!.start_date) q = q.gte('date_start', editionData!.start_date);
    const end = editionData!.end_date || editionData!.event_date;
    if (end) q = q.lte('date_start', end);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
});
```

- [ ] **Step 2: useMetaHierarchy**

```typescript
import { useMetaHierarchy } from "@/hooks/useMetaHierarchy";

const { campaigns, adsets, ads, isLoading: metaHierarchyLoading } = useMetaHierarchy({
  projectId: projectId || undefined,
  insights: editionMetaInsights,
  enabled: editionMetaInsights.length > 0,
});
```

- [ ] **Step 3: UTMAnalysis render**

```tsx
import UTMAnalysis from "@/components/funnel/UTMAnalysis";

{editionSalesData.length > 0 && (
  <Card className="p-4 space-y-3">
    <h2 className="font-semibold">UTM / Criativos</h2>
    <UTMAnalysis
      salesData={editionSalesData}
      funnelOfferCodes={funnelOfferCodes}
      metaInsights={editionMetaInsights}
      metaCampaigns={campaigns}
      metaAdsets={adsets}
      metaAds={ads}
    />
  </Card>
)}
```

- [ ] **Step 4: MetaHierarchyAnalysis render**

```tsx
import { MetaHierarchyAnalysis } from "@/components/meta/MetaHierarchyAnalysis";

{editionMetaInsights.length > 0 && (
  <Card className="p-4 space-y-3">
    <h2 className="font-semibold">Meta Ads — Campanhas</h2>
    <MetaHierarchyAnalysis
      insights={editionMetaInsights}
      campaigns={campaigns}
      adsets={adsets}
      ads={ads}
      loading={metaHierarchyLoading}
    />
  </Card>
)}
```

- [ ] **Step 5: Build**

---

### Task 5: Atualizar debug_log.md e TASKS.md, commitar

- [ ] **Step 1: Atualizar debug_log.md**
- [ ] **Step 2: Atualizar TASKS.md**
- [ ] **Step 3: Commit**
