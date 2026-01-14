/**
 * useFinanceTracking
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL FINANCIAL HOOK - SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This hook queries EXCLUSIVELY from finance_tracking_view which is the canonical
 * financial layer, validated 100% against Hotmart API.
 * 
 * DATA SOURCE:
 * - finance_tracking_view (Supabase view)
 * - Validated: COUNT, gross_amount, net_amount = Hotmart API
 * 
 * FILTERS:
 * - Date: economic_day (DATE type, São Paulo timezone)
 * - Status: hotmart_status IN ('APPROVED', 'COMPLETE')
 * - UTMs: utm_source, utm_campaign, utm_adset, utm_placement, utm_creative
 * 
 * FORBIDDEN SOURCES (for financial data):
 * ❌ hotmart_sales (use only finance_tracking_view)
 * ❌ sales_core_events
 * ❌ sales_core_view
 * ❌ revenue_daily / profit_daily
 * ❌ Any direct meta_insights for revenue
 * 
 * All financial screens MUST use this hook or useFinanceTrackingQuery.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FilterParams } from "@/components/SalesFilters";
import { format } from "date-fns";

// ============================================
// Types
// ============================================

export interface FinanceTrackingItem {
  id: string | null;
  transaction_id: string;
  product_name: string | null;
  product_code: string | null;
  offer_code: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  gross_amount: number;
  net_amount: number;
  hotmart_status: string | null;
  economic_day: string | null;
  purchase_date: string | null;
  funnel_id: string | null;
  funnel_name: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_placement: string | null;
  utm_creative: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  payment_method: string | null;
  payment_type: string | null;
  recurrence: number | null;
  sale_category: string | null;
  contact_id: string | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GlobalTotals {
  totalTransactions: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalUniqueCustomers: number;
  loading: boolean;
}

export interface UseFinanceTrackingResult {
  sales: FinanceTrackingItem[];
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

// ============================================
// Filter Helper
// ============================================

/**
 * Apply filters to a query on finance_tracking_view
 */
