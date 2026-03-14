# Provider CSV Import — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o fluxo completo de importação histórica de CSV da Hotmart (e futuros providers), criando orders + order_items + ledger_events + crm_contacts com segurança total contra duplicatas.

**Architecture:** Parse do CSV acontece no browser (TypeScript puro, sem timeout). Os grupos normalizados são enviados em lotes de 200 para a Edge Function `provider-csv-import`, que escreve no banco em sequência usando módulos core reutilizáveis por qualquer provider futuro.

**Tech Stack:** Deno (Edge Functions), React 18 + TypeScript strict, Supabase JS client, shadcn-ui, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-14-provider-csv-import-design.md`

---

## Chunk 1: Tipos Compartilhados + Parser Hotmart (Browser)

### Task 1: Tipos centrais compartilhados

**Files:**
- Create: `src/types/csv-import.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

```typescript
// src/types/csv-import.ts

export interface NormalizedOrderItem {
  own_transaction_id: string;
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: 'main' | 'bump' | 'upsell' | 'downsell' | 'subscription_renewal';
  base_price: number;
  quantity: number;
  producer_net_brl: number;
  platform_fee_brl: number;
  affiliate_brl: number;
  coproducer_brl: number;
  conversion_rate: number;
  is_debit: boolean;
}

export interface NormalizedOrderGroup {
  provider_order_id: string;
  own_transaction_id: string;
  status: 'approved' | 'completed' | 'cancelled' | 'refunded' | 'pending' | 'skip';
  ordered_at: string;
  approved_at: string | null;
  currency: string;
  customer_paid: number;
  raw_sck: string | null;
  payment_method: string | null;
  payment_type: string | null;
  installments: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  buyer_instagram: string | null;
  buyer_country: string | null;
  items: NormalizedOrderItem[];
}

export interface ImportResult {
  created: number;
  complemented: number;
  skipped: number;
  contacts_created: number;
  contacts_updated: number;
  no_email: number;
  errors: string[];
  total_revenue_brl: number;
  period_start: string | null;
  period_end: string | null;
}

export interface CSVPreview {
  groups: NormalizedOrderGroup[];
  total_groups: number;
  total_items: number;
  total_revenue_brl: number;
  period_start: string | null;
  period_end: string | null;
  errors: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/csv-import.ts
git commit -m "feat: add shared CSV import types"
```

---

### Task 2: HotmartCSVParser — parse, normalização e agrupamento

**Files:**
- Create: `src/lib/csv-parsers/hotmart.ts`

O parser roda 100% no browser. Recebe o texto bruto do CSV e retorna `CSVPreview`.

- [ ] **Step 1: Criar o parser**

```typescript
// src/lib/csv-parsers/hotmart.ts

import type { NormalizedOrderGroup, NormalizedOrderItem, CSVPreview } from '@/types/csv-import';

// Colunas obrigatórias para detecção automática do formato
const REQUIRED_HEADERS = [
  'Código da transação',
  'Status da transação',
  'Faturamento líquido do(a) Produtor(a)',
  'Transação do Produto Principal',
  'Venda feita como',
];

// ─────────────────────────────────────────────
// Normalização de tipos primitivos
// ─────────────────────────────────────────────

/** Converte número no formato BR (1.234,56) para float */
function parseBrNumber(raw: string | undefined): number {
  if (!raw || raw.trim() === '' || raw.trim() === '(none)') return 0;
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

/** Converte data no formato DD/MM/YYYY HH:MM:SS para ISO 8601 */
function parseBrDate(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '' || raw.trim() === '(none)') return null;
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.000Z`;
}

/** Normaliza string, tratando "(none)" como null */
function parseStr(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '' || raw.trim() === '(none)') return null;
  return raw.trim();
}

// ─────────────────────────────────────────────
// Mapeamento de status
// ─────────────────────────────────────────────

function parseStatus(
  raw: string | undefined,
): NormalizedOrderGroup['status'] {
  switch ((raw || '').trim().toLowerCase()) {
    case 'aprovado': return 'approved';
    case 'completo': return 'completed';
    case 'cancelado': return 'cancelled';
    case 'reembolsado': return 'refunded';
    case 'aguardando pagamento': return 'pending';
    default: return 'skip'; // Expirado, Recusado, etc.
  }
}

// ─────────────────────────────────────────────
// Mapeamento de item_type
// ─────────────────────────────────────────────

function parseItemType(
  vendaFeita: string | undefined,
  tipoCobranca: string | undefined,
): NormalizedOrderItem['item_type'] {
  const venda = (vendaFeita || '').trim().toLowerCase();
  const cobranca = (tipoCobranca || '').trim().toLowerCase();

  if (venda.includes('order bump')) return 'bump';
  if (venda.includes('upgrade')) return 'upsell';
  if (venda.includes('downgrade')) return 'downsell';

  // Produto principal: verificar se é renovação de assinatura
  if (cobranca.match(/^[2-9]a? cobran/i) || cobranca.match(/^1[0-9]a? cobran/i)) {
    return 'subscription_renewal';
  }

  return 'main';
}

// ─────────────────────────────────────────────
// Determinação do provider_order_id
// ─────────────────────────────────────────────

function resolveProviderOrderId(
  own: string,
  parentTx: string | null,
  itemType: NormalizedOrderItem['item_type'],
): string {
  // Renovações NUNCA são agrupadas sob o pedido original
  if (itemType === 'subscription_renewal') return own;
  // Bumps/upsells/downsells usam o pai
  if (parentTx && parentTx !== '(none)' && parentTx !== own) return parentTx;
  return own;
}

// ─────────────────────────────────────────────
// Parse de uma linha bruta
// ─────────────────────────────────────────────

