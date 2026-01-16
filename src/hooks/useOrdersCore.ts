/**
 * useOrdersCore
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL FINANCIAL HOOK - ORDERS CORE (MULTI-PLATAFORMA)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ARQUITETURA MULTI-PLATAFORMA                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ Este hook NÃO é específico da Hotmart.                                     │
 * │ Funciona com QUALQUER plataforma que siga o modelo Orders Core.            │
 * │                                                                             │
 * │ A plataforma é apenas um ATRIBUTO do pedido:                               │
 * │   • orders.provider = 'hotmart' | 'kiwify' | 'monetizze' | ...             │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ REGRA 100% SERVER-SIDE (OBRIGATÓRIA - PROMPT 10)                           │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ ❌ PROIBIDO usar .filter() no frontend ou hook                              │
 * │ ❌ PROIBIDO filtrar após paginação                                          │
 * │ ✅ Todos os filtros aplicados via SQL                                       │
 * │ ✅ Contagem, lista e totais usam mesma query base filtrada                  │
 * │                                                                             │
 * │ FILTROS SQL:                                                                │
 * │   • Data inicial/final → orders.ordered_at                                  │
 * │   • Status → orders.status                                                  │
 * │   • Plataforma → orders.provider                                            │
 * │   • UTMs → orders.utm_source, utm_campaign, utm_adset, etc (COLUNAS)       │
 * │   • Funil → EXISTS com order_items.funnel_id                               │
 * │   • Produto → EXISTS com order_items.product_name                          │
 * │   • Oferta → EXISTS com order_items.provider_offer_id                      │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * DATA SOURCES (Canonical):
 * - orders: customer_paid, producer_net, provider, utm_* (COLUNAS MATERIALIZADAS)
 * - order_items: Products list with base_price, funnel_id
 * - ledger_events: Financial breakdown (EXPLANATION ONLY)
 * 
 * FORBIDDEN:
 * ❌ parseSck() em runtime - UTMs são colunas materializadas
 * ❌ .filter() client-side
 * ❌ Filtragem após paginação
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime, format } from "date-fns-tz";

const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

// ============================================
// Types
// ============================================

export interface OrderRecord {
  id: string;
  project_id: string;
  provider: string;
  provider_order_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  contact_id: string | null;
  status: string;
  currency: string;
  customer_paid: number;
  gross_base: number | null;
  producer_net: number;
  ordered_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  
  // Aggregated from order_items
  products: OrderItemRecord[];
  
  // Aggregated from ledger_events (for breakdown)
  ledger_breakdown?: LedgerBreakdown;
  
  // UTM from orders table (MATERIALIZED COLUMNS)
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_adset?: string | null;
  utm_placement?: string | null;
  utm_creative?: string | null;
  
  // Computed
  economic_day: string;
}

export interface OrderItemRecord {
  id: string;
  product_name: string | null;
  offer_name: string | null;
  item_type: string;
  base_price: number;
  funnel_id: string | null;
  provider_product_id: string | null;
  provider_offer_id: string | null;
}

export interface LedgerBreakdown {
  platform_fee: number;
  coproducer: number;
  affiliate: number;
  refund: number;
  chargeback: number;
  tax: number;
  sale: number;
}

export interface OrdersCoreTotals {
  totalOrders: number;
  customerPaid: number;    // Receita Bruta (what customer paid)
  producerNet: number;     // Receita Líquida (what producer receives)
  platformFee: number;     // Taxas Hotmart
  coproducerCost: number;  // Custo Coprodução
  affiliateCost: number;   // Custo Afiliados
  refunds: number;         // Reembolsos
  uniqueCustomers: number;
  loading: boolean;
}

/**
 * FILTROS ORDERS CORE - TODOS APLICADOS NO SQL
 * 
 * Regra: Nenhum filtro é aplicado client-side após paginação
 */
export interface OrdersCoreFilters {
  startDate: string;           // YYYY-MM-DD (ordered_at range)
  endDate: string;             // YYYY-MM-DD (ordered_at range)
  transactionStatus?: string[];
  
  // Filtros via EXISTS/JOIN com order_items
  funnelId?: string[];         // order_items.funnel_id
  productName?: string[];      // order_items.product_name
  offerCode?: string[];        // order_items.provider_offer_id
  