const applyViewFilters = (
  query: any,
  projectId: string,
  filters: FilterParams
) => {
  // Base filters
  query = query
    .eq('project_id', projectId)
    .gte('economic_day', filters.startDate)
    .lte('economic_day', filters.endDate);

  // Status filter
  if (filters.transactionStatus && filters.transactionStatus.length > 0) {
    const statuses = filters.transactionStatus.map(s => s.toUpperCase());
    if (statuses.length === 1) {
      query = query.eq('hotmart_status', statuses[0]);
    } else {
      query = query.in('hotmart_status', statuses);
    }
  } else {
    // Default: APPROVED and COMPLETE
    query = query.in('hotmart_status', ['APPROVED', 'COMPLETE']);
  }

  // Funnel filter
  if (filters.idFunil && filters.idFunil.length > 0) {
    query = query.in('funnel_id', filters.idFunil);
  }

  // Product filter
  if (filters.productName && filters.productName.length > 0) {
    query = query.in('product_name', filters.productName);
  }

  // Offer code filter
  if (filters.offerCode && filters.offerCode.length > 0) {
    query = query.in('offer_code', filters.offerCode);
  }

  // UTM filters
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

// ============================================
// Main Hook - with pagination
// ============================================

export function useFinanceTracking(): UseFinanceTrackingResult {
  const [sales, setSales] = useState<FinanceTrackingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });
  
  const [totals, setTotals] = useState<GlobalTotals>({
    totalTransactions: 0,
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalUniqueCustomers: 0,
    loading: false,
  });
  
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
      const offset = (page - 1) * pageSize;

      // QUERY 1: COUNT
      let countQuery = supabase
        .from('finance_tracking_view')
        .select('transaction_id', { count: 'exact', head: true });
      
      countQuery = applyViewFilters(countQuery, projectId, filters);

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

      // QUERY 2: GLOBAL TOTALS (paginated to bypass 1000 limit)
      setTotals(prev => ({ ...prev, loading: true }));
      
      const fetchGlobalTotals = async () => {
        try {
          const allTotalsData: { gross_amount: number; net_amount: number; buyer_email: string | null }[] = [];
          let totalsPage = 0;
          const totalsPageSize = 1000;
          let hasMoreTotals = true;

          while (hasMoreTotals) {
            let totalsQuery = supabase
              .from('finance_tracking_view')
              .select('gross_amount, net_amount, buyer_email')
              .range(totalsPage * totalsPageSize, (totalsPage + 1) * totalsPageSize - 1);
            
            totalsQuery = applyViewFilters(totalsQuery, projectId, filters);

            const { data: totalsData, error: totalsError } = await totalsQuery;

            if (totalsError) {
              console.warn('[useFinanceTracking] Error fetching global totals page:', totalsError);
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

          console.log('[useFinanceTracking] TOTALS:', {
            totalCount: total,
            rowsFetched: allTotalsData.length,
          });

          if (allTotalsData.length > 0) {
            const totalGrossRevenue = allTotalsData.reduce((sum, row) => sum + (Number(row.gross_amount) || 0), 0);
            const totalNetRevenue = allTotalsData.reduce((sum, row) => sum + (Number(row.net_amount) || 0), 0);
            const uniqueEmails = new Set(allTotalsData.map(row => row.buyer_email).filter(Boolean));
            
            setTotals({
              totalTransactions: allTotalsData.length,
              totalGrossRevenue,
              totalNetRevenue,
              totalUniqueCustomers: uniqueEmails.size,
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
          console.warn('[useFinanceTracking] Error in global totals fetch:', err);
          setTotals(prev => ({ ...prev, loading: false }));
        }
      };

      fetchGlobalTotals();

      // QUERY 3: PAGE DATA
      let pageQuery = supabase
        .from('finance_tracking_view')
        .select(`
          id,
          transaction_id,
          product_name,
          product_code,
          offer_code,
          buyer_name,
          buyer_email,
          buyer_phone,
          gross_amount,
          net_amount,
          hotmart_status,
          economic_day,
          purchase_date,
          funnel_id,
          funnel_name,
          utm_source,
          utm_campaign,
          utm_adset,
          utm_placement,
          utm_creative,
          meta_campaign_id,
          meta_adset_id,
          meta_ad_id,
          payment_method,
          payment_type,
          recurrence,
          sale_category,
          contact_id
        `)
        .order('economic_day', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      pageQuery = applyViewFilters(pageQuery, projectId, filters);

      const { data: pageData, error: pageError } = await pageQuery;

      if (pageError) throw new Error(pageError.message);

      if (!pageData || pageData.length === 0) {
        setSales([]);
        return;
      }

      // Transform to FinanceTrackingItem format
      const transformedSales: FinanceTrackingItem[] = pageData.map(row => ({
        id: row.id,
        transaction_id: row.transaction_id || '',
        product_name: row.product_name,
        product_code: row.product_code,
        offer_code: row.offer_code,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
        buyer_phone: row.buyer_phone,
        gross_amount: Number(row.gross_amount) || 0,
        net_amount: Number(row.net_amount) || 0,
        hotmart_status: row.hotmart_status,
        economic_day: row.economic_day,
        purchase_date: row.purchase_date,
        funnel_id: row.funnel_id,
        funnel_name: row.funnel_name,
        utm_source: row.utm_source,
        utm_campaign: row.utm_campaign,
        utm_adset: row.utm_adset,
        utm_placement: row.utm_placement,
        utm_creative: row.utm_creative,
        meta_campaign_id: row.meta_campaign_id,
        meta_adset_id: row.meta_adset_id,
        meta_ad_id: row.meta_ad_id,
        payment_method: row.payment_method,
        payment_type: row.payment_type,
        recurrence: row.recurrence,
        sale_category: row.sale_category,
        contact_id: row.contact_id,
      }));

      setSales(transformedSales);
    } catch (err: any) {
      console.error('[useFinanceTracking] Error fetching data:', err);
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

// ============================================
// Simple Query Hook (for dashboards/analysis)
// ============================================

interface UseFinanceTrackingQueryOptions {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
  funnelId?: string;
  enabled?: boolean;
}

export interface FinanceTrackingSale {
  transaction_id: string;
  product_name: string;
  offer_code: string | null;
  gross_amount: number;
  net_amount: number;
  buyer_email: string | null;
  economic_day: string | null;
  purchase_date: string | null;
  hotmart_status: string;
  funnel_id: string | null;
  funnel_name: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_creative: string | null;
  utm_placement: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  payment_method: string | null;
  recurrence: number | null;
}

/**
 * Simple query hook for dashboards - uses react-query
 */
export function useFinanceTrackingQuery(options: UseFinanceTrackingQueryOptions) {
  const { projectId, startDate, endDate, funnelId, enabled = true } = options;
  
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['finance-tracking', projectId, startDateStr, endDateStr, funnelId],
    queryFn: async () => {
      // Fetch ALL data with pagination to bypass 1000 limit
      const PAGE_SIZE = 1000;
      let allData: FinanceTrackingSale[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('finance_tracking_view')
          .select(`
            transaction_id,
            product_name,
            offer_code,
            gross_amount,
            net_amount,
            buyer_email,
            economic_day,
            purchase_date,
            hotmart_status,
            funnel_id,
            funnel_name,
            utm_source,
            utm_campaign,
            utm_adset,
            utm_creative,
            utm_placement,
            meta_campaign_id,
            meta_adset_id,
            meta_ad_id,
            payment_method,
            recurrence
          `)
          .eq('project_id', projectId!)
          .in('hotmart_status', ['APPROVED', 'COMPLETE'])
          .gte('economic_day', startDateStr)
          .lte('economic_day', endDateStr)
          .order('transaction_id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (funnelId) {
          query = query.eq('funnel_id', funnelId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[useFinanceTrackingQuery] Error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data.map(row => ({
            transaction_id: row.transaction_id || '',
            product_name: row.product_name || '',
            offer_code: row.offer_code,
            gross_amount: Number(row.gross_amount) || 0,
            net_amount: Number(row.net_amount) || 0,
            buyer_email: row.buyer_email,
            economic_day: row.economic_day,
            purchase_date: row.purchase_date,
            hotmart_status: row.hotmart_status || 'UNKNOWN',
            funnel_id: row.funnel_id,
            funnel_name: row.funnel_name,
            utm_source: row.utm_source,
            utm_campaign: row.utm_campaign,
            utm_adset: row.utm_adset,
            utm_creative: row.utm_creative,
            utm_placement: row.utm_placement,
            meta_campaign_id: row.meta_campaign_id,
            meta_adset_id: row.meta_adset_id,
            meta_ad_id: row.meta_ad_id,
            payment_method: row.payment_method,
            recurrence: row.recurrence,
          }))];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      console.log(`[useFinanceTrackingQuery] Loaded ${allData.length} transactions, gross: R$${allData.reduce((s, r) => s + r.gross_amount, 0).toFixed(2)}, net: R$${allData.reduce((s, r) => s + r.net_amount, 0).toFixed(2)}`);
      return allData;
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================
// Summary Hook for quick totals
// ============================================

export function useFinanceTrackingSummary(options: UseFinanceTrackingQueryOptions) {
  const { data: sales, isLoading, error } = useFinanceTrackingQuery(options);

  const summary = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        totalTransactions: 0,
        totalGrossRevenue: 0,
        totalNetRevenue: 0,
        totalUniqueCustomers: 0,
        avgTicket: 0,
      };
    }

    const totalGross = sales.reduce((sum, s) => sum + s.gross_amount, 0);
    const totalNet = sales.reduce((sum, s) => sum + s.net_amount, 0);
    const uniqueEmails = new Set(sales.map(s => s.buyer_email).filter(Boolean));

    return {
      totalTransactions: sales.length,
      totalGrossRevenue: totalGross,
      totalNetRevenue: totalNet,
      totalUniqueCustomers: uniqueEmails.size,
      avgTicket: sales.length > 0 ? totalNet / sales.length : 0,
    };
  }, [sales]);

  return {
    sales,
    summary,
    isLoading,
    error,
  };
}
