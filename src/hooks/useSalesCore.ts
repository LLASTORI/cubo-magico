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
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UseSalesCoreResult {
  sales: CoreSaleItem[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  fetchSales: (projectId: string, filters: FilterParams, page?: number, pageSize?: number) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Parse UTM data from Hotmart's SCK format (checkout_origin or sck field)
 * Format: Source|Conjunto|Campanha|Posicionamento|Criativo
 */
const parseHotmartSCK = (sck: string | null | undefined) => {
  if (!sck) return {};
  
  const parts = sck.split('|');
  return {
    utmSource: parts[0] || undefined,
    utmAdset: parts[1] || undefined,
    utmCampaign: parts[2] || undefined,
    utmPlacement: parts[3] || undefined,
    utmCreative: parts[4] || undefined,
  };
};

/**
 * Extract transaction_id from Core's provider_event_id
 * Formats: 
 *   - hotmart_HP0768912179C2_PURCHASE_APPROVED -> HP0768912179C2
 *   - hotmart_HP0768912179_APPROVED -> HP0768912179
 */
const extractTransactionId = (providerEventId: string): string => {
  // Match hotmart_XXXXX_ pattern
  const match = providerEventId?.match(/hotmart_([A-Z0-9]+)_/);
  return match ? match[1] : providerEventId;
};

/**
 * Hook to fetch sales data using Financial Core + Hotmart Legacy JOIN
 * 
 * Strategy:
 * 1. Query sales_core_events for financial data (event_type, gross_amount, economic_day)
 * 2. JOIN with hotmart_sales for identity data (buyer, product, UTMs)
 * 3. Use hotmart_sales.net_revenue as fallback when Core net_amount = 0
 * 4. GROUP BY transaction_id to avoid duplicates
 * 5. Support real pagination with total count
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

      // Step 1: First get total count with exact count
      let countQuery = supabase
        .from('sales_core_events')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .eq('is_active', true)
        .gte('economic_day', filters.startDate)
        .lte('economic_day', filters.endDate);

      // Filter by event type (status mapping)
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
          countQuery = countQuery.eq('event_type', uniqueEventTypes[0]);
        } else if (uniqueEventTypes.length > 1) {
          countQuery = countQuery.in('event_type', uniqueEventTypes);
        }
      } else {
        // Default to purchases only
        countQuery = countQuery.eq('event_type', 'purchase');
      }

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
        return;
      }

      // Step 2: Fetch Core events with pagination
      let coreQuery = supabase
        .from('sales_core_events')
        .select('*')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .eq('is_active', true)
        .gte('economic_day', filters.startDate)
        .lte('economic_day', filters.endDate)
        .order('economic_day', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply same event type filter
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
          coreQuery = coreQuery.eq('event_type', uniqueEventTypes[0]);
        } else if (uniqueEventTypes.length > 1) {
          coreQuery = coreQuery.in('event_type', uniqueEventTypes);
        }
      } else {
        coreQuery = coreQuery.eq('event_type', 'purchase');
      }

      const { data: coreData, error: coreError } = await coreQuery;

      if (coreError) {
        throw new Error(coreError.message);
      }

      if (!coreData || coreData.length === 0) {
        setSales([]);
        return;
      }

      // Step 3: Extract transaction IDs from Core and fetch Legacy data
      const transactionIds = coreData.map((row: any) => extractTransactionId(row.provider_event_id));
      const uniqueTransactionIds = [...new Set(transactionIds)];

      // Fetch hotmart_sales for these transactions (identity + UTM data)
      const { data: legacyData, error: legacyError } = await supabase
        .from('hotmart_sales')
        .select(`
          transaction_id,
          buyer_name,
          buyer_email,
          product_name,
          offer_code,
          status,
          net_revenue,
          total_price,
          checkout_origin,
          utm_source,
          utm_campaign_id,
          utm_adset_name,
          utm_placement,
          utm_creative
        `)
        .eq('project_id', projectId)
        .in('transaction_id', uniqueTransactionIds);

      if (legacyError) {
        console.warn('Warning: Could not fetch legacy data for enrichment:', legacyError);
      }

      // Create lookup map by transaction_id
      const legacyMap = new Map<string, any>();
      if (legacyData) {
        for (const row of legacyData) {
          legacyMap.set(row.transaction_id, row);
        }
      }

      // Step 4: Group Core events by transaction_id and take the most recent
      const groupedByTx = new Map<string, any>();
      for (const coreRow of coreData) {
        const txId = extractTransactionId(coreRow.provider_event_id);
        const existing = groupedByTx.get(txId);
        
        // Keep the most recent by occurred_at
        if (!existing || new Date(coreRow.occurred_at) > new Date(existing.occurred_at)) {
          groupedByTx.set(txId, coreRow);
        }
      }

      // Step 5: Merge Core + Legacy data
      const mergedSales: CoreSaleItem[] = [];
      
      for (const [txId, coreRow] of groupedByTx) {
        const legacy = legacyMap.get(txId);
        
        // Financial data from Core (with Legacy fallback for net_amount)
        const grossAmount = Number(coreRow.gross_amount) || 0;
        let netAmount = Number(coreRow.net_amount) || 0;
        
        // CRITICAL: If Core net_amount is 0, try Legacy net_revenue as fallback
        if (netAmount === 0 && legacy?.net_revenue) {
          netAmount = Number(legacy.net_revenue) || 0;
        }
        
        // If still 0 and status is purchase, estimate using typical Hotmart fee (~54% producer commission)
        if (netAmount === 0 && grossAmount > 0 && coreRow.event_type === 'purchase') {
          netAmount = grossAmount * 0.46;
        }
        
        // Identity data from Legacy (with Core raw_payload as fallback)
        let buyer = '-';
        let product = '-';
        let offerCode: string | undefined;
        let utmSource: string | undefined;
        let utmCampaign: string | undefined;
        let utmAdset: string | undefined;
        let utmPlacement: string | undefined;
        let utmCreative: string | undefined;
        let status = coreRow.event_type?.toUpperCase() || 'UNKNOWN';
        
        if (legacy) {
          buyer = legacy.buyer_name || legacy.buyer_email || '-';
          product = legacy.product_name || '-';
          offerCode = legacy.offer_code || undefined;
          status = legacy.status || status;
          
          utmSource = legacy.utm_source || undefined;
          utmCampaign = legacy.utm_campaign_id || undefined;
          utmAdset = legacy.utm_adset_name || undefined;
          utmPlacement = legacy.utm_placement || undefined;
          utmCreative = legacy.utm_creative || undefined;
          
          if (!utmSource && legacy.checkout_origin) {
            const sckData = parseHotmartSCK(legacy.checkout_origin);
            utmSource = sckData.utmSource;
            utmCampaign = utmCampaign || sckData.utmCampaign;
            utmAdset = utmAdset || sckData.utmAdset;
            utmPlacement = utmPlacement || sckData.utmPlacement;
            utmCreative = utmCreative || sckData.utmCreative;
          }
        } else {
          const rawData = coreRow.raw_payload?.data || {};
          const buyerData = rawData.buyer || {};
          const productData = rawData.product || {};
          const purchaseData = rawData.purchase || {};
          const offerData = purchaseData.offer || {};
          
          buyer = buyerData.name || buyerData.email || '-';
          product = productData.name || '-';
          offerCode = offerData.code || undefined;
          status = purchaseData.status || status;
          
          const attribution = coreRow.attribution || {};
          if (attribution.hotmart_checkout_source) {
            const sckData = parseHotmartSCK(attribution.hotmart_checkout_source);
            utmSource = sckData.utmSource;
            utmCampaign = sckData.utmCampaign;
            utmAdset = sckData.utmAdset;
            utmPlacement = sckData.utmPlacement;
            utmCreative = sckData.utmCreative;
          }
        }

        const economicDay = coreRow.economic_day;
        const formattedDate = economicDay 
          ? new Date(economicDay + 'T12:00:00').toLocaleDateString('pt-BR')
          : '-';

        mergedSales.push({
          id: coreRow.id,
          transaction: txId,
          product,
          buyer,
          grossAmount,
          netAmount,
          status,
          economicDay,
          date: formattedDate,
          offerCode,
          currency: coreRow.currency || 'BRL',
          utmSource,
          utmCampaign,
          utmAdset,
          utmPlacement,
          utmCreative,
        });
      }

      // Step 6: Apply client-side filters (for UTM and funnel filters that can't be done server-side)
      let filteredSales = mergedSales;

      // Filter by funnel (using offer mappings)
      if (filters.idFunil && filters.idFunil.length > 0) {
        const { data: offerMappings } = await supabase
          .from('offer_mappings')
          .select('codigo_oferta')
          .eq('project_id', projectId)
          .in('id_funil', filters.idFunil);

        if (offerMappings) {
          const validOfferCodes = offerMappings.map(m => m.codigo_oferta);
          filteredSales = filteredSales.filter(sale => 
            sale.offerCode && validOfferCodes.includes(sale.offerCode)
          );
        }
      }

      // Filter by product name
      if (filters.productName && filters.productName.length > 0) {
        filteredSales = filteredSales.filter(sale =>
          filters.productName!.includes(sale.product)
        );
      }

      // Filter by offer code
      if (filters.offerCode && filters.offerCode.length > 0) {
        filteredSales = filteredSales.filter(sale =>
          sale.offerCode && filters.offerCode!.includes(sale.offerCode)
        );
      }

      // Apply UTM filters (partial match)
      if (filters.utmSource) {
        filteredSales = filteredSales.filter(sale =>
          sale.utmSource?.toLowerCase().includes(filters.utmSource!.toLowerCase())
        );
      }
      if (filters.utmCampaign) {
        filteredSales = filteredSales.filter(sale =>
          sale.utmCampaign?.toLowerCase().includes(filters.utmCampaign!.toLowerCase())
        );
      }
      if (filters.utmAdset) {
        filteredSales = filteredSales.filter(sale =>
          sale.utmAdset?.toLowerCase().includes(filters.utmAdset!.toLowerCase())
        );
      }
      if (filters.utmPlacement) {
        filteredSales = filteredSales.filter(sale =>
          sale.utmPlacement?.toLowerCase().includes(filters.utmPlacement!.toLowerCase())
        );
      }
      if (filters.utmCreative) {
        filteredSales = filteredSales.filter(sale =>
          sale.utmCreative?.toLowerCase().includes(filters.utmCreative!.toLowerCase())
        );
      }

      // Sort by economic_day descending (most recent first)
      filteredSales.sort((a, b) => {
        if (!a.economicDay || !b.economicDay) return 0;
        return b.economicDay.localeCompare(a.economicDay);
      });

      setSales(filteredSales);
    } catch (err: any) {
      console.error('Error fetching sales from Core:', err);
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
      // Reset to page 1 when changing page size
      fetchSales(currentProjectId, currentFilters, 1, size);
    }
  }, [currentProjectId, currentFilters, fetchSales]);

  return {
    sales,
    loading,
    error,
    pagination,
    fetchSales,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  };
}