interface RawRow {
  own_transaction_id: string;
  parent_transaction_id: string | null;
  status: NormalizedOrderGroup['status'];
  ordered_at: string | null;
  approved_at: string | null;
  currency: string;
  customer_paid: number;
  base_price: number;
  raw_sck: string | null;
  payment_method: string | null;
  payment_type: string | null;
  installments: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  buyer_instagram: string | null;
  buyer_country: string | null;
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: NormalizedOrderItem['item_type'];
  producer_net_brl: number;
  platform_fee_brl: number;
  affiliate_brl: number;
  coproducer_brl: number;
  conversion_rate: number;
}

function parseRawRow(cols: Record<string, string>): RawRow | null {
  const own = parseStr(cols['Código da transação']);
  if (!own) return null;

  const vendaFeita = parseStr(cols['Venda feita como']);
  const tipoCobranca = parseStr(cols['Tipo de cobrança']);
  const itemType = parseItemType(vendaFeita ?? undefined, tipoCobranca ?? undefined);

  const parentRaw = parseStr(cols['Transação do Produto Principal']);
  const parentTx = parentRaw === own ? null : parentRaw;

  const status = parseStatus(cols['Status da transação']);

  return {
    own_transaction_id: own,
    parent_transaction_id: parentTx,
    status,
    ordered_at: parseBrDate(cols['Data da transação']),
    approved_at: parseBrDate(cols['Confirmação do pagamento']),
    currency: parseStr(cols['Moeda de compra']) ?? 'BRL',
    customer_paid: parseBrNumber(cols['Valor de compra com impostos']),
    base_price: parseBrNumber(cols['Valor de compra sem impostos']),
    raw_sck: parseStr(cols['Código SCK']),
    payment_method: parseStr(cols['Método de pagamento']),
    payment_type: parseStr(cols['Tipo de cobrança']),
    installments: Math.max(1, Math.round(parseBrNumber(cols['Quantidade total de parcelas']))),
    buyer_name: parseStr(cols['Comprador(a)']),
    buyer_email: parseStr(cols['Email do(a) Comprador(a)'])?.toLowerCase() ?? null,
    buyer_phone: parseStr(cols['Telefone']),
    buyer_document: parseStr(cols['Documento']),
    buyer_instagram: parseStr(cols['Instagram']),
    buyer_country: parseStr(cols['País']),
    provider_product_id: parseStr(cols['Código do produto']) ?? own,
    provider_offer_id: parseStr(cols['Código do preço']),
    product_name: parseStr(cols['Produto']) ?? 'Produto sem nome',
    offer_name: parseStr(cols['Nome deste preço']),
    item_type: itemType,
    producer_net_brl: parseBrNumber(cols['Faturamento líquido do(a) Produtor(a)']),
    platform_fee_brl: parseBrNumber(cols['Taxa de processamento']),
    affiliate_brl: parseBrNumber(cols['Comissão do(a) Afiliado(a)']),
    coproducer_brl: parseBrNumber(cols['Faturamento do(a) Coprodutor(a)']),
    conversion_rate: parseBrNumber(cols['Taxa de conversão (moeda de recebimento)']) || 1,
  };
}

// ─────────────────────────────────────────────
// Agrupamento de linhas em NormalizedOrderGroup[]
// ─────────────────────────────────────────────

function groupRawRows(rows: RawRow[]): { groups: NormalizedOrderGroup[]; errors: string[] } {
  const groups = new Map<string, NormalizedOrderGroup>();
  const errors: string[] = [];

  for (const row of rows) {
    if (row.status === 'skip') continue;

    const providerOrderId = resolveProviderOrderId(
      row.own_transaction_id,
      row.parent_transaction_id,
      row.item_type,
    );

    const isDebit = row.status === 'cancelled' || row.status === 'refunded';

    const item: NormalizedOrderItem = {
      own_transaction_id: row.own_transaction_id,
      provider_product_id: row.provider_product_id,
      provider_offer_id: row.provider_offer_id,
      product_name: row.product_name,
      offer_name: row.offer_name,
      item_type: row.item_type,
      base_price: row.base_price,
      quantity: 1,
      producer_net_brl: row.producer_net_brl,
      platform_fee_brl: row.platform_fee_brl,
      affiliate_brl: row.affiliate_brl,
      coproducer_brl: row.coproducer_brl,
      conversion_rate: row.conversion_rate,
      is_debit: isDebit,
    };

    if (groups.has(providerOrderId)) {
      const existing = groups.get(providerOrderId)!;

      // Verificar moeda consistente no grupo
      if (existing.currency !== row.currency) {
        errors.push(
          `Grupo ${providerOrderId}: moedas inconsistentes (${existing.currency} vs ${row.currency}). Grupo ignorado.`,
        );
        groups.delete(providerOrderId);
        continue;
      }

      existing.customer_paid += row.customer_paid;
      existing.items.push(item);
    } else {
      groups.set(providerOrderId, {
        provider_order_id: providerOrderId,
        own_transaction_id: row.own_transaction_id,
        status: row.status,
        ordered_at: row.ordered_at ?? new Date().toISOString(),
        approved_at: row.approved_at,
        currency: row.currency,
        customer_paid: row.customer_paid,
        raw_sck: row.raw_sck,
        payment_method: row.payment_method,
        payment_type: row.payment_type,
        installments: row.installments,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
        buyer_phone: row.buyer_phone,
        buyer_document: row.buyer_document,
        buyer_instagram: row.buyer_instagram,
        buyer_country: row.buyer_country,
        items: [item],
      });
    }
  }

  return { groups: Array.from(groups.values()), errors };
}

// ─────────────────────────────────────────────
// Entrada pública
// ─────────────────────────────────────────────

/** Detecta se o CSV é do formato Hotmart Modelo Detalhado */
export function detectHotmartCSV(headers: string[]): boolean {
  return REQUIRED_HEADERS.every((h) => headers.includes(h));
}

