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

/** Converte número financeiro para float.
 * Detecta o formato automaticamente:
 * - Com vírgula → formato BR (1.234,56): remove pontos, troca vírgula por ponto
 * - Sem vírgula → formato US/decimal (29.90): parseFloat direto
 */
function parseBrNumber(raw: string | undefined): number {
  if (!raw || raw.trim() === '' || raw.trim() === '(none)') return 0;
  const s = raw.trim();
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(s) || 0;
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
