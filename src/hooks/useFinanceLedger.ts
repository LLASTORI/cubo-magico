/**
 * useFinanceLedger
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL FINANCIAL HOOK - SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This hook queries EXCLUSIVELY from finance_ledger_summary which represents
 * REAL MONEY paid by Hotmart (after affiliates, coproduction, fees, taxes,
 * refunds, and chargebacks).
 * 
 * DATA SOURCE:
 * - finance_ledger_summary (Supabase view)
 * - Validated: producer_gross, net_revenue = Hotmart Financial Statement
 * 
 * FIELDS:
 * - producer_gross: Receita Bruta do Produtor
 * - affiliate_cost: Custo de Afiliados
 * - coproducer_cost: Custo de Coprodução
 * - platform_cost: Taxas Hotmart
 * - refunds: Reembolsos
 * - net_revenue: Receita Líquida do Produtor (real money received)
 * - economic_day: Data econômica (America/Sao_Paulo timezone)
 * 
 * FILTERS:
 * - Date: economic_day (DATE type, São Paulo timezone)
 * - Status: hotmart_status IN ('APPROVED', 'COMPLETE')
 * - UTMs: utm_source, utm_campaign, utm_adset, utm_placement, utm_creative
 * 
 * FORBIDDEN SOURCES (for financial data):
 * ❌ hotmart_sales.total_price_brl
 * ❌ hotmart_sales.net_revenue
 * ❌ sales_core_events
 * ❌ sales_core_view
 * ❌ finance_tracking_view (legacy - migrate away)
 * ❌ revenue_daily / profit_daily
 * ❌ Any percentage-based fallback or estimation
 * 
 * All financial screens MUST use this hook.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ============================================
// Types
// ============================================

export interface LedgerTransaction {
  project_id: string;
  transaction_id: string;
  transaction_date: string | null;
  economic_day: string | null;
  
  // Financial fields (CANONICAL - real money)
  producer_gross: number;
  affiliate_cost: number;
  coproducer_cost: number;
  platform_cost: number;
  refunds: number;
  net_revenue: number;
  
  // Metadata
  provider: string | null;
  event_count: number;
  product_name: string | null;
  product_code: string | null;
  offer_code: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  payment_method: string | null;
  payment_type: string | null;
  recurrence: number | null;
  is_upgrade: boolean | null;
  subscriber_code: string | null;
  
  // Funnel info
  funnel_id: string | null;
  funnel_name: string | null;
  
  // UTM fields
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_placement: string | null;
  utm_creative: string | null;
  
  // Meta attribution
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  
  // Status
  hotmart_status: string | null;
  sale_category: string | null;
}

export interface LedgerPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface LedgerTotals {
  totalTransactions: number;
  producerGross: number;
  affiliateCost: number;
  coproducerCost: number;
  platformCost: number;
  refunds: number;
  netRevenue: number;
  uniqueCustomers: number;
  loading: boolean;
}

export interface LedgerFilters {
  startDate: string;
  endDate: string;
  transactionStatus?: string[];
  funnelId?: string[];
  productName?: string[];
  offerCode?: string[];
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  utmPlacement?: string;
  utmCreative?: string;
}

export interface UseFinanceLedgerResult {
  transactions: LedgerTransaction[];
  loading: boolean;
  error: string | null;
  pagination: LedgerPagination;
  totals: LedgerTotals;
  fetchData: (projectId: string, filters: LedgerFilters, page?: number, pageSize?: number) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

// ============================================
// Filter Helper
// ============================================

const applyLedgerFilters = (
  query: any,
  projectId: string,
  filters: LedgerFilters
) => {
  // Base filters
  query = query
    .eq('project_id', projectId)
    .gte('economic_day', filters.startDate)
    .lte('economic_day', filters.endDate);

  // Status filter - default to APPROVED and COMPLETE
  if (filters.transactionStatus && filters.transactionStatus.length > 0) {
    const statuses = filters.transactionStatus.map(s => s.toUpperCase());
    query = query.in('hotmart_status', statuses);
  } else {
    query = query.in('hotmart_status', ['APPROVED', 'COMPLETE']);
  }

  // Funnel filter
  if (filters.funnelId && filters.funnelId.length > 0) {
    query = query.in('funnel_id', filters.funnelId);
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

export function useFinanceLedger(): UseFinanceLedgerResult {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<LedgerPagination>({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });
  
  const [totals, setTotals] = useState<LedgerTotals>({
    totalTransactions: 0,
    producerGross: 0,
    affiliateCost: 0,
    coproducerCost: 0,
    platformCost: 0,
    refunds: 0,
    netRevenue: 0,
    uniqueCustomers: 0,
    loading: false,
  });
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<LedgerFilters | null>(null);

  const fetchData = useCallback(async (
    projectId: string, 
    filters: LedgerFilters, 
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
        .from('finance_ledger_summary')
        .select('transaction_id', { count: 'exact', head: true });
      
      countQuery = applyLedgerFilters(countQuery, projectId, filters);

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
        setTransactions([]);
        setTotals({
          totalTransactions: 0,
          producerGross: 0,
          affiliateCost: 0,
          coproducerCost: 0,
          platformCost: 0,
          refunds: 0,
          netRevenue: 0,
          uniqueCustomers: 0,
          loading: false,
        });
        return;
      }

      // QUERY 2: GLOBAL TOTALS (paginated to bypass 1000 limit)
      setTotals(prev => ({ ...prev, loading: true }));
      
      const fetchGlobalTotals = async () => {
        try {
          const allTotalsData: { 
            producer_gross: number; 
            affiliate_cost: number;
            coproducer_cost: number;
            platform_cost: number;
            refunds: number;
            net_revenue: number; 
            buyer_email: string | null 
          }[] = [];
          let totalsPage = 0;
          const totalsPageSize = 1000;
          let hasMoreTotals = true;

          while (hasMoreTotals) {
            let totalsQuery = supabase
              .from('finance_ledger_summary')
              .select('producer_gross, affiliate_cost, coproducer_cost, platform_cost, refunds, net_revenue, buyer_email')
              .range(totalsPage * totalsPageSize, (totalsPage + 1) * totalsPageSize - 1);
            
            totalsQuery = applyLedgerFilters(totalsQuery, projectId, filters);

            const { data: totalsData, error: totalsError } = await totalsQuery;

            if (totalsError) {
              console.warn('[useFinanceLedger] Error fetching global totals page:', totalsError);
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

          console.log('[useFinanceLedger] TOTALS from finance_ledger_summary:', {
            totalCount: total,
            rowsFetched: allTotalsData.length,
          });

          if (allTotalsData.length > 0) {
            const producerGross = allTotalsData.reduce((sum, row) => sum + (Number(row.producer_gross) || 0), 0);
            const affiliateCost = allTotalsData.reduce((sum, row) => sum + (Number(row.affiliate_cost) || 0), 0);
            const coproducerCost = allTotalsData.reduce((sum, row) => sum + (Number(row.coproducer_cost) || 0), 0);
            const platformCost = allTotalsData.reduce((sum, row) => sum + (Number(row.platform_cost) || 0), 0);
            const refunds = allTotalsData.reduce((sum, row) => sum + (Number(row.refunds) || 0), 0);
            const netRevenue = allTotalsData.reduce((sum, row) => sum + (Number(row.net_revenue) || 0), 0);
            const uniqueEmails = new Set(allTotalsData.map(row => row.buyer_email).filter(Boolean));
            
            setTotals({
              totalTransactions: allTotalsData.length,
              producerGross,
              affiliateCost,
              coproducerCost,
              platformCost,
              refunds,
              netRevenue,
              uniqueCustomers: uniqueEmails.size,
              loading: false,
            });
          } else {
            setTotals({
              totalTransactions: 0,
              producerGross: 0,
              affiliateCost: 0,
              coproducerCost: 0,
              platformCost: 0,
              refunds: 0,
              netRevenue: 0,
              uniqueCustomers: 0,
              loading: false,
            });
          }
        } catch (err) {
          console.warn('[useFinanceLedger] Error in global totals fetch:', err);
          setTotals(prev => ({ ...prev, loading: false }));
        }
      };

      fetchGlobalTotals();

      // QUERY 3: PAGE DATA
      let pageQuery = supabase
        .from('finance_ledger_summary')
        .select('*')
        .order('economic_day', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      pageQuery = applyLedgerFilters(pageQuery, projectId, filters);

      const { data: pageData, error: pageError } = await pageQuery;

      if (pageError) throw new Error(pageError.message);

      if (!pageData || pageData.length === 0) {
        setTransactions([]);
        return;
      }

      // Transform to LedgerTransaction format
      const transformedData: LedgerTransaction[] = pageData.map(row => ({
        project_id: row.project_id,
        transaction_id: row.transaction_id || '',
        transaction_date: row.transaction_date,
        economic_day: row.economic_day,
        
        // Financial fields (CANONICAL)
        producer_gross: Number(row.producer_gross) || 0,
        affiliate_cost: Number(row.affiliate_cost) || 0,
        coproducer_cost: Number(row.coproducer_cost) || 0,
        platform_cost: Number(row.platform_cost) || 0,
        refunds: Number(row.refunds) || 0,
        net_revenue: Number(row.net_revenue) || 0,
        
        // Metadata
        provider: row.provider,
        event_count: Number(row.event_count) || 0,
        product_name: row.product_name,
        product_code: row.product_code,
        offer_code: row.offer_code,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
        buyer_phone: row.buyer_phone,
        payment_method: row.payment_method,
        payment_type: row.payment_type,
        recurrence: row.recurrence,
        is_upgrade: row.is_upgrade,
        subscriber_code: row.subscriber_code,
        
        // Funnel info
        funnel_id: row.funnel_id,
        funnel_name: row.funnel_name,
        
        // UTM fields
        utm_source: row.utm_source,
        utm_campaign: row.utm_campaign,
        utm_adset: row.utm_adset,
        utm_placement: row.utm_placement,
        utm_creative: row.utm_creative,
        
        // Meta attribution
        meta_campaign_id: row.meta_campaign_id,
        meta_adset_id: row.meta_adset_id,
        meta_ad_id: row.meta_ad_id,
        
        // Status
        hotmart_status: row.hotmart_status,
        sale_category: row.sale_category,
      }));

      setTransactions(transformedData);
    } catch (err: any) {
      console.error('[useFinanceLedger] Error fetching data:', err);
      setError(err.message || 'Erro ao carregar dados');
      setTransactions([]);
      setPagination(prev => ({ ...prev, totalCount: 0, totalPages: 0 }));
    } finally {
      setLoading(false);
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
    transactions,
    loading,
    error,
    pagination,
    totals,
    fetchData,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  };
}

// ============================================
// Simple Query Hook (for dashboards/analysis)
// ============================================

interface UseFinanceLedgerQueryOptions {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
  funnelId?: string;
  enabled?: boolean;
}

export interface LedgerSale {
  transaction_id: string;
  economic_day: string | null;
  producer_gross: number;
  affiliate_cost: number;
  coproducer_cost: number;
  platform_cost: number;
  refunds: number;
  net_revenue: number;
  product_name: string | null;
  product_code: string | null;
  offer_code: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
  hotmart_status: string | null;
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
 * Fetches from finance_ledger_summary (CANONICAL)
 */
