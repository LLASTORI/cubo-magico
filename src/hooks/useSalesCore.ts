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

export interface UseSalesCoreResult {
  sales: CoreSaleItem[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  fetchSales: (projectId: string, filters: FilterParams) => Promise<void>;
}

/**
 * Parse UTM data from Hotmart's source_sck format
 * Format: Source|Conjunto|Campanha|Posicionamento|Criativo
 */
const parseHotmartSourceSck = (sourceSck: string | null | undefined) => {
  if (!sourceSck) return {};
  
  const parts = sourceSck.split('|');
  return {
    utmSource: parts[0] || undefined,
    utmAdset: parts[1] || undefined,
    utmCampaign: parts[2] || undefined,
    utmPlacement: parts[3] || undefined,
    utmCreative: parts[4] || undefined,
  };
};

/**
 * Hook to fetch sales data from the Financial Core (sales_core_events)
 * Uses economic_day for proper date filtering in Brazil timezone
 */
export function useSalesCore(): UseSalesCoreResult {
  const [sales, setSales] = useState<CoreSaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSales = useCallback(async (projectId: string, filters: FilterParams) => {
    setLoading(true);
    setError(null);

    try {
      // Build the query using economic_day (CRITICAL: not created_at or occurred_at)
      let query = supabase
        .from('sales_core_events')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('is_active', true)
        .gte('economic_day', filters.startDate)
        .lte('economic_day', filters.endDate)
        .order('economic_day', { ascending: false });

      // Filter by event type (status in Core)
      // Map legacy status names to Core event types
      if (filters.transactionStatus && filters.transactionStatus.length > 0) {
        const statusToEventType: Record<string, string> = {
          'approved': 'purchase',
          'complete': 'purchase',
          'refunded': 'refund',
          'chargeback': 'chargeback',
          'cancelled': 'cancellation',
        };
        
        // For approved/complete, use purchase events
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

      // Apply limit
      const limit = Math.min(filters.maxResults || 100, 500);
      query = query.limit(limit);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      if (!data) {
        setSales([]);
        setTotalCount(0);
        return;
      }

      // Map the raw data to our interface
      const mappedSales: CoreSaleItem[] = data.map((row: any) => {
        // Extract buyer info from raw_payload
        const rawData = row.raw_payload?.data || {};
        const buyer = rawData.buyer || {};
        const product = rawData.product || {};
        const purchase = rawData.purchase || {};
        const offer = purchase.offer || {};
        const origin = purchase.origin || {};
        
        // Parse UTM from hotmart_checkout_source in attribution
        const attribution = row.attribution || {};
        const utmData = parseHotmartSourceSck(attribution.hotmart_checkout_source);

        // Format date for display (economic_day is already in correct timezone)
        const economicDay = row.economic_day;
        const formattedDate = economicDay 
          ? new Date(economicDay + 'T12:00:00').toLocaleDateString('pt-BR')
          : '-';

        // Extract transaction ID from provider_event_id
        // Format: hotmart_HP0232573857_PURCHASE_APPROVED -> HP0232573857
        const transactionMatch = row.provider_event_id?.match(/hotmart_([A-Z0-9]+)_/);
        const transaction = transactionMatch ? transactionMatch[1] : row.provider_event_id;

        return {
          id: row.id,
          transaction,
          product: product.name || '-',
          buyer: buyer.name || buyer.email || '-',
          grossAmount: Number(row.gross_amount) || 0,
          netAmount: Number(row.net_amount) || 0,
          status: purchase.status || row.event_type?.toUpperCase() || 'UNKNOWN',
          economicDay,
          date: formattedDate,
          offerCode: offer.code || undefined,
          currency: row.currency || 'BRL',
          ...utmData,
        };
      });

      // Apply client-side filters for fields that require JSON parsing
      let filteredSales = mappedSales;

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

      setSales(filteredSales);
      setTotalCount(count || filteredSales.length);
    } catch (err: any) {
      console.error('Error fetching sales from Core:', err);
      setError(err.message || 'Erro ao carregar dados');
      setSales([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sales,
    loading,
    error,
    totalCount,
    fetchSales,
  };
}
