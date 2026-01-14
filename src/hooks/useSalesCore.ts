import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterParams } from "@/components/SalesFilters";

export interface CoreSaleItem {
  id: string;
  transaction: string;
  product: string;
  buyer: string;
  grossAmount: number;
  netAmount: number;
  status: string;
  economicDay: string;
  date: string;
  offerCode?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  utmPlacement?: string;
  utmCreative?: string;
  currency: string;
  funnelId?: string;
  funnelName?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Global totals from the complete filtered dataset (not paginated)
 */
export interface GlobalTotals {
  totalTransactions: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalUniqueCustomers: number;
  loading: boolean;
}

export interface UseSalesCoreResult {
  sales: CoreSaleItem[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  totals: GlobalTotals;
  fetchSales: (projectId: string, filters: FilterParams, page?: number, pageSize?: number) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Apply common filters to a query on sales_core_view
 * This ensures both Totals and Page queries use IDENTICAL filters
 */
const applyViewFilters = (
  query: any,
  projectId: string,
  filters: FilterParams,
  queryName: string = 'unknown'
) => {
  // Base filters
  query = query
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .eq('is_active', true)
    .gte('economic_day', filters.startDate)
    .lte('economic_day', filters.endDate);

  // Event type filter (status mapping)
  if (filters.transactionStatus && filters.transactionStatus.length > 0) {
    const statusToEventType: Record<string, string> = {
      'approved': 'purchase',
      'complete': 'purchase',
      'refunded': 'refund',
      'chargeback': 'chargeback',
      'cancelled': 'cancellation',
    };
    
    const eventTypes = filters.transactionStatus.map(s => statusToEventType[s.toLowerCase()] || s.toLowerCase());
    const uniqueEventTypes = [...new Set(eventTypes)];
    
    if (uniqueEventTypes.length === 1) {
      query = query.eq('event_type', uniqueEventTypes[0]);
    } else if (uniqueEventTypes.length > 1) {
      query = query.in('event_type', uniqueEventTypes);
    }
  } else {
    // Default to purchases only
    query = query.eq('event_type', 'purchase');
  }

  // ========== SQL-LEVEL FILTERS (previously client-side) ==========
  
  // Filter by funnel_id (UUID)
  if (filters.idFunil && filters.idFunil.length > 0) {
    query = query.in('funnel_id', filters.idFunil);
  }

  // Filter by product name (exact match)
  if (filters.productName && filters.productName.length > 0) {
    query = query.in('product_name', filters.productName);
  }

  // Filter by offer code
  if (filters.offerCode && filters.offerCode.length > 0) {
    query = query.in('offer_code', filters.offerCode);
  }

  // UTM filters (partial match with ilike)
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

  return query;
};

/**
 * Hook to fetch sales data using the canonical sales_core_view
 * 
 * Strategy:
 * 1. Use sales_core_view which JOINs sales_core_events + hotmart_sales + offer_mappings
 * 2. Apply ALL filters at SQL level (funnel, product, offer, UTMs)
 * 3. Both Totals and Page queries use identical filter logic
 * 4. No more client-side filtering!
 */
export function useSalesCore(): UseSalesCoreResult {
  const [sales, setSales] = useState<CoreSaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });
  
  // Global totals state (from complete filtered dataset, not paginated)
  const [totals, setTotals] = useState<GlobalTotals>({
    totalTransactions: 0,
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalUniqueCustomers: 0,
    loading: false,
  });
  
  // Store current filters for pagination navigation
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterParams | null>(null);