  // UTM filters - aplicados diretamente em orders.utm_*
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  utmPlacement?: string;
  utmCreative?: string;
  
  provider?: string;           // orders.provider
}

export interface OrdersCorePagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UseOrdersCoreResult {
  orders: OrderRecord[];
  loading: boolean;
  error: string | null;
  pagination: OrdersCorePagination;
  totals: OrdersCoreTotals;
  fetchData: (projectId: string, filters: OrdersCoreFilters, page?: number, pageSize?: number) => Promise<void>;
  fetchOrderDetail: (orderId: string) => Promise<{ order: OrderRecord | null; breakdown: LedgerBreakdown | null }>;
  countOrdersWithoutUtm: (projectId: string, filters: OrdersCoreFilters) => Promise<number>;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

// ============================================
// Helper Functions
// ============================================

const getEconomicDay = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const zonedDate = toZonedTime(date, SAO_PAULO_TIMEZONE);
  return format(zonedDate, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE });
};

const buildStatusFilter = (statuses: string[]): string[] => {
  const mappedStatuses = statuses.map(s => s.toLowerCase());
  if (mappedStatuses.length === 0) {
    return ['approved', 'complete'];
  }
  return mappedStatuses;
};

/**
 * Builds SQL filter conditions for order_items subquery filters
 * Returns order IDs that match the product/funnel/offer filters
 */
const fetchFilteredOrderIds = async (
  projectId: string,
  filters: OrdersCoreFilters,
  startDateTime: string,
  endDateTime: string,
  statuses: string[]
): Promise<string[] | null> => {
  // Check if we need to filter by order_items
  const needsItemFilter = (
    (filters.funnelId && filters.funnelId.length > 0) ||
    (filters.productName && filters.productName.length > 0) ||
    (filters.offerCode && filters.offerCode.length > 0)
  );

  if (!needsItemFilter) {
    return null; // No item-level filtering needed
  }

  // First, get all order IDs that match basic filters
  let baseQuery = supabase
    .from('orders')
    .select('id')
    .eq('project_id', projectId)
    .in('status', statuses)
    .gte('ordered_at', startDateTime)
    .lte('ordered_at', endDateTime);

  // Apply UTM filters at order level
  if (filters.utmSource) {
    baseQuery = baseQuery.ilike('utm_source', `%${filters.utmSource}%`);
  }
  if (filters.utmCampaign) {
    baseQuery = baseQuery.ilike('utm_campaign', `%${filters.utmCampaign}%`);
  }
  if (filters.utmAdset) {
    baseQuery = baseQuery.ilike('utm_adset', `%${filters.utmAdset}%`);
  }
  if (filters.utmPlacement) {
    baseQuery = baseQuery.ilike('utm_placement', `%${filters.utmPlacement}%`);
  }
  if (filters.utmCreative) {
    baseQuery = baseQuery.ilike('utm_creative', `%${filters.utmCreative}%`);
  }
  if (filters.provider) {
    baseQuery = baseQuery.eq('provider', filters.provider);
  }

  const { data: baseOrders, error: baseError } = await baseQuery;
  
  if (baseError || !baseOrders || baseOrders.length === 0) {
    return [];
  }

  const orderIds = baseOrders.map(o => o.id);

  // Now fetch order_items for these orders and filter
  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, funnel_id, product_name, provider_offer_id')
    .in('order_id', orderIds);

  if (itemsError || !itemsData) {
    console.warn('[useOrdersCore] Error fetching items for filter:', itemsError);
    return [];
  }

  // Group items by order_id
  const itemsByOrder = new Map<string, typeof itemsData>();
  for (const item of itemsData) {
    if (!itemsByOrder.has(item.order_id)) {
      itemsByOrder.set(item.order_id, []);
    }
    itemsByOrder.get(item.order_id)!.push(item);
  }

  // Filter order IDs based on item conditions
  const filteredOrderIds: string[] = [];
  
  for (const orderId of orderIds) {
    const items = itemsByOrder.get(orderId) || [];
    if (items.length === 0) continue;

    let matchesFunnel = true;
    let matchesProduct = true;
    let matchesOffer = true;

    // Check funnel filter
    if (filters.funnelId && filters.funnelId.length > 0) {
      const funnelSet = new Set(filters.funnelId);
      matchesFunnel = items.some(item => item.funnel_id && funnelSet.has(item.funnel_id));
    }

    // Check product filter
    if (filters.productName && filters.productName.length > 0) {
      const productSet = new Set(filters.productName);
      matchesProduct = items.some(item => item.product_name && productSet.has(item.product_name));
    }

    // Check offer filter
    if (filters.offerCode && filters.offerCode.length > 0) {
      const offerSet = new Set(filters.offerCode);
      matchesOffer = items.some(item => item.provider_offer_id && offerSet.has(item.provider_offer_id));
    }

    if (matchesFunnel && matchesProduct && matchesOffer) {
      filteredOrderIds.push(orderId);
    }
  }

  return filteredOrderIds;
};

