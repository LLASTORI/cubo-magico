/**
 * useOrdersCore
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL FINANCIAL HOOK - ORDERS CORE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ REGRA CANÔNICA DE PEDIDO (OBRIGATÓRIA - NÃO NEGOCIÁVEL)                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ UM PEDIDO = TODOS OS PRODUTOS DO MESMO provider_order_id                   │
 * │                                                                             │
 * │ • orders é a entidade canônica de pedido                                   │
 * │ • orders.id = identificador interno único                                  │
 * │ • orders.provider_order_id = identificador externo (Hotmart, etc)          │
 * │                                                                             │
 * │ Todo produto vendido no mesmo checkout deve:                               │
 * │   ✓ Pertencer ao mesmo order_id                                            │
 * │   ✓ Aparecer como order_item                                               │
 * │                                                                             │
 * │ Tipos de item suportados:                                                  │
 * │   • main (produto principal)                                               │
 * │   • bump (order bump)                                                      │
 * │   • upsell                                                                 │
 * │   • downsell                                                               │
 * │   • combo                                                                  │
 * │                                                                             │
 * │ PROIBIDO: Renderizar produtos por transaction_id isolado na UI             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * This hook queries from the CANONICAL Orders Core tables:
 * - orders: Primary source for customer_paid, producer_net
 * - order_items: Products list with base_price
 * - ledger_events: Financial breakdown (EXPLANATION ONLY)
 * 
 * FORBIDDEN SOURCES:
 * ❌ finance_ledger_summary
 * ❌ hotmart_sales
 * ❌ crm_transactions
 * ❌ Any legacy views
 * 
 * PRINCIPLE:
 * - Ledger explains the order, but NEVER changes order values
 * - customer_paid = what customer paid (GROSS)
 * - producer_net = what producer receives (NET)
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
  
  // UTM from raw_payload or attribution
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

export interface OrdersCoreFilters {
  startDate: string;         // YYYY-MM-DD (economic_day)
  endDate: string;           // YYYY-MM-DD (economic_day)
  transactionStatus?: string[];
  funnelId?: string[];
  productName?: string[];
  offerCode?: string[];
  utmSource?: string;
  utmCampaign?: string;
  provider?: string;         // Prepared for multi-platform
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
  // Map UI status to database status
  const mappedStatuses = statuses.map(s => s.toLowerCase());
  if (mappedStatuses.length === 0) {
    return ['approved', 'complete'];
  }
  return mappedStatuses;
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

      // ============================================
      // QUERY 1: COUNT total orders
      // ============================================
      let countQuery = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', statuses);

      // Date filter using ordered_at converted to economic_day
      // We filter by ordered_at range in UTC, then compute economic_day client-side
      const startDateTime = `${filters.startDate}T00:00:00-03:00`;
      const endDateTime = `${filters.endDate}T23:59:59-03:00`;
      countQuery = countQuery
        .gte('ordered_at', startDateTime)
        .lte('ordered_at', endDateTime);

      if (filters.provider) {
        countQuery = countQuery.eq('provider', filters.provider);
      }

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
      // QUERY 2: FETCH orders with pagination
      // ============================================
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('project_id', projectId)
        .in('status', statuses)
        .gte('ordered_at', startDateTime)
        .lte('ordered_at', endDateTime)
        .order('ordered_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filters.provider) {
        ordersQuery = ordersQuery.eq('provider', filters.provider);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) throw new Error(ordersError.message);

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

      // Filter by product name if specified
      let filteredOrders = ordersData;
      if (filters.productName && filters.productName.length > 0) {
        const productSet = new Set(filters.productName);
        filteredOrders = ordersData.filter(order => {
          const orderItems = itemsByOrder[order.id] || [];
          return orderItems.some(item => item.product_name && productSet.has(item.product_name));
        });
      }

      // Filter by funnel if specified
      if (filters.funnelId && filters.funnelId.length > 0) {
        const funnelSet = new Set(filters.funnelId);
        filteredOrders = filteredOrders.filter(order => {
          const orderItems = itemsByOrder[order.id] || [];
          return orderItems.some(item => item.funnel_id && funnelSet.has(item.funnel_id));
        });
      }

      // Transform to OrderRecord format
      const transformedOrders: OrderRecord[] = filteredOrders.map(order => {
        // Extract UTM from raw_payload if available
        const rawPayload = order.raw_payload as any;
        const tracking = rawPayload?.purchase?.checkout?.sck 
          ? parseSck(rawPayload.purchase.checkout.sck)
          : {};

        return {
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
          utm_source: tracking.utm_source || null,
          utm_campaign: tracking.utm_campaign || null,
          utm_adset: tracking.utm_adset || null,
          utm_placement: tracking.utm_placement || null,
          utm_creative: tracking.utm_creative || null,
        };
      });

      // Apply UTM filters
      let finalOrders = transformedOrders;
      if (filters.utmSource) {
        finalOrders = finalOrders.filter(o => 
          o.utm_source?.toLowerCase().includes(filters.utmSource!.toLowerCase())
        );
      }
      if (filters.utmCampaign) {
        finalOrders = finalOrders.filter(o => 
          o.utm_campaign?.toLowerCase().includes(filters.utmCampaign!.toLowerCase())
        );
      }

      setOrders(finalOrders);

      // ============================================
      // QUERY 4: CALCULATE GLOBAL TOTALS
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
              .eq('project_id', projectId)
              .in('status', statuses)
              .gte('ordered_at', startDateTime)
              .lte('ordered_at', endDateTime)
              .range(totalsPage * totalsPageSize, (totalsPage + 1) * totalsPageSize - 1);

            if (filters.provider) {
              totalsQuery = totalsQuery.eq('provider', filters.provider);
            }

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

          console.log('[useOrdersCore] TOTALS from Orders Core:', {
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

      const rawPayload = orderData.raw_payload as any;
      const tracking = rawPayload?.purchase?.checkout?.sck 
        ? parseSck(rawPayload.purchase.checkout.sck)
        : {};

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
        utm_source: tracking.utm_source || null,
        utm_campaign: tracking.utm_campaign || null,
        utm_adset: tracking.utm_adset || null,
        utm_placement: tracking.utm_placement || null,
        utm_creative: tracking.utm_creative || null,
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

  return {
    orders,
    loading,
    error,
    pagination,
    totals,
    fetchData,
    fetchOrderDetail,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  };
}

// ============================================
// Helper: Parse SCK tracking parameter
// ============================================

function parseSck(sck: string): Record<string, string> {
  if (!sck) return {};
  
  const result: Record<string, string> = {};
  const parts = sck.split('|');
  
  for (const part of parts) {
    const [key, value] = part.split(':');
    if (key && value) {
      // Map SCK keys to UTM keys
      switch (key.toLowerCase()) {
        case 'src':
          result.utm_source = value;
          break;
        case 'utm_source':
          result.utm_source = value;
          break;
        case 'utm_campaign':
          result.utm_campaign = value;
          break;
        case 'utm_medium':
          result.utm_medium = value;
          break;
        case 'utm_term':
          result.utm_adset = value;
          break;
        case 'utm_content':
          result.utm_creative = value;
          break;
        case 'sck':
          // Full SCK - parse campaign/adset/ad
          const sckParts = value.split('_');
          if (sckParts.length >= 3) {
            result.utm_campaign = sckParts[0] || '';
            result.utm_adset = sckParts[1] || '';
            result.utm_creative = sckParts[2] || '';
          }
          break;
      }
    }
  }
  
  return result;
}
