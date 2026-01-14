import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterParams } from "@/components/SalesFilters";

/**
 * ============================================
 * TIMEZONE UTILITIES FOR ECONOMIC TIMESTAMP
 * ============================================
 * 
 * Converts date strings (YYYY-MM-DD) to ISO timestamps
 * in America/Sao_Paulo timezone for precise date filtering.
 */
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Convert a date string to the START of that day in São Paulo timezone
 * e.g., "2026-01-10" -> "2026-01-10T03:00:00.000Z" (00:00 São Paulo = 03:00 UTC)
 */
function toEconomicTimestampStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  return date.toISOString();
}

/**
 * Convert a date string to the END of that day in São Paulo timezone
 * e.g., "2026-01-10" -> "2026-01-11T02:59:59.999Z" (23:59:59.999 São Paulo)
 */
function toEconomicTimestampEnd(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
  return date.toISOString();
}

/**
 * ============================================
 * FINANCE CORE INTERFACES
 * ============================================
 */

export interface FinanceCoreSale {
  id: string;
  transactionId: string;
  projectId: string;
  
  // Financeiro
  grossAmount: number;
  netAmount: number | null;
  isNetPending: boolean;
  totalPriceBrl: number | null;
  
  // Status
  hotmartStatus: string;
  isValidSale: boolean;
  isCancelled: boolean;
  
  // Temporal
  economicTimestamp: string;
  economicDay: string;
  occurredAt: string;
  confirmationDate: string | null;
  
  // Produto/Oferta
  productCode: string | null;
  productName: string;
  offerCode: string | null;
  currency: string;
  
  // Comprador
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string | null;
  buyerCity: string | null;
  buyerState: string | null;
  buyerCountry: string | null;
  
  // Pagamento
  paymentMethod: string | null;
  paymentType: string | null;
  installments: number | null;
  couponCode: string | null;
  
  // Afiliado
  affiliateCode: string | null;
  affiliateName: string | null;
  
  // UTMs
  utmSource: string | null;
  utmCampaign: string | null;
  utmAdset: string | null;
  utmCreative: string | null;
  utmPlacement: string | null;
  
  // Funil
  funnelId: string | null;
  funnelName: string | null;
  funnelType: string | null;
  tipoPositcao: string | null;
  nomeOferta: string | null;
}

export interface FinanceCorePagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FinanceCoreTotals {
  totalTransactions: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalPendingNet: number; // Transações com net pendente
  totalUniqueCustomers: number;
  loading: boolean;
}

export interface FinanceCoreFilters {
  startDate: string;
  endDate: string;
  funnelIds?: string[];
  productNames?: string[];
  offerCodes?: string[];
  hotmartStatus?: string[];
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  includeValidOnly?: boolean; // Default true - só APPROVED/COMPLETE
  includeCancelled?: boolean; // Default false
}