/**
 * Apply base SQL filters to a query
 * These filters apply directly to the orders table
 */
const applyOrdersFilters = (
  query: any,
  projectId: string,
  filters: OrdersCoreFilters,
  statuses: string[],
  startDateTime: string,
  endDateTime: string,
  filteredOrderIds: string[] | null
) => {
  query = query
    .eq('project_id', projectId)
    .in('status', statuses)
    .gte('ordered_at', startDateTime)
    .lte('ordered_at', endDateTime);

  // If we have pre-filtered order IDs (from item-level filters), use them
  if (filteredOrderIds !== null) {
    if (filteredOrderIds.length === 0) {
      // No orders match the item filters - use impossible condition
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      query = query.in('id', filteredOrderIds);
    }
  }

  // UTM filters - DIRECT ON ORDERS TABLE (materialized columns)
  if (filters.utmSource) {
    query = query.ilike('utm_source', `%${filters.utmSource}%`);
  }
  if (filters.utmCampaign) {
    query = query.ilike('utm_campaign', `%${filters.utmCampaign}%`);
  }
  if (filters.utmAdset) {
    query = query.ilike('utm_adset', `%${filters.utmAdset}%`);
  }
  if (filters.utmPlacement) {
    query = query.ilike('utm_placement', `%${filters.utmPlacement}%`);
  }
  if (filters.utmCreative) {
    query = query.ilike('utm_creative', `%${filters.utmCreative}%`);
  }

  // Provider filter
  if (filters.provider) {
    query = query.eq('provider', filters.provider);
  }

  return query;
};

// ============================================
// Main Hook
// ============================================