/** Parse completo de um CSV Hotmart. Retorna CSVPreview. */
export function parseHotmartCSV(rawText: string): CSVPreview {
  const lines = rawText.replace(/^\uFEFF/, '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { groups: [], total_groups: 0, total_items: 0, total_revenue_brl: 0, period_start: null, period_end: null, errors: ['Arquivo vazio ou sem dados.'] };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

  if (!detectHotmartCSV(headers)) {
    return { groups: [], total_groups: 0, total_items: 0, total_revenue_brl: 0, period_start: null, period_end: null, errors: ['Formato não reconhecido. Use o Modelo Detalhado de Vendas da Hotmart.'] };
  }

  const parseErrors: string[] = [];
  const rawRows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
    const cols: Record<string, string> = {};
    headers.forEach((h, idx) => { cols[h] = values[idx] ?? ''; });

    const row = parseRawRow(cols);
    if (!row) {
      parseErrors.push(`Linha ${i + 1}: Código da transação ausente, linha ignorada.`);
      continue;
    }
    rawRows.push(row);
  }

  const { groups, errors: groupErrors } = groupRawRows(rawRows);
  const allErrors = [...parseErrors, ...groupErrors];

  // Calcular totais e período
  let totalRevenue = 0;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let totalItems = 0;

  for (const g of groups) {
    if (g.status === 'approved' || g.status === 'completed') {
      totalRevenue += g.items.reduce((s, it) => s + it.producer_net_brl, 0);
    }
    totalItems += g.items.length;
    if (g.ordered_at) {
      if (!periodStart || g.ordered_at < periodStart) periodStart = g.ordered_at;
      if (!periodEnd || g.ordered_at > periodEnd) periodEnd = g.ordered_at;
    }
  }

  return {
    groups,
    total_groups: groups.length,
    total_items: totalItems,
    total_revenue_brl: totalRevenue,
    period_start: periodStart,
    period_end: periodEnd,
    errors: allErrors,
  };
}
```

- [ ] **Step 2: Testar o parser manualmente no browser**

Abrir o console do browser com `npm run dev`, importar o arquivo e rodar:
```javascript
// Cole o conteúdo do CSV numa variável e chame parseHotmartCSV(texto)
// Verificar que HP2107270089C2 (bump) aparece agrupado sob HP2107270089C1
// Verificar que total_groups < total_linhas_csv (bumps agrupados)
```

- [ ] **Step 3: Commit**

```bash
git add src/types/csv-import.ts src/lib/csv-parsers/hotmart.ts
git commit -m "feat: add Hotmart CSV parser with grouping and normalization"
```

---

## Chunk 2: Edge Function — Módulos Core

### Task 3: dedup-checker — verificação de estado do order

**Files:**
- Create: `supabase/functions/provider-csv-import/core/dedup-checker.ts`

- [ ] **Step 1: Criar o módulo**

```typescript
// supabase/functions/provider-csv-import/core/dedup-checker.ts

export type OrderState =
  | 'not_found'            // Order não existe → criar tudo
  | 'exists_no_ledger'     // Order existe, sem ledger → complementar com CSV
  | 'exists_webhook_ledger' // Order existe, ledger de webhook → SKIP financeiro
  | 'exists_csv_ledger';   // Order existe, ledger de CSV → SKIP (idempotente)

export async function checkOrderState(
  supabase: any,
  projectId: string,
  providerOrderId: string,
): Promise<{ state: OrderState; orderId: string | null }> {
  // 1. Verificar se o order existe
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle();

  if (!order) return { state: 'not_found', orderId: null };

  // 2. Verificar se tem ledger de webhook
  const { data: webhookLedger } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('order_id', order.id)
    .eq('source_origin', 'webhook')
    .limit(1)
    .maybeSingle();

  if (webhookLedger) return { state: 'exists_webhook_ledger', orderId: order.id };

  // 3. Verificar se tem ledger de CSV
  const { data: csvLedger } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('order_id', order.id)
    .eq('source_origin', 'csv')
    .limit(1)
    .maybeSingle();

  if (csvLedger) return { state: 'exists_csv_ledger', orderId: order.id };

  return { state: 'exists_no_ledger', orderId: order.id };
}