export interface UseFinanceCoreResult {
  sales: FinanceCoreSale[];
  loading: boolean;
  error: string | null;
  pagination: FinanceCorePagination;
  totals: FinanceCoreTotals;
  fetchSales: (projectId: string, filters: FinanceCoreFilters, page?: number, pageSize?: number) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * ============================================
 * CANONICAL FINANCIAL HOOK
 * ============================================
 * 
 * This hook reads from `finance_core_view`, which is the SINGLE SOURCE OF TRUTH
 * for all financial data in Cubo Mágico.
 * 
 * Architecture (canonical pipeline):
 *   Hotmart API → hotmart_sales → finance_core_view → This Hook → UI
 * 
 * IMPORTANT:
 * - finance_core_view uses ONLY hotmart_sales data
 * - NO fallbacks, NO estimates, NO mathematical percentages
 * - is_net_pending indicates if Hotmart hasn't calculated net yet
 * - is_valid_sale filters for APPROVED/COMPLETE status
 */

const applyFinanceCoreFilters = (
  query: any,
  projectId: string,
  filters: FinanceCoreFilters,
  queryName: string = 'unknown'
) => {
  const startTimestamp = toEconomicTimestampStart(filters.startDate);
  const endTimestamp = toEconomicTimestampEnd(filters.endDate);
  
  console.log(`[${queryName}] Finance filter:`, {
    start: filters.startDate,
    end: filters.endDate,
    startTs: startTimestamp,
    endTs: endTimestamp,
  });
  
  // Base filters
  query = query
    .eq('project_id', projectId)
    .gte('economic_timestamp', startTimestamp)
    .lte('economic_timestamp', endTimestamp);
  
  // Default: only valid sales (APPROVED/COMPLETE)
  const includeValidOnly = filters.includeValidOnly !== false;
  const includeCancelled = filters.includeCancelled === true;
  
  if (includeValidOnly && !includeCancelled) {
    query = query.eq('is_valid_sale', true);
  } else if (includeCancelled && !includeValidOnly) {
    query = query.eq('is_cancelled', true);
  }
  // If both, don't filter by status
  
  // Funnel filter
  if (filters.funnelIds && filters.funnelIds.length > 0) {
    query = query.in('funnel_id', filters.funnelIds);
  }
  
  // Product filter
  if (filters.productNames && filters.productNames.length > 0) {
    query = query.in('product_name', filters.productNames);
  }
  
  // Offer filter
  if (filters.offerCodes && filters.offerCodes.length > 0) {
    query = query.in('offer_code', filters.offerCodes);
  }
  
  // Hotmart status filter (for specific status analysis)
  if (filters.hotmartStatus && filters.hotmartStatus.length > 0) {
    query = query.in('hotmart_status', filters.hotmartStatus);
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
  
  return query;
};

/**
 * Transform raw database row to FinanceCoreSale
 */
function transformToFinanceCoreSale(row: any): FinanceCoreSale {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    projectId: row.project_id,
    
    grossAmount: Number(row.gross_amount) || 0,
    netAmount: row.net_amount != null ? Number(row.net_amount) : null,
    isNetPending: row.is_net_pending === true,
    totalPriceBrl: row.total_price_brl != null ? Number(row.total_price_brl) : null,
    
    hotmartStatus: row.hotmart_status || 'UNKNOWN',
    isValidSale: row.is_valid_sale === true,
    isCancelled: row.is_cancelled === true,
    
    economicTimestamp: row.economic_timestamp,
    economicDay: row.economic_day,
    occurredAt: row.occurred_at,
    confirmationDate: row.confirmation_date,
    
    productCode: row.product_code,
    productName: row.product_name || '-',
    offerCode: row.offer_code,
    currency: row.currency || 'BRL',
    
    buyerEmail: row.buyer_email || '',
    buyerName: row.buyer_name || '-',
    buyerPhone: row.buyer_phone,
    buyerCity: row.buyer_city,
    buyerState: row.buyer_state,
    buyerCountry: row.buyer_country,
    
    paymentMethod: row.payment_method,
    paymentType: row.payment_type,
    installments: row.installments,
    couponCode: row.coupon_code,
    
    affiliateCode: row.affiliate_code,
    affiliateName: row.affiliate_name,
    
    utmSource: row.utm_source,
    utmCampaign: row.utm_campaign,
    utmAdset: row.utm_adset,
    utmCreative: row.utm_creative,
    utmPlacement: row.utm_placement,
    
    funnelId: row.funnel_id,
    funnelName: row.funnel_name,
    funnelType: row.funnel_type,
    tipoPositcao: row.tipo_posicao,
    nomeOferta: row.nome_oferta,
  };
}

/**
 * Main hook for canonical financial data
 */
export function useFinanceCore(): UseFinanceCoreResult {
  const [sales, setSales] = useState<FinanceCoreSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<FinanceCorePagination>({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });
  
  const [totals, setTotals] = useState<FinanceCoreTotals>({
    totalTransactions: 0,
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalPendingNet: 0,
    totalUniqueCustomers: 0,
    loading: false,
  });
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FinanceCoreFilters | null>(null);

  const fetchSales = useCallback(async (
    projectId: string, 
    filters: FinanceCoreFilters, 
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
        .from('finance_core_view')
        .select('id', { count: 'exact', head: true });
      
      countQuery = applyFinanceCoreFilters(countQuery, projectId, filters, 'COUNT');
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        throw new Error(countError.message);
      }

      const total = totalCount || 0;
      const totalPages = Math.ceil(total / pageSize);

      setPagination({ page, pageSize, totalCount: total, totalPages });

      if (total === 0) {
        setSales([]);
        setTotals({
          totalTransactions: 0,
          totalGrossRevenue: 0,
          totalNetRevenue: 0,
          totalPendingNet: 0,
          totalUniqueCustomers: 0,
          loading: false,
        });
        return;
      }

      // QUERY 2: GLOBAL TOTALS (paginated fetch to bypass 1000 limit)
      setTotals(prev => ({ ...prev, loading: true }));
      
      const fetchGlobalTotals = async () => {
        try {
          const allData: any[] = [];
          let totalsPage = 0;
          const totalsPageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            let totalsQuery = supabase
              .from('finance_core_view')
              .select('gross_amount, net_amount, is_net_pending, buyer_email')
              .range(totalsPage * totalsPageSize, (totalsPage + 1) * totalsPageSize - 1);
            
            totalsQuery = applyFinanceCoreFilters(totalsQuery, projectId, filters, 'TOTALS');
            const { data, error: tErr } = await totalsQuery;

            if (tErr) {
              console.warn('Error fetching totals page:', tErr);
              break;
            }

            if (data && data.length > 0) {
              allData.push(...data);
              hasMore = data.length === totalsPageSize;
              totalsPage++;
            } else {
              hasMore = false;
            }
          }

          console.log('[useFinanceCore] TOTALS:', {
            rows: allData.length,
            pages: totalsPage,
          });

          if (allData.length > 0) {
            const totalGross = allData.reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);
            const totalNet = allData.reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0);
            const totalPending = allData.filter(r => r.is_net_pending === true).length;
            const uniqueEmails = new Set(allData.map(r => r.buyer_email).filter(Boolean));
            
            setTotals({
              totalTransactions: allData.length,
              totalGrossRevenue: totalGross,
              totalNetRevenue: totalNet,
              totalPendingNet: totalPending,
              totalUniqueCustomers: uniqueEmails.size,
              loading: false,
            });
          } else {
            setTotals({
              totalTransactions: 0,
              totalGrossRevenue: 0,
              totalNetRevenue: 0,
              totalPendingNet: 0,
              totalUniqueCustomers: 0,
              loading: false,
            });
          }
        } catch (err) {
          console.warn('Error in totals fetch:', err);
          setTotals(prev => ({ ...prev, loading: false }));
        }
      };

      fetchGlobalTotals();

      // QUERY 3: PAGE DATA
      let pageQuery = supabase
        .from('finance_core_view')
        .select(`
          id,
          transaction_id,
          project_id,
          gross_amount,
          net_amount,
          is_net_pending,
          total_price_brl,
          hotmart_status,
          is_valid_sale,
          is_cancelled,
          economic_timestamp,
          economic_day,
          occurred_at,
          confirmation_date,
          product_code,
          product_name,
          offer_code,
          currency,
          buyer_email,
          buyer_name,
          buyer_phone,
          buyer_city,
          buyer_state,
          buyer_country,
          payment_method,
          payment_type,
          installments,
          coupon_code,
          affiliate_code,
          affiliate_name,
          utm_source,
          utm_campaign,
          utm_adset,
          utm_creative,
          utm_placement,
          funnel_id,
          funnel_name,
          funnel_type,
          tipo_posicao,
          nome_oferta
        `)
        .order('economic_day', { ascending: false })
        .order('occurred_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      pageQuery = applyFinanceCoreFilters(pageQuery, projectId, filters, 'PAGE');
      const { data: pageData, error: pageError } = await pageQuery;

      if (pageError) {
        throw new Error(pageError.message);
      }

      if (!pageData || pageData.length === 0) {
        setSales([]);
        return;
      }

      const transformedSales = pageData.map(transformToFinanceCoreSale);
      setSales(transformedSales);
      
    } catch (err: any) {
      console.error('Error fetching from finance_core_view:', err);
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

/**
 * ============================================
 * ADAPTER: Convert FilterParams to FinanceCoreFilters
 * ============================================
 * 
 * This allows existing pages using FilterParams to use finance_core_view
 */
export function toFinanceCoreFilters(filters: FilterParams): FinanceCoreFilters {
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    funnelIds: filters.idFunil,
    productNames: filters.productName,
    offerCodes: filters.offerCode,
    utmSource: filters.utmSource,
    utmCampaign: filters.utmCampaign,
    utmAdset: filters.utmAdset,
    includeValidOnly: true,
    includeCancelled: false,
  };
}