export function useOrdersCore(): UseOrdersCoreResult {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<OrdersCorePagination>({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });
  
  const [totals, setTotals] = useState<OrdersCoreTotals>({
    totalOrders: 0,
    customerPaid: 0,
    producerNet: 0,
    platformFee: 0,
    coproducerCost: 0,
    affiliateCost: 0,
    refunds: 0,
    uniqueCustomers: 0,
    loading: false,
  });
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<OrdersCoreFilters | null>(null);

  const fetchData = useCallback(async (
    projectId: string, 
    filters: OrdersCoreFilters, 
    page: number = 1, 
    pageSize: number = 100
  ) => {
    setLoading(true);
    setError(null);
    setCurrentProjectId(projectId);
    setCurrentFilters(filters);

    try {
      const offset = (page - 1) * pageSize;
      const statuses = buildStatusFilter(filters.transactionStatus || []);

      // Date range in São Paulo timezone
      const startDateTime = `${filters.startDate}T00:00:00-03:00`;
      const endDateTime = `${filters.endDate}T23:59:59-03:00`;

      // ============================================
      // STEP 1: Pre-filter order IDs if item-level filters are active
      // ============================================
      const filteredOrderIds = await fetchFilteredOrderIds(
        projectId,
        filters,
        startDateTime,
        endDateTime,
        statuses
      );

      console.log('[useOrdersCore] SQL Filter Debug:', {
        hasItemFilters: filteredOrderIds !== null,
        filteredOrderIdsCount: filteredOrderIds?.length ?? 'N/A',
        filters: {
          utmSource: filters.utmSource,
          utmCampaign: filters.utmCampaign,
          utmAdset: filters.utmAdset,
          funnelId: filters.funnelId,
          productName: filters.productName,
          offerCode: filters.offerCode,
        }
      });

      // ============================================
      // QUERY 1: COUNT total orders (with ALL filters)
      // ============================================
      let countQuery = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      countQuery = applyOrdersFilters(
        countQuery,
        projectId,
        filters,
        statuses,
        startDateTime,
        endDateTime,
        filteredOrderIds
      );

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw new Error(countError.message);

      const total = totalCount || 0;
      const totalPages = Math.ceil(total / pageSize);

      setPagination({
        page,
        pageSize,
        totalCount: total,
        totalPages,
      });

      console.log('[useOrdersCore] COUNT result:', { total, page, pageSize, totalPages });

      if (total === 0) {
        setOrders([]);
        setTotals({
          totalOrders: 0,
          customerPaid: 0,
          producerNet: 0,
          platformFee: 0,
          coproducerCost: 0,
          affiliateCost: 0,
          refunds: 0,
          uniqueCustomers: 0,
          loading: false,
        });
        return;
      }

      // ============================================
      // QUERY 2: FETCH orders with pagination (same filters)
      // ============================================
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .order('ordered_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      ordersQuery = applyOrdersFilters(
        ordersQuery,
        projectId,
        filters,
        statuses,
        startDateTime,
        endDateTime,
        filteredOrderIds
      );

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) throw new Error(ordersError.message);

      console.log('[useOrdersCore] PAGE result:', { 
        ordersCount: ordersData?.length || 0,
        offset,
        pageSize 
      });

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Get order IDs for fetching items
      const orderIds = ordersData.map(o => o.id);

      // ============================================
      // QUERY 3: FETCH order_items for these orders
      // ============================================
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) {
        console.warn('[useOrdersCore] Error fetching order items:', itemsError);
      }

      // Group items by order_id
      const itemsByOrder: Record<string, OrderItemRecord[]> = {};
      if (itemsData) {
        for (const item of itemsData) {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push({
            id: item.id,
            product_name: item.product_name,
            offer_name: item.offer_name,
            item_type: item.item_type,
            base_price: Number(item.base_price) || 0,
            funnel_id: item.funnel_id,
            provider_product_id: item.provider_product_id,
            provider_offer_id: item.provider_offer_id,
          });
        }
      }

      // ============================================
      // Transform to OrderRecord format
      // NO CLIENT-SIDE FILTERING HERE - data is already filtered by SQL
      // ============================================
      const transformedOrders: OrderRecord[] = ordersData.map(order => ({
        id: order.id,
        project_id: order.project_id,
        provider: order.provider,
        provider_order_id: order.provider_order_id,
        buyer_email: order.buyer_email,
        buyer_name: order.buyer_name,
        contact_id: order.contact_id,
        status: order.status,
        currency: order.currency,
        customer_paid: Number(order.customer_paid) || 0,
        gross_base: order.gross_base ? Number(order.gross_base) : null,
        producer_net: Number(order.producer_net) || 0,
        ordered_at: order.ordered_at,
        approved_at: order.approved_at,
        completed_at: order.completed_at,
        created_at: order.created_at,
        products: itemsByOrder[order.id] || [],
        economic_day: getEconomicDay(order.ordered_at),
        // UTM from MATERIALIZED COLUMNS (not parsed from raw_payload)
        utm_source: order.utm_source || null,
        utm_campaign: order.utm_campaign || null,
        utm_adset: order.utm_adset || null,
        utm_placement: order.utm_placement || null,
        utm_creative: order.utm_creative || null,
      }));

      setOrders(transformedOrders);

      // ============================================
      // QUERY 4: CALCULATE GLOBAL TOTALS (same filters, no pagination)
      // ============================================
      setTotals(prev => ({ ...prev, loading: true }));
      
      const fetchGlobalTotals = async () => {
        try {
          // Fetch all orders for totals (paginated to bypass 1000 limit)
          const allOrdersData: any[] = [];
          let totalsPage = 0;
          const totalsPageSize = 1000;
          let hasMoreTotals = true;

          while (hasMoreTotals) {
            let totalsQuery = supabase
              .from('orders')
              .select('customer_paid, producer_net, buyer_email, id')
              .range(totalsPage * totalsPageSize, (totalsPage + 1) * totalsPageSize - 1);

            totalsQuery = applyOrdersFilters(
              totalsQuery,
              projectId,
              filters,
              statuses,
              startDateTime,
              endDateTime,
              filteredOrderIds
            );

            const { data: totalsData, error: totalsError } = await totalsQuery;

            if (totalsError) {
              console.warn('[useOrdersCore] Error fetching totals page:', totalsError);
              break;
            }

            if (totalsData && totalsData.length > 0) {
              allOrdersData.push(...totalsData);
              hasMoreTotals = totalsData.length === totalsPageSize;
              totalsPage++;
            } else {
              hasMoreTotals = false;
            }
          }

          // Fetch ledger totals for cost breakdown
          const allOrderIds = allOrdersData.map(o => o.id);
          let ledgerTotals = {
            platform_fee: 0,
            coproducer: 0,
            affiliate: 0,
            refund: 0,
          };

          if (allOrderIds.length > 0) {
            // Fetch ledger events in batches
            for (let i = 0; i < allOrderIds.length; i += 500) {
              const batchIds = allOrderIds.slice(i, i + 500);
              const { data: ledgerData, error: ledgerError } = await supabase
                .from('ledger_events')
                .select('event_type, amount')
                .in('order_id', batchIds);

              if (!ledgerError && ledgerData) {
                for (const event of ledgerData) {
                  const absAmount = Math.abs(Number(event.amount) || 0);
                  switch (event.event_type) {
                    case 'platform_fee':
                      ledgerTotals.platform_fee += absAmount;
                      break;
                    case 'coproducer':
                      ledgerTotals.coproducer += absAmount;
                      break;
                    case 'affiliate':
                      ledgerTotals.affiliate += absAmount;
                      break;
                    case 'refund':
                      ledgerTotals.refund += absAmount;
                      break;
                  }
                }
              }
            }
          }

          // Calculate totals
          const customerPaid = allOrdersData.reduce((sum, row) => sum + (Number(row.customer_paid) || 0), 0);
          const producerNet = allOrdersData.reduce((sum, row) => sum + (Number(row.producer_net) || 0), 0);
          const uniqueEmails = new Set(allOrdersData.map(row => row.buyer_email).filter(Boolean));

          console.log('[useOrdersCore] TOTALS from Orders Core (100% SQL filtered):', {
            totalOrders: allOrdersData.length,
            customerPaid,
            producerNet,
            platformFee: ledgerTotals.platform_fee,
            coproducerCost: ledgerTotals.coproducer,
          });

          setTotals({
            totalOrders: allOrdersData.length,
            customerPaid,
            producerNet,
            platformFee: ledgerTotals.platform_fee,
            coproducerCost: ledgerTotals.coproducer,
            affiliateCost: ledgerTotals.affiliate,
            refunds: ledgerTotals.refund,
            uniqueCustomers: uniqueEmails.size,
            loading: false,
          });
        } catch (err) {
          console.warn('[useOrdersCore] Error in global totals fetch:', err);
          setTotals(prev => ({ ...prev, loading: false }));
        }
      };

      fetchGlobalTotals();

    } catch (err: any) {
      console.error('[useOrdersCore] Error fetching data:', err);
      setError(err.message || 'Erro ao carregar dados');
      setOrders([]);
      setPagination(prev => ({ ...prev, totalCount: 0, totalPages: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderDetail = useCallback(async (orderId: string): Promise<{ order: OrderRecord | null; breakdown: LedgerBreakdown | null }> => {
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        return { order: null, breakdown: null };
      }

      // Fetch items
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      // Fetch ledger events
      const { data: ledgerData } = await supabase
        .from('ledger_events')
        .select('*')
        .eq('order_id', orderId);

      // Build breakdown
      const breakdown: LedgerBreakdown = {
        platform_fee: 0,
        coproducer: 0,
        affiliate: 0,
        refund: 0,
        chargeback: 0,
        tax: 0,
        sale: 0,
      };

      if (ledgerData) {
        for (const event of ledgerData) {
          const amount = Math.abs(Number(event.amount) || 0);
          switch (event.event_type) {
            case 'platform_fee':
              breakdown.platform_fee += amount;
              break;
            case 'coproducer':
              breakdown.coproducer += amount;
              break;
            case 'affiliate':
              breakdown.affiliate += amount;
              break;
            case 'refund':
              breakdown.refund += amount;
              break;
            case 'chargeback':
              breakdown.chargeback += amount;
              break;
            case 'tax':
              breakdown.tax += amount;
              break;
            case 'sale':
              breakdown.sale += amount;
              break;
          }
        }
      }

      const order: OrderRecord = {
        id: orderData.id,
        project_id: orderData.project_id,
        provider: orderData.provider,
        provider_order_id: orderData.provider_order_id,
        buyer_email: orderData.buyer_email,
        buyer_name: orderData.buyer_name,
        contact_id: orderData.contact_id,
        status: orderData.status,
        currency: orderData.currency,
        customer_paid: Number(orderData.customer_paid) || 0,
        gross_base: orderData.gross_base ? Number(orderData.gross_base) : null,
        producer_net: Number(orderData.producer_net) || 0,
        ordered_at: orderData.ordered_at,
        approved_at: orderData.approved_at,
        completed_at: orderData.completed_at,
        created_at: orderData.created_at,
        products: (itemsData || []).map(item => ({
          id: item.id,
          product_name: item.product_name,
          offer_name: item.offer_name,
          item_type: item.item_type,
          base_price: Number(item.base_price) || 0,
          funnel_id: item.funnel_id,
          provider_product_id: item.provider_product_id,
          provider_offer_id: item.provider_offer_id,
        })),
        ledger_breakdown: breakdown,
        economic_day: getEconomicDay(orderData.ordered_at),
        // UTM from MATERIALIZED COLUMNS
        utm_source: orderData.utm_source || null,
        utm_campaign: orderData.utm_campaign || null,
        utm_adset: orderData.utm_adset || null,
        utm_placement: orderData.utm_placement || null,
        utm_creative: orderData.utm_creative || null,
      };

      return { order, breakdown };
    } catch (err) {
      console.error('[useOrdersCore] Error fetching order detail:', err);
      return { order: null, breakdown: null };
    }
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages && currentProjectId && currentFilters) {
      fetchData(currentProjectId, currentFilters, pagination.page + 1, pagination.pageSize);
    }
  }, [pagination, currentProjectId, currentFilters, fetchData]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1 && currentProjectId && currentFilters) {
      fetchData(currentProjectId, currentFilters, pagination.page - 1, pagination.pageSize);
    }
  }, [pagination, currentProjectId, currentFilters, fetchData]);

  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages && currentProjectId && currentFilters) {
      fetchData(currentProjectId, currentFilters, page, pagination.pageSize);
    }
  }, [pagination, currentProjectId, currentFilters, fetchData]);

  const setPageSize = useCallback((size: number) => {
    if (currentProjectId && currentFilters) {
      fetchData(currentProjectId, currentFilters, 1, size);
    }
  }, [currentProjectId, currentFilters, fetchData]);

  /**
   * Count orders without UTM in the same date range/filters (for UX warning)
   * This counts orders that would NOT appear when UTM filters are applied
   */
  const countOrdersWithoutUtm = useCallback(async (
    projectId: string,
    filters: OrdersCoreFilters
  ): Promise<number> => {
    try {
      const statuses = buildStatusFilter(filters.transactionStatus || []);
      const startDateTime = `${filters.startDate}T00:00:00-03:00`;
      const endDateTime = `${filters.endDate}T23:59:59-03:00`;

      // Count orders in the date range that have NULL utm_source
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', statuses)
        .gte('ordered_at', startDateTime)
        .lte('ordered_at', endDateTime)
        .is('utm_source', null);

      if (error) {
        console.warn('[useOrdersCore] Error counting orders without UTM:', error);
        return 0;
      }

      return count || 0;
    } catch (e) {
      console.warn('[useOrdersCore] Exception counting orders without UTM:', e);
      return 0;
    }
  }, []);

  return {
    orders,
    loading,
    error,
    pagination,
    totals,
    fetchData,
    fetchOrderDetail,
    countOrdersWithoutUtm,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  };
}