export function useFinanceLedgerQuery(options: UseFinanceLedgerQueryOptions) {
  const { projectId, startDate, endDate, funnelId, enabled = true } = options;
  
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['finance-ledger', projectId, startDateStr, endDateStr, funnelId],
    queryFn: async () => {
      // Fetch ALL data with pagination to bypass 1000 limit
      const PAGE_SIZE = 1000;
      let allData: LedgerSale[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('finance_ledger_summary')
          .select(`
            transaction_id,
            economic_day,
            producer_gross,
            affiliate_cost,
            coproducer_cost,
            platform_cost,
            refunds,
            net_revenue,
            product_name,
            product_code,
            offer_code,
            buyer_email,
            buyer_name,
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
          console.error('[useFinanceLedgerQuery] Error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          const mapped: LedgerSale[] = data.map(row => ({
            transaction_id: row.transaction_id,
            economic_day: row.economic_day,
            producer_gross: Number(row.producer_gross) || 0,
            affiliate_cost: Number(row.affiliate_cost) || 0,
            coproducer_cost: Number(row.coproducer_cost) || 0,
            platform_cost: Number(row.platform_cost) || 0,
            refunds: Number(row.refunds) || 0,
            net_revenue: Number(row.net_revenue) || 0,
            product_name: row.product_name,
            product_code: row.product_code,
            offer_code: row.offer_code,
            buyer_email: row.buyer_email,
            buyer_name: row.buyer_name,
            hotmart_status: row.hotmart_status,
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
          }));
          allData = [...allData, ...mapped];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      const totalProducerGross = allData.reduce((s, sale) => s + sale.producer_gross, 0);
      const totalNetRevenue = allData.reduce((s, sale) => s + sale.net_revenue, 0);
      console.log(`[useFinanceLedgerQuery] Loaded ${allData.length} transactions from finance_ledger_summary, producer_gross: R$${totalProducerGross.toFixed(2)}, net_revenue: R$${totalNetRevenue.toFixed(2)}`);
      
      return allData;
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================
// Summary Hook (convenience wrapper)
// ============================================

interface UseFinanceLedgerSummaryOptions {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
  funnelId?: string;
  enabled?: boolean;
}

export interface LedgerSummary {
  totalTransactions: number;
  producerGross: number;
  affiliateCost: number;
  coproducerCost: number;
  platformCost: number;
  refunds: number;
  netRevenue: number;
  uniqueCustomers: number;
  avgTicket: number;
}

/**
 * Convenience hook that returns aggregated summary metrics
 * from the canonical finance_ledger_summary
 */
export function useFinanceLedgerSummary(options: UseFinanceLedgerSummaryOptions) {
  const { data: sales, isLoading, error } = useFinanceLedgerQuery(options);

  const summary = useMemo((): LedgerSummary => {
    if (!sales || sales.length === 0) {
      return {
        totalTransactions: 0,
        producerGross: 0,
        affiliateCost: 0,
        coproducerCost: 0,
        platformCost: 0,
        refunds: 0,
        netRevenue: 0,
        uniqueCustomers: 0,
        avgTicket: 0,
      };
    }

    const producerGross = sales.reduce((sum, s) => sum + s.producer_gross, 0);
    const affiliateCost = sales.reduce((sum, s) => sum + s.affiliate_cost, 0);
    const coproducerCost = sales.reduce((sum, s) => sum + s.coproducer_cost, 0);
    const platformCost = sales.reduce((sum, s) => sum + s.platform_cost, 0);
    const refunds = sales.reduce((sum, s) => sum + s.refunds, 0);
    const netRevenue = sales.reduce((sum, s) => sum + s.net_revenue, 0);
    const uniqueCustomers = new Set(sales.map(s => s.buyer_email).filter(Boolean)).size;
    const avgTicket = sales.length > 0 ? netRevenue / sales.length : 0;

    return {
      totalTransactions: sales.length,
      producerGross,
      affiliateCost,
      coproducerCost,
      platformCost,
      refunds,
      netRevenue,
      uniqueCustomers,
      avgTicket,
    };
  }, [sales]);

  return {
    summary,
    sales,
    isLoading,
    error,
  };
}