/**
 * ============================================
 * LEGACY ADAPTER: CoreSaleItem compatibility
 * ============================================
 * 
 * Converts FinanceCoreSale to the old CoreSaleItem format
 * for backward compatibility with existing UI components
 */
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
  isNetPending?: boolean;
}

export function toCoreSaleItem(sale: FinanceCoreSale): CoreSaleItem {
  const formattedDate = sale.economicDay 
    ? new Date(sale.economicDay + 'T12:00:00').toLocaleDateString('pt-BR')
    : '-';
    
  return {
    id: sale.id,
    transaction: sale.transactionId,
    product: sale.productName,
    buyer: sale.buyerName,
    grossAmount: sale.grossAmount,
    netAmount: sale.netAmount ?? 0, // Pending = 0 for UI compatibility
    status: sale.hotmartStatus,
    economicDay: sale.economicDay,
    date: formattedDate,
    offerCode: sale.offerCode ?? undefined,
    currency: sale.currency,
    funnelId: sale.funnelId ?? undefined,
    funnelName: sale.funnelName ?? undefined,
    utmSource: sale.utmSource ?? undefined,
    utmCampaign: sale.utmCampaign ?? undefined,
    utmAdset: sale.utmAdset ?? undefined,
    utmPlacement: sale.utmPlacement ?? undefined,
    utmCreative: sale.utmCreative ?? undefined,
    isNetPending: sale.isNetPending,
  };
}