/** Verifica se um ledger_event já existe por provider_event_id (sem constraint no banco) */
export async function ledgerEventExists(
  supabase: any,
  providerEventId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('provider_event_id', providerEventId)
    .maybeSingle();
  return !!data;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/provider-csv-import/core/dedup-checker.ts
git commit -m "feat: add dedup-checker for CSV import"
```

---

### Task 4: contact-writer — criar/complementar contato no CRM

**Files:**
- Create: `supabase/functions/provider-csv-import/core/contact-writer.ts`

- [ ] **Step 1: Criar o módulo**

```typescript
// supabase/functions/provider-csv-import/core/contact-writer.ts

import type { NormalizedOrderGroup } from '../types.ts';

export interface ContactWriteResult {
  contact_id: string | null;
  action: 'created' | 'updated' | 'found' | 'skipped_no_email';
}

export async function writeContact(
  supabase: any,
  projectId: string,
  group: NormalizedOrderGroup,
): Promise<ContactWriteResult> {
  const email = group.buyer_email;

  // Sem email: importar pedido sem vínculo CRM (nunca descartar)
  if (!email) {
    return { contact_id: null, action: 'skipped_no_email' };
  }

  // Buscar contato existente por email
  const { data: existing } = await supabase
    .from('crm_contacts')
    .select('id, name, phone, document, instagram, country')
    .eq('project_id', projectId)
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Complementar apenas campos NULL (nunca sobrescrever)
    const updates: Record<string, string> = {};
    if (!existing.name && group.buyer_name) updates.name = group.buyer_name;
    if (!existing.phone && group.buyer_phone) updates.phone = group.buyer_phone;
    if (!existing.document && group.buyer_document) updates.document = group.buyer_document;
    if (!existing.instagram && group.buyer_instagram) updates.instagram = group.buyer_instagram;
    if (!existing.country && group.buyer_country) updates.country = group.buyer_country;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('crm_contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { contact_id: existing.id, action: 'updated' };
    }

    return { contact_id: existing.id, action: 'found' };
  }

  // Criar novo contato
  const { data: newContact, error } = await supabase
    .from('crm_contacts')
    .insert({
      project_id: projectId,
      email,
      name: group.buyer_name,
      phone: group.buyer_phone,
      document: group.buyer_document,
      instagram: group.buyer_instagram,
      country: group.buyer_country,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ContactWriter] Error creating contact:', error.message);
    return { contact_id: null, action: 'skipped_no_email' };
  }

  return { contact_id: newContact.id, action: 'created' };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/provider-csv-import/core/contact-writer.ts
git commit -m "feat: add contact-writer for CSV import"
```

---

### Task 5: order-writer — criar order + order_items

**Files:**
- Create: `supabase/functions/provider-csv-import/core/order-writer.ts`

A função `parseSCKtoUTMs` existe no webhook. Vamos reimplementar inline de forma simplificada para não criar dependência entre funções.

- [ ] **Step 1: Criar o módulo**

```typescript
// supabase/functions/provider-csv-import/core/order-writer.ts

import type { NormalizedOrderGroup } from '../types.ts';

/** Parse simplificado de SCK para UTMs (mesma lógica do webhook) */
function parseSCKtoUTMs(sck: string | null): Record<string, string | null> {
  if (!sck) return { utm_source: null, utm_campaign: null, utm_adset: null, utm_placement: null, utm_creative: null, meta_campaign_id: null, meta_adset_id: null, meta_ad_id: null };

  const parts = sck.split('|');
  const [utm_source, utm_campaign, , utm_medium, utm_term, utm_content] = parts;

  // Extrair IDs Meta de padrões conhecidos
  const metaCampaignMatch = sck.match(/(\d{15,})/g);
  const [meta_campaign_id = null, meta_adset_id = null, meta_ad_id = null] = metaCampaignMatch ?? [];

  return {
    utm_source: utm_source ?? null,
    utm_campaign: utm_campaign ?? null,
    utm_adset: utm_medium ?? null,
    utm_placement: utm_term ?? null,
    utm_creative: utm_content ?? null,
    meta_campaign_id,
    meta_adset_id,
    meta_ad_id,
  };
}

/** Normaliza método de pagamento (mesma lógica do webhook) */
function normalizePaymentMethod(raw: string | null): string {
  switch ((raw ?? '').toUpperCase()) {
    case 'CARTÃO DE CRÉDITO':
    case 'CREDIT_CARD': return 'credit_card';
    case 'PIX': return 'pix';
    case 'BOLETO':
    case 'BILLET': return 'billet';
    default: return 'unknown';
  }
}

export async function writeOrder(
  supabase: any,
  projectId: string,
  group: NormalizedOrderGroup,
  contactId: string | null,
  existingOrderId: string | null,
): Promise<string | null> {
  const utms = parseSCKtoUTMs(group.raw_sck);
  const paymentMethod = normalizePaymentMethod(group.payment_method);

  if (existingOrderId) {
    // Order já existe: complementar contact_id se estava vazio
    if (contactId) {
      await supabase
        .from('orders')
        .update({ contact_id: contactId, updated_at: new Date().toISOString() })
        .eq('id', existingOrderId)
        .is('contact_id', null);
    }
    return existingOrderId;
  }

  // Criar novo order
  const { data, error } = await supabase
    .from('orders')
    .insert({
      project_id: projectId,
      provider: 'hotmart',
      provider_order_id: group.provider_order_id,
      buyer_email: group.buyer_email,
      buyer_name: group.buyer_name,
      contact_id: contactId,
      status: group.status === 'approved' ? 'approved'
        : group.status === 'completed' ? 'completed'
        : group.status === 'cancelled' ? 'cancelled'
        : group.status === 'refunded' ? 'refunded'
        : 'pending',
      currency: group.currency,
      customer_paid: group.customer_paid,
      gross_base: group.customer_paid,
      producer_net: group.items.reduce((s, i) => s + i.producer_net_brl, 0),
      producer_net_brl: group.items.reduce((s, i) => s + i.producer_net_brl, 0),
      ordered_at: group.ordered_at,
      approved_at: group.approved_at,
      raw_sck: group.raw_sck,
      utm_source: utms.utm_source,
      utm_campaign: utms.utm_campaign,
      utm_adset: utms.utm_adset,
      utm_placement: utms.utm_placement,
      utm_creative: utms.utm_creative,
      meta_campaign_id: utms.meta_campaign_id,
      meta_adset_id: utms.meta_adset_id,
      meta_ad_id: utms.meta_ad_id,
      payment_method: paymentMethod,
      payment_type: group.payment_type,
      installments: group.installments,
      ledger_status: group.status === 'pending' ? 'pending' : 'complete',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[OrderWriter] Error inserting order:', error.message);
    return null;
  }

  return data.id;
}

export async function writeOrderItems(
  supabase: any,
  orderId: string,
  projectId: string,
  group: NormalizedOrderGroup,
): Promise<void> {
  const rows = group.items.map((item) => ({
    order_id: orderId,
    project_id: projectId,
    provider_product_id: item.provider_product_id,
    provider_offer_id: item.provider_offer_id,
    product_name: item.product_name,
    offer_name: item.offer_name,
    item_type: item.item_type,
    base_price: item.base_price,
    quantity: item.quantity,
    metadata: { source: 'csv', own_transaction_id: item.own_transaction_id },
  }));

  const { error } = await supabase
    .from('order_items')
    .upsert(rows, {
      onConflict: 'order_id,provider_product_id,provider_offer_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[OrderWriter] Error upserting order_items:', error.message);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/provider-csv-import/core/order-writer.ts
git commit -m "feat: add order-writer for CSV import"
```

---

### Task 6: ledger-writer — criar ledger_events com deduplicação manual

**Files:**
- Create: `supabase/functions/provider-csv-import/core/ledger-writer.ts`

- [ ] **Step 1: Criar o módulo**

```typescript
// supabase/functions/provider-csv-import/core/ledger-writer.ts

import type { NormalizedOrderGroup, NormalizedOrderItem } from '../types.ts';
import { ledgerEventExists } from './dedup-checker.ts';

interface LedgerEventRow {
  order_id: string;
  project_id: string;
  provider: string;
  event_type: string;
  actor: string;
  actor_name: string;
  amount: number;
  amount_brl: number;
  amount_accounting: number;
  currency_accounting: string;
  conversion_rate: number;
  source_type: string;
  currency: string;
  provider_event_id: string;
  occurred_at: string;
  source_origin: string;
  confidence_level: string;
  raw_payload: Record<string, unknown>;
}

async function insertIfNotExists(
  supabase: any,
  event: LedgerEventRow,
): Promise<boolean> {
  const exists = await ledgerEventExists(supabase, event.provider_event_id);
  if (exists) return false;

  const { error } = await supabase.from('ledger_events').insert(event);
  if (error) {
    console.error('[LedgerWriter] Error inserting event:', event.provider_event_id, error.message);
    return false;
  }
  return true;
}

function buildCreditEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
): LedgerEventRow[] {
  const base = {
    order_id: orderId,
    project_id: projectId,
    provider: 'hotmart',
    currency: 'BRL',
    source_type: 'native_brl',
    source_origin: 'csv',
    confidence_level: 'accounting',
    occurred_at: occurredAt,
    raw_payload: { csv_transaction_id: item.own_transaction_id },
    amount_accounting: 0,
    currency_accounting: 'BRL',
    conversion_rate: item.conversion_rate,
  };

  const events: LedgerEventRow[] = [];
  const tx = item.own_transaction_id;

  // Sale (producer)
  events.push({
    ...base,
    event_type: 'sale',
    actor: 'PRODUCER',
    actor_name: 'producer',
    amount: item.producer_net_brl,
    amount_brl: item.producer_net_brl,
    amount_accounting: item.producer_net_brl,
    provider_event_id: `csv_sale_${tx}`,
  });

  // Platform fee
  if (item.platform_fee_brl > 0) {
    events.push({
      ...base,
      event_type: 'platform_fee',
      actor: 'MARKETPLACE',
      actor_name: 'hotmart',
      amount: item.platform_fee_brl,
      amount_brl: item.platform_fee_brl,
      amount_accounting: item.platform_fee_brl,
      provider_event_id: `csv_platform_fee_${tx}`,
    });
  }

  // Affiliate
  if (item.affiliate_brl > 0) {
    events.push({
      ...base,
      event_type: 'affiliate',
      actor: 'AFFILIATE',
      actor_name: 'affiliate',
      amount: item.affiliate_brl,
      amount_brl: item.affiliate_brl,
      amount_accounting: item.affiliate_brl,
      provider_event_id: `csv_affiliate_${tx}`,
    });
  }

  // Coproducer
  if (item.coproducer_brl > 0) {
    events.push({
      ...base,
      event_type: 'coproducer',
      actor: 'CO_PRODUCER',
      actor_name: 'coproducer',
      amount: item.coproducer_brl,
      amount_brl: item.coproducer_brl,
      amount_accounting: item.coproducer_brl,
      provider_event_id: `csv_coproducer_${tx}`,
    });
  }

  return events;
}

function buildDebitEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
): LedgerEventRow[] {
  const creditEvents = buildCreditEvents(orderId, projectId, item, occurredAt);

  return creditEvents.map((e) => ({
    ...e,
    amount: -Math.abs(e.amount),
    amount_brl: -Math.abs(e.amount_brl),
    amount_accounting: -Math.abs(e.amount_accounting),
    event_type: e.event_type === 'sale' ? 'refund' : e.event_type,
    provider_event_id: e.provider_event_id.replace('csv_sale_', 'csv_refund_').replace(/^(csv_)(?!refund_)(.+?)(_)/, '$1$2_refund_$3').replace(`csv_platform_fee_${item.own_transaction_id}`, `csv_platform_fee_refund_${item.own_transaction_id}`).replace(`csv_affiliate_${item.own_transaction_id}`, `csv_affiliate_refund_${item.own_transaction_id}`).replace(`csv_coproducer_${item.own_transaction_id}`, `csv_coproducer_refund_${item.own_transaction_id}`),
  }));
}

export async function writeLedgerEvents(
  supabase: any,
  orderId: string,
  projectId: string,
  group: NormalizedOrderGroup,
): Promise<number> {
  // Somente status financeiramente efetivos geram ledger
  if (group.status === 'pending' || group.status === 'skip') return 0;

  let created = 0;
  const occurredAt = group.approved_at ?? group.ordered_at;

  for (const item of group.items) {
    // Crédito sempre (venda original)
    const creditEvents = buildCreditEvents(orderId, projectId, item, occurredAt);
    for (const event of creditEvents) {
      const inserted = await insertIfNotExists(supabase, event);
      if (inserted) created++;
    }

    // Débito apenas para cancelados/reembolsados
    if (item.is_debit) {
      const debitEvents = buildDebitEvents(orderId, projectId, item, occurredAt);
      for (const event of debitEvents) {
        const inserted = await insertIfNotExists(supabase, event);
        if (inserted) created++;
      }
    }
  }

  return created;
}
```

- [ ] **Step 2: Simplificar IDs de débito (reescrever a parte confusa)**

Os IDs de débito devem ser construídos diretamente, não via replace encadeado. Substituir o método `buildDebitEvents` por:

```typescript
function buildDebitEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
): LedgerEventRow[] {
  const tx = item.own_transaction_id;
  const base = {
    order_id: orderId,
    project_id: projectId,
    provider: 'hotmart',
    currency: 'BRL',
    source_type: 'native_brl',
    source_origin: 'csv',
    confidence_level: 'accounting',
    occurred_at: occurredAt,
    raw_payload: { csv_transaction_id: tx },
    currency_accounting: 'BRL',
    conversion_rate: item.conversion_rate,
  };

  const events: LedgerEventRow[] = [];

  events.push({
    ...base,
    event_type: 'refund',
    actor: 'PRODUCER',
    actor_name: 'producer',
    amount: -Math.abs(item.producer_net_brl),
    amount_brl: -Math.abs(item.producer_net_brl),
    amount_accounting: -Math.abs(item.producer_net_brl),
    provider_event_id: `csv_refund_${tx}`,
  });

  if (item.platform_fee_brl > 0) {
    events.push({
      ...base,
      event_type: 'platform_fee',
      actor: 'MARKETPLACE',
      actor_name: 'hotmart',
      amount: -Math.abs(item.platform_fee_brl),
      amount_brl: -Math.abs(item.platform_fee_brl),
      amount_accounting: -Math.abs(item.platform_fee_brl),
      provider_event_id: `csv_platform_fee_refund_${tx}`,
    });
  }

  if (item.affiliate_brl > 0) {
    events.push({
      ...base,
      event_type: 'affiliate',
      actor: 'AFFILIATE',
      actor_name: 'affiliate',
      amount: -Math.abs(item.affiliate_brl),
      amount_brl: -Math.abs(item.affiliate_brl),
      amount_accounting: -Math.abs(item.affiliate_brl),
      provider_event_id: `csv_affiliate_refund_${tx}`,
    });
  }

  return events;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/provider-csv-import/core/ledger-writer.ts
git commit -m "feat: add ledger-writer with manual dedup for CSV import"
```

---

## Chunk 3: Edge Function — Provider + Router

### Task 7: Tipos compartilhados da edge function + provider Hotmart

**Files:**
- Create: `supabase/functions/provider-csv-import/types.ts`
- Create: `supabase/functions/provider-csv-import/providers/hotmart.ts`

- [ ] **Step 1: Criar types.ts (reutiliza definição do frontend)**

```typescript
// supabase/functions/provider-csv-import/types.ts
// Espelha src/types/csv-import.ts — mantido separado por isolamento Deno

export interface NormalizedOrderItem {
  own_transaction_id: string;
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: 'main' | 'bump' | 'upsell' | 'downsell' | 'subscription_renewal';
  base_price: number;
  quantity: number;
  producer_net_brl: number;
  platform_fee_brl: number;
  affiliate_brl: number;
  coproducer_brl: number;
  conversion_rate: number;
  is_debit: boolean;
}

export interface NormalizedOrderGroup {
  provider_order_id: string;
  own_transaction_id: string;
  status: 'approved' | 'completed' | 'cancelled' | 'refunded' | 'pending' | 'skip';
  ordered_at: string;
  approved_at: string | null;
  currency: string;
  customer_paid: number;
  raw_sck: string | null;
  payment_method: string | null;
  payment_type: string | null;
  installments: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  buyer_instagram: string | null;
  buyer_country: string | null;
  items: NormalizedOrderItem[];
}

export interface ImportResult {
  created: number;
  complemented: number;
  skipped: number;
  contacts_created: number;
  contacts_updated: number;
  no_email: number;
  errors: string[];
  total_revenue_brl: number;
}
```

- [ ] **Step 2: Criar providers/hotmart.ts (validação de segurança server-side)**

```typescript
// supabase/functions/provider-csv-import/providers/hotmart.ts
// Validação server-side dos grupos normalizados vindos do browser

import type { NormalizedOrderGroup } from '../types.ts';

/** Valida e sanitiza um grupo antes de persistir */
export function validateGroup(group: NormalizedOrderGroup): string | null {
  if (!group.provider_order_id) return 'provider_order_id ausente';
  if (!group.status) return 'status ausente';
  if (!group.items || group.items.length === 0) return 'items vazio';
  if (group.customer_paid < 0) return `customer_paid negativo: ${group.customer_paid}`;

  for (const item of group.items) {
    if (!item.provider_product_id) return `item sem provider_product_id`;
    if (!item.item_type) return `item sem item_type`;
  }

  return null; // válido
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/provider-csv-import/types.ts supabase/functions/provider-csv-import/providers/hotmart.ts
git commit -m "feat: add edge function types and Hotmart validator"
```

---

### Task 8: index.ts — roteador principal da edge function

**Files:**
- Create: `supabase/functions/provider-csv-import/index.ts`

- [ ] **Step 1: Criar o roteador**

```typescript
// supabase/functions/provider-csv-import/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { NormalizedOrderGroup, ImportResult } from './types.ts';
import { validateGroup } from './providers/hotmart.ts';
import { checkOrderState } from './core/dedup-checker.ts';
import { writeContact } from './core/contact-writer.ts';
import { writeOrder, writeOrderItems } from './core/order-writer.ts';
import { writeLedgerEvents } from './core/ledger-writer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  provider: string;
  project_id: string;
  groups: NormalizedOrderGroup[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { provider, project_id, groups }: RequestBody = await req.json();

    if (!project_id || !groups || !Array.isArray(groups)) {
      return new Response(JSON.stringify({ error: 'project_id e groups são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Por ora, só Hotmart. Futuro: routing por provider
    if (provider !== 'hotmart') {
      return new Response(JSON.stringify({ error: `Provider '${provider}' não suportado ainda` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: ImportResult = {
      created: 0,
      complemented: 0,
      skipped: 0,
      contacts_created: 0,
      contacts_updated: 0,
      no_email: 0,
      errors: [],
      total_revenue_brl: 0,
    };

    for (const group of groups) {
      // Validação server-side
      const validationError = validateGroup(group);
      if (validationError) {
        result.errors.push(`${group.provider_order_id}: ${validationError}`);
        continue;
      }

      try {
        // 1. Contato
        const contactResult = await writeContact(supabase, project_id, group);
        if (contactResult.action === 'created') result.contacts_created++;
        else if (contactResult.action === 'updated') result.contacts_updated++;
        else if (contactResult.action === 'skipped_no_email') result.no_email++;

        // 2. Verificar estado do order
        const { state, orderId: existingId } = await checkOrderState(
          supabase,
          project_id,
          group.provider_order_id,
        );

        if (state === 'exists_webhook_ledger' || state === 'exists_csv_ledger') {
          result.skipped++;
          continue;
        }

        // 3. Criar/atualizar order
        const orderId = await writeOrder(
          supabase,
          project_id,
          group,
          contactResult.contact_id,
          existingId,
        );

        if (!orderId) {
          result.errors.push(`${group.provider_order_id}: falha ao criar order`);
          continue;
        }

        // 4. Order items
        await writeOrderItems(supabase, orderId, project_id, group);

        // 5. Ledger events
        const eventsCreated = await writeLedgerEvents(supabase, orderId, project_id, group);

        // Contabilizar resultado
        if (state === 'not_found') result.created++;
        else result.complemented++;

        if (group.status === 'approved' || group.status === 'completed') {
          result.total_revenue_brl += group.items.reduce((s, i) => s + i.producer_net_brl, 0);
        }

        console.log(`[CSV Import] ${group.provider_order_id}: ${state} → ${eventsCreated} ledger events`);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${group.provider_order_id}: ${msg}`);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy da edge function**

```bash
supabase functions deploy provider-csv-import
```

Resultado esperado: `Deployed Functions on project mqaygpnfjuyslnxpvipa: provider-csv-import`

- [ ] **Step 3: Smoke test com curl**

```bash
curl -X POST https://mqaygpnfjuyslnxpvipa.supabase.co/functions/v1/provider-csv-import \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"hotmart","project_id":"a59d30c7-1009-4aa2-b106-6826011466e9","groups":[]}'
```

Esperado: `{"created":0,"complemented":0,"skipped":0,...}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/provider-csv-import/
git commit -m "feat: add provider-csv-import edge function"
```

---

## Chunk 4: Componente React

### Task 9: ProviderCSVImport.tsx — interface completa

**Files:**
- Create: `src/components/settings/ProviderCSVImport.tsx`

- [ ] **Step 1: Criar o hook de importação**

```typescript
// src/hooks/useProviderCSVImport.ts

import { useState } from 'react';
import { useSupabaseClient } from '@/hooks/useSupabaseClient'; // padrão existente no projeto
import { parseHotmartCSV } from '@/lib/csv-parsers/hotmart';
import type { CSVPreview, ImportResult, NormalizedOrderGroup } from '@/types/csv-import';

const CHUNK_SIZE = 200;

export function useProviderCSVImport(projectId: string) {
  const supabase = useSupabaseClient();
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseHotmartCSV(text);
      setPreview(parsed);
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setProgress(0);

    const groups = preview.groups;
    const chunks: NormalizedOrderGroup[][] = [];
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
      chunks.push(groups.slice(i, i + CHUNK_SIZE));
    }

    const accumulated: ImportResult = {
      created: 0, complemented: 0, skipped: 0,
      contacts_created: 0, contacts_updated: 0, no_email: 0,
      errors: [], total_revenue_brl: 0,
      period_start: preview.period_start,
      period_end: preview.period_end,
    };

    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase.functions.invoke('provider-csv-import', {
        body: { provider: 'hotmart', project_id: projectId, groups: chunks[i] },
      });

      if (error) {
        accumulated.errors.push(`Lote ${i + 1}: ${error.message}`);
      } else if (data) {
        accumulated.created += data.created ?? 0;
        accumulated.complemented += data.complemented ?? 0;
        accumulated.skipped += data.skipped ?? 0;
        accumulated.contacts_created += data.contacts_created ?? 0;
        accumulated.contacts_updated += data.contacts_updated ?? 0;
        accumulated.no_email += data.no_email ?? 0;
        accumulated.total_revenue_brl += data.total_revenue_brl ?? 0;
        accumulated.errors.push(...(data.errors ?? []));
      }

      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    setResult(accumulated);
    setImporting(false);
  }

  return { preview, importing, progress, result, handleFile, runImport };
}
```

- [ ] **Step 2: Verificar como o projeto chama supabase client nos hooks**

```bash
grep -r "useSupabaseClient\|createClient\|supabase" src/hooks/ --include="*.ts" -l | head -5
```

Ajustar o import do supabase client conforme o padrão encontrado no projeto.

- [ ] **Step 3: Criar o componente**

```tsx
// src/components/settings/ProviderCSVImport.tsx

import { useRef } from 'react';
import { useTenantNavigation } from '@/hooks/useTenantNavigation'; // padrão multi-tenant
import { useProviderCSVImport } from '@/hooks/useProviderCSVImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatMoney } from '@/lib/formatters'; // padrão existente no projeto

interface Props {
  projectId: string;
}

export function ProviderCSVImport({ projectId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { preview, importing, progress, result, handleFile, runImport } =
    useProviderCSVImport(projectId);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Importar Histórico de Vendas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use o <strong>Modelo Detalhado de Vendas</strong> exportado da Hotmart (arquivo .CSV).
          Vendas já existentes via webhook não serão alteradas.
        </p>
      </div>

      {/* Upload */}
      {!result && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Clique para selecionar o CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Modelo Detalhado de Vendas — Hotmart</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </CardContent>
        </Card>
      )}

      {/* Erros de parse */}
      {preview && preview.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="text-xs space-y-1 mt-1">
              {preview.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {preview.errors.length > 5 && <li>...e mais {preview.errors.length - 5} avisos</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && preview.total_groups > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pedidos detectados</p>
                <p className="font-semibold text-lg">{preview.total_groups}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Itens (com bumps)</p>
                <p className="font-semibold text-lg">{preview.total_items}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Receita líquida</p>
                <p className="font-semibold text-lg">{formatMoney(preview.total_revenue_brl, 'BRL')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Período</p>
                <p className="font-semibold text-sm">
                  {preview.period_start ? new Date(preview.period_start).toLocaleDateString('pt-BR') : '—'}
                  {' → '}
                  {preview.period_end ? new Date(preview.period_end).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>

            {importing ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">{progress}% processado</p>
              </div>
            ) : (
              <Button onClick={runImport} className="w-full">
                Importar {preview.total_groups} pedidos
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">✅ {result.created}</Badge>
                <span className="text-muted-foreground">criados do zero</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">🔄 {result.complemented}</Badge>
                <span className="text-muted-foreground">complementados</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">⏭️ {result.skipped}</Badge>
                <span className="text-muted-foreground">ignorados (webhook)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">👤 {result.contacts_created + result.contacts_updated}</Badge>
                <span className="text-muted-foreground">contatos CRM</span>
              </div>
              {result.no_email > 0 && (
                <div className="flex items-center gap-2 col-span-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">⚠️ {result.no_email}</Badge>
                  <span className="text-muted-foreground">sem vínculo CRM (email ausente)</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Receita importada</p>
              <p className="font-semibold text-lg">{formatMoney(result.total_revenue_brl, 'BRL')}</p>
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{result.errors.length} erro(s):</p>
                  <ul className="text-xs space-y-1">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>...e mais {result.errors.length - 10}</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verificar imports do projeto (formatMoney, supabase client)**

```bash
grep -r "formatMoney\|formatCurrency" src/ --include="*.ts" --include="*.tsx" -l | head -3
grep -r "supabase.functions.invoke" src/ --include="*.ts" --include="*.tsx" -l | head -3
```

Ajustar imports conforme encontrado.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProviderCSVImport.ts src/components/settings/ProviderCSVImport.tsx
git commit -m "feat: add ProviderCSVImport component and hook"
```

---

## Chunk 5: Rota + Integração + Smoke Test

### Task 10: Adicionar rota de configurações

**Files:**
- Modify: rota de configurações existente (verificar arquivo)

- [ ] **Step 1: Encontrar onde ficam as rotas de configurações**

```bash
grep -r "configuracoes\|settings\|Config" src/pages/ --include="*.tsx" -l | head -5
grep -r "configuracoes\|settings" src/App.tsx src/router* 2>/dev/null | head -10
```

- [ ] **Step 2: Adicionar rota**

Dentro da área de configurações existente, adicionar:

```tsx
import { ProviderCSVImport } from '@/components/settings/ProviderCSVImport';

// Na rota de configurações:
<Route path="importar-historico" element={
  <ProviderCSVImport projectId={currentProjectId} />
} />
```

- [ ] **Step 3: Adicionar link no menu de configurações (se existir sidebar)**

```bash
grep -r "Configurações\|settings.*menu\|sidebar" src/components/ --include="*.tsx" -l | head -3
```

Adicionar item "Importar Histórico" no menu de configurações.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add importar-historico route to settings"
```

---

### Task 11: Smoke test completo com CSV real

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 2: Navegar para a rota de importação**

```
http://localhost:8080/app/<projectCode>/configuracoes/importar-historico
```

- [ ] **Step 3: Upload do CSV de teste**

Usar o arquivo: `D:/00- LASTORI CONSULTORIAS/00- CLIENTES/02- CAMILA LEAL/sales_history_20260314002709_35BE18E510540646607594114933.csv`

Verificar no preview:
- Total de grupos < total de linhas (bumps agrupados)
- HP2107270089C1 aparece como grupo com 2 itens
- HP3084317757 (bump) agrupado sob HP3092397484

- [ ] **Step 4: Importar e verificar no banco**

```sql
-- Verificar orders criados
SELECT provider_order_id, status, customer_paid, ledger_status
FROM orders
WHERE project_id = 'a59d30c7-1009-4aa2-b106-6826011466e9'
  AND source_origin = 'csv'  -- se existir coluna
ORDER BY created_at DESC
LIMIT 20;

-- Verificar ledger_events criados
SELECT provider_event_id, event_type, amount_brl, source_origin
FROM ledger_events
WHERE source_origin = 'csv'
  AND project_id = 'a59d30c7-1009-4aa2-b106-6826011466e9'
ORDER BY created_at DESC
LIMIT 20;
```

- [ ] **Step 5: Rodar o CSV uma segunda vez (teste de idempotência)**

Re-fazer upload e importar o mesmo arquivo.
Resultado esperado: todos os pedidos aparecem como `⏭️ ignorados` — zero criados/complementados.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: complete provider-csv-import flow — Hotmart historical import"
```

---

## Notas de implementação

### Padrões do projeto a seguir
- Imports com `@/` (path alias configurado no vite)
- Componentes usam shadcn-ui (`Button`, `Card`, `Badge`, `Alert`, `Progress`)
- Edge functions seguem padrão do `csv-ledger-v21-import`: `createClient` do supabase-js@2.39.3, `corsHeaders` padrão, `Deno.serve`
- Nunca usar `navigate('/rota')` absoluto — sempre `useTenantNavigation()`
- Strict TypeScript: sem `any` onde possível (exceto `supabase` client que não tem tipagem completa)

### Arquivos existentes a NÃO modificar
- `supabase/functions/hotmart-webhook/index.ts` — não tocar
- `supabase/functions/csv-ledger-v21-import/` — manter como está
- `src/components/settings/HotmartCSVImport.tsx` — manter (escopo diferente)

### Verificações de segurança obrigatórias antes de cada deploy
1. `npm run lint` — zero erros TypeScript
2. Smoke test com CSV vazio → sem erros
3. Smoke test com CSV real → preview correto
4. Idempotência: segunda importação = tudo ignorado