  const fetchSales = useCallback(async (
    projectId: string, 
    filters: FilterParams, 
    page: number = 1, 
    pageSize: number = 100
  ) => {
    setLoading(true);
    setError(null);
    setCurrentProjectId(projectId);
    setCurrentFilters(filters);

    try {
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;

      // ========== QUERY 1: COUNT (for pagination) ==========
      let countQuery = supabase
        .from('sales_core_view')
        .select('id', { count: 'exact', head: true });
      
      countQuery = applyViewFilters(countQuery, projectId, filters, 'COUNT');

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        throw new Error(countError.message);
      }

      const total = totalCount || 0;
      const totalPages = Math.ceil(total / pageSize);

      // Update pagination state
      setPagination({
        page,
        pageSize,
        totalCount: total,
        totalPages,
      });

      if (total === 0) {
        setSales([]);
        setTotals({
          totalTransactions: 0,
          totalGrossRevenue: 0,
          totalNetRevenue: 0,
          totalUniqueCustomers: 0,
          loading: false,
        });
        return;
      }

      // ========== QUERY 2: GLOBAL TOTALS (with pagination to bypass 1000 limit) ==========
      setTotals(prev => ({ ...prev, loading: true }));
      
      const fetchGlobalTotals = async () => {
        try {
          // Use pagination to fetch ALL records and bypass Supabase's 1000 row limit
          const allTotalsData: { gross_amount: number; net_amount: number; contact_id: string }[] = [];
          let totalsPage = 0;
          const totalsPageSize = 1000;
          let hasMoreTotals = true;

          while (hasMoreTotals) {
            let totalsQuery = supabase
              .from('sales_core_view')
              .select('gross_amount, net_amount, contact_id')
              .range(totalsPage * totalsPageSize, (totalsPage + 1) * totalsPageSize - 1);
            
            totalsQuery = applyViewFilters(totalsQuery, projectId, filters, 'TOTALS');

            const { data: totalsData, error: totalsError } = await totalsQuery;

            if (totalsError) {
              console.warn('Error fetching global totals page:', totalsError);
              break;
            }

            if (totalsData && totalsData.length > 0) {
              allTotalsData.push(...totalsData);
              hasMoreTotals = totalsData.length === totalsPageSize;
              totalsPage++;
            } else {
              hasMoreTotals = false;
            }
          }

          // Log forensic data for debugging
          console.log('[useSalesCore] TOTALS FORENSIC:', {
            totalCount: total,
            totalsRowsFetched: allTotalsData.length,
            pagesLoaded: totalsPage,
            timestamp: new Date().toISOString(),
          });

          if (allTotalsData.length > 0) {
            const totalGrossRevenue = allTotalsData.reduce((sum, row) => sum + (Number(row.gross_amount) || 0), 0);
            const totalNetRevenue = allTotalsData.reduce((sum, row) => sum + (Number(row.net_amount) || 0), 0);
            const uniqueContacts = new Set(allTotalsData.map(row => row.contact_id).filter(Boolean));
            
            setTotals({
              totalTransactions: allTotalsData.length,
              totalGrossRevenue,
              totalNetRevenue,
              totalUniqueCustomers: uniqueContacts.size,
              loading: false,
            });
          } else {
            setTotals({
              totalTransactions: 0,
              totalGrossRevenue: 0,
              totalNetRevenue: 0,
              totalUniqueCustomers: 0,
              loading: false,
            });
          }
        } catch (err) {
          console.warn('Error in global totals fetch:', err);
          setTotals(prev => ({ ...prev, loading: false }));
        }
      };

      // Start fetching totals in background
      fetchGlobalTotals();

      // ========== QUERY 3: PAGE DATA (with pagination, same filters) ==========
      let pageQuery = supabase
        .from('sales_core_view')
        .select(`
          id,
          transaction_id,
          product_name,
          buyer_name,
          gross_amount,
          net_amount,
          event_type,
          hotmart_status,
          economic_day,
          offer_code,
          currency,
          funnel_id,
          funnel_name,
          utm_source,
          utm_campaign,
          utm_adset,
          utm_placement,
          utm_creative
        `)
        .order('economic_day', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      pageQuery = applyViewFilters(pageQuery, projectId, filters, 'PAGE');

      const { data: pageData, error: pageError } = await pageQuery;

      // Log forensic data for debugging pagination
      console.log('[useSalesCore] PAGE FORENSIC:', {
        totalCount: total,
        page,
        pageSize,
        offset,
        pageRowsLength: pageData?.length || 0,
        timestamp: new Date().toISOString(),
      });

      if (pageError) {
        throw new Error(pageError.message);
      }

      if (!pageData || pageData.length === 0) {
        setSales([]);
        return;
      }

      // Transform data to CoreSaleItem format
      // Group by transaction_id to avoid duplicates
      const groupedByTx = new Map<string, any>();
      for (const row of pageData) {
        const txId = row.transaction_id || row.id;
        if (!groupedByTx.has(txId)) {
          groupedByTx.set(txId, row);
        }
      }

      const transformedSales: CoreSaleItem[] = [];
      
      for (const [txId, row] of groupedByTx) {
        const economicDay = row.economic_day;
        const formattedDate = economicDay 
          ? new Date(economicDay + 'T12:00:00').toLocaleDateString('pt-BR')
          : '-';

        transformedSales.push({
          id: row.id,
          transaction: txId,
          product: row.product_name || '-',
          buyer: row.buyer_name || '-',
          grossAmount: Number(row.gross_amount) || 0,
          netAmount: Number(row.net_amount) || 0,
          status: row.hotmart_status || row.event_type?.toUpperCase() || 'UNKNOWN',
          economicDay,
          date: formattedDate,
          offerCode: row.offer_code || undefined,
          currency: row.currency || 'BRL',
          funnelId: row.funnel_id || undefined,
          funnelName: row.funnel_name || undefined,
          utmSource: row.utm_source || undefined,
          utmCampaign: row.utm_campaign || undefined,
          utmAdset: row.utm_adset || undefined,
          utmPlacement: row.utm_placement || undefined,
          utmCreative: row.utm_creative || undefined,
        });
      }

      // Sort by economic_day descending
      transformedSales.sort((a, b) => {
        if (!a.economicDay || !b.economicDay) return 0;
        return b.economicDay.localeCompare(a.economicDay);
      });

      setSales(transformedSales);
    } catch (err: any) {
      console.error('Error fetching sales from sales_core_view:', err);
      setError(err.message || 'Erro ao carregar dados');
      setSales([]);
      setPagination(prev => ({ ...prev, totalCount: 0, totalPages: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages && currentProjectId && currentFilters) {
      fetchSales(currentProjectId, currentFilters, pagination.page + 1, pagination.pageSize);
    }
  }, [pagination, currentProjectId, currentFilters, fetchSales]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1 && currentProjectId && currentFilters) {
      fetchSales(currentProjectId, currentFilters, pagination.page - 1, pagination.pageSize);
    }
  }, [pagination, currentProjectId, currentFilters, fetchSales]);

  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages && currentProjectId && currentFilters) {
      fetchSales(currentProjectId, currentFilters, page, pagination.pageSize);
    }
  }, [pagination, currentProjectId, currentFilters, fetchSales]);

  const setPageSize = useCallback((size: number) => {
    if (currentProjectId && currentFilters) {
      fetchSales(currentProjectId, currentFilters, 1, size);
    }
  }, [currentProjectId, currentFilters, fetchSales]);

  return {
    sales,
    loading,
    error,
    pagination,
    totals,
    fetchSales,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  };
}
