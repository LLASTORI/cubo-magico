import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

export interface CustomerJourney {
  buyerEmail: string;
  buyerName: string;
  firstPurchaseDate: Date;
  entryProduct: string;
  entryOfferCode: string;
  entryFunnelId: string | null;
  entryFunnelName: string | null;
  totalPurchases: number;
  totalSpent: number;
  purchases: CustomerPurchase[];
  subsequentProducts: string[];
  previousProducts: string[];
  daysSinceFirstPurchase: number;
  avgTimeBetweenPurchases: number | null;
}

export interface CustomerPurchase {
  transactionId: string;
  productName: string;
  offerCode: string;
  funnelId: string | null;
  funnelName: string | null;
  saleDate: Date;
  totalPrice: number;
  status: string;
  isEntry: boolean;
  isTarget: boolean;
}

export interface EntryFilter {
  type: 'product' | 'funnel' | 'offer';
  values: string[];
}

export interface TargetFilter {
  type: 'product' | 'funnel' | 'offer';
  values: string[];
}

export interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
}

export interface CohortMetrics {
  entryProduct: string;
  entryFunnel: string | null;
  customerCount: number;
  avgLTV: number;
  avgPurchases: number;
  repeatRate: number;
  totalRevenue: number;
}

export interface OriginMetrics {
  product: string;
  funnel: string | null;
  customerCount: number;
  percentage: number;
  avgLTVAfter: number;
}

export interface JourneyMetrics {
  totalCustomers: number;
  avgLTV: number;
  avgPurchases: number;
  repeatCustomerRate: number;
  topSubsequentProducts: { product: string; count: number; percentage: number }[];
  cohortMetrics: CohortMetrics[];
  originMetrics: OriginMetrics[];
}

interface Sale {
  transaction_id: string;
  buyer_email: string;
  buyer_name: string | null;
  product_name: string;
  offer_code: string | null;
  sale_date: string;
  total_price_brl: number | null;
  status: string;
}

interface OfferMapping {
  codigo_oferta: string;
  funnel_id: string | null;
  nome_produto: string;
  nome_posicao?: string | null;
}

interface Funnel {
  id: string;
  name: string;
}

export interface CRMFilters {
  entryFilter: EntryFilter | null;
  targetFilter: TargetFilter | null;
  dateFilter: DateFilter;
  statusFilter: string[];
}

export const DEFAULT_STATUS_FILTER = ['APPROVED', 'COMPLETE'];

export interface StatusBreakdown {
  status: string;
  count: number;
  uniqueClients: number;
}

export interface GenericBreakdown {
  key: string;
  label: string;
  count: number;
  uniqueClients: number;
}

export function useCRMJourneyData(filters: CRMFilters) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const { entryFilter, targetFilter, dateFilter, statusFilter } = filters;

  // Fetch all sales for breakdowns (no status filter)
  const { data: allSalesForBreakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['crm-all-sales-breakdown', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allSales: { status: string; buyer_email: string; product_name: string; offer_code: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('status, buyer_email, product_name, offer_code')
          .eq('project_id', projectId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allSales.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allSales;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all sales for the project (filtered by status)
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['crm-sales', projectId, statusFilter],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allSales: Sale[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('hotmart_sales')
          .select('transaction_id, buyer_email, buyer_name, product_name, offer_code, sale_date, total_price_brl, status')
          .eq('project_id', projectId);
        
        if (statusFilter.length > 0) {
          const statusValuesForQuery = statusFilter.flatMap((s) => [s, s.toLowerCase()]);
          query = query.in('status', statusValuesForQuery);
        }
        
        const { data, error } = await query
          .order('sale_date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allSales.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allSales;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch offer mappings
  const { data: mappingsData, isLoading: loadingMappings } = useQuery({
    queryKey: ['crm-mappings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('codigo_oferta, funnel_id, nome_produto, nome_posicao')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []) as OfferMapping[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch funnels
  const { data: funnelsData, isLoading: loadingFunnels } = useQuery({
    queryKey: ['crm-funnels', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []) as Funnel[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    if (!salesData) return [];
    const products = new Set(salesData.map(s => s.product_name));
    return Array.from(products).sort();
  }, [salesData]);

  // Get unique funnels for filter
  const uniqueFunnels = useMemo(() => {
    if (!funnelsData) return [];
    return funnelsData.map(f => ({ id: f.id, name: f.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [funnelsData]);

  // Create mapping lookups
  const offerToFunnel = useMemo(() => {
    if (!mappingsData) return new Map<string, string>();
    const map = new Map<string, string>();
    mappingsData.forEach(m => {
      if (m.codigo_oferta && m.funnel_id) {
        map.set(m.codigo_oferta, m.funnel_id);
      }
    });
    return map;
  }, [mappingsData]);

  const funnelNames = useMemo(() => {
    if (!funnelsData) return new Map<string, string>();
    const map = new Map<string, string>();
    funnelsData.forEach(f => {
      map.set(f.id, f.name);
    });
    return map;
  }, [funnelsData]);

  // Calculate all breakdowns from the unfiltered data
  const breakdowns = useMemo(() => {
    const statusLabels: Record<string, string> = {
      'APPROVED': 'Aprovado',
      'COMPLETE': 'Completo',
      'CANCELED': 'Cancelado',
      'REFUNDED': 'Reembolsado',
      'CHARGEBACK': 'Chargeback',
      'EXPIRED': 'Expirado',
      'OVERDUE': 'Vencido',
      'STARTED': 'Iniciado',
      'PRINTED_BILLET': 'Boleto Impresso',
      'WAITING_PAYMENT': 'Aguardando Pagamento',
    };

    if (!allSalesForBreakdown || allSalesForBreakdown.length === 0) {
      return {
        statusBreakdown: [] as GenericBreakdown[],
        productBreakdown: [] as GenericBreakdown[],
        offerBreakdown: [] as GenericBreakdown[],
        funnelBreakdown: [] as GenericBreakdown[],
        positionBreakdown: [] as GenericBreakdown[],
      };
    }

    const createBreakdown = (
      keyFn: (sale: typeof allSalesForBreakdown[0]) => string | null,
      labelFn: (key: string) => string
    ): GenericBreakdown[] => {
      const map = new Map<string, { count: number; emails: Set<string> }>();
      
      for (const sale of allSalesForBreakdown) {
        const key = keyFn(sale);
        if (!key) continue;
        
        if (!map.has(key)) {
          map.set(key, { count: 0, emails: new Set() });
        }
        const data = map.get(key)!;
        data.count++;
        if (sale.buyer_email) {
          data.emails.add(sale.buyer_email.toLowerCase());
        }
      }

      const result: GenericBreakdown[] = [];
      map.forEach((value, key) => {
        result.push({
          key,
          label: labelFn(key),
          count: value.count,
          uniqueClients: value.emails.size,
        });
      });

      return result.sort((a, b) => b.count - a.count);
    };

    // Status breakdown
    const statusBreakdown = createBreakdown(
      (sale) => (sale.status || 'UNKNOWN').toUpperCase(),
      (key) => statusLabels[key] || key
    );

    // Product breakdown
    const productBreakdown = createBreakdown(
      (sale) => sale.product_name,
      (key) => key
    );

    // Offer breakdown
    const offerBreakdown = createBreakdown(
      (sale) => sale.offer_code,
      (key) => key
    );

    // Funnel breakdown
    const funnelBreakdown = createBreakdown(
      (sale) => sale.offer_code ? offerToFunnel.get(sale.offer_code) || null : null,
      (key) => funnelNames.get(key) || key
    );

    // Position breakdown (from mappings)
    const offerToPosition = new Map<string, string>();
    mappingsData?.forEach(m => {
      if (m.codigo_oferta && m.nome_posicao) {
        offerToPosition.set(m.codigo_oferta, m.nome_posicao);
      }
    });

    const positionBreakdown = createBreakdown(
      (sale) => sale.offer_code ? offerToPosition.get(sale.offer_code) || null : null,
      (key) => key
    );

    return {
      statusBreakdown,
      productBreakdown,
      offerBreakdown,
      funnelBreakdown,
      positionBreakdown,
    };
  }, [allSalesForBreakdown, offerToFunnel, funnelNames, mappingsData]);
  // Process customer journeys
  const customerJourneys = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];

    // Group sales by customer email
    const customerSales = new Map<string, Sale[]>();
    salesData.forEach(sale => {
      if (!sale.buyer_email) return;
      const email = sale.buyer_email.toLowerCase();
      if (!customerSales.has(email)) {
        customerSales.set(email, []);
      }
      customerSales.get(email)!.push(sale);
    });

    // Convert to journey objects
    const journeys: CustomerJourney[] = [];
    
    customerSales.forEach((sales, email) => {
      // Sort by date
      const sortedSales = sales.sort((a, b) => 
        new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
      );

      const firstSale = sortedSales[0];
      const entryFunnelId = firstSale.offer_code ? offerToFunnel.get(firstSale.offer_code) || null : null;
      const entryFunnelName = entryFunnelId ? funnelNames.get(entryFunnelId) || null : null;

      // Apply date filter on first purchase date
      if (dateFilter.startDate || dateFilter.endDate) {
        const firstPurchaseDate = new Date(firstSale.sale_date);
        if (dateFilter.startDate && firstPurchaseDate < dateFilter.startDate) return;
        if (dateFilter.endDate) {
          const endOfDay = new Date(dateFilter.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (firstPurchaseDate > endOfDay) return;
        }
      }

      // Apply entry filter
      if (entryFilter) {
        if (entryFilter.type === 'product') {
          if (!entryFilter.values.includes(firstSale.product_name)) return;
        } else if (entryFilter.type === 'funnel') {
          if (!entryFunnelId || !entryFilter.values.includes(entryFunnelId)) return;
        } else if (entryFilter.type === 'offer') {
          if (!firstSale.offer_code || !entryFilter.values.includes(firstSale.offer_code)) return;
        }
      }

      // Check if customer bought target product (for reverse analysis)
      let hasTargetProduct = false;
      let targetPurchaseIndex = -1;
      
      if (targetFilter) {
        for (let i = 0; i < sortedSales.length; i++) {
          const sale = sortedSales[i];
          const saleFunnelId = sale.offer_code ? offerToFunnel.get(sale.offer_code) || null : null;
          
          if (targetFilter.type === 'product' && targetFilter.values.includes(sale.product_name)) {
            hasTargetProduct = true;
            targetPurchaseIndex = i;
            break;
          } else if (targetFilter.type === 'funnel' && saleFunnelId && targetFilter.values.includes(saleFunnelId)) {
            hasTargetProduct = true;
            targetPurchaseIndex = i;
            break;
          } else if (targetFilter.type === 'offer' && sale.offer_code && targetFilter.values.includes(sale.offer_code)) {
            hasTargetProduct = true;
            targetPurchaseIndex = i;
            break;
          }
        }
        
        if (!hasTargetProduct) return;
      }

      const purchases: CustomerPurchase[] = sortedSales.map((sale, index) => ({
        transactionId: sale.transaction_id,
        productName: sale.product_name,
        offerCode: sale.offer_code || '',
        funnelId: sale.offer_code ? offerToFunnel.get(sale.offer_code) || null : null,
        funnelName: sale.offer_code && offerToFunnel.get(sale.offer_code) 
          ? funnelNames.get(offerToFunnel.get(sale.offer_code)!) || null 
          : null,
        saleDate: new Date(sale.sale_date),
        totalPrice: sale.total_price_brl || 0,
        status: sale.status,
        isEntry: index === 0,
        isTarget: targetFilter ? index === targetPurchaseIndex : false,
      }));

      const totalSpent = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
      
      const subsequentProducts = purchases
        .filter(p => !p.isEntry)
        .map(p => p.productName)
        .filter((v, i, a) => a.indexOf(v) === i);

      // Products purchased BEFORE the target (for reverse analysis)
      const previousProducts = targetPurchaseIndex > 0
        ? purchases
            .slice(0, targetPurchaseIndex)
            .map(p => p.productName)
            .filter((v, i, a) => a.indexOf(v) === i)
        : [];

      // Calculate average time between purchases
      let avgTimeBetweenPurchases: number | null = null;
      if (purchases.length > 1) {
        const timeDiffs: number[] = [];
        for (let i = 1; i < purchases.length; i++) {
          const diff = purchases[i].saleDate.getTime() - purchases[i-1].saleDate.getTime();
          timeDiffs.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
        }
        avgTimeBetweenPurchases = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      }

      journeys.push({
        buyerEmail: email,
        buyerName: firstSale.buyer_name || email.split('@')[0],
        firstPurchaseDate: new Date(firstSale.sale_date),
        entryProduct: firstSale.product_name,
        entryOfferCode: firstSale.offer_code || '',
        entryFunnelId,
        entryFunnelName,
        totalPurchases: purchases.length,
        totalSpent,
        purchases,
        subsequentProducts,
        previousProducts,
        daysSinceFirstPurchase: Math.floor((Date.now() - new Date(firstSale.sale_date).getTime()) / (1000 * 60 * 60 * 24)),
        avgTimeBetweenPurchases,
      });
    });

    return journeys.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [salesData, entryFilter, targetFilter, dateFilter, offerToFunnel, funnelNames]);

  // Calculate journey metrics
  const journeyMetrics = useMemo((): JourneyMetrics | null => {
    if (customerJourneys.length === 0) return null;

    const totalCustomers = customerJourneys.length;
    const totalRevenue = customerJourneys.reduce((sum, j) => sum + j.totalSpent, 0);
    const avgLTV = totalRevenue / totalCustomers;
    const avgPurchases = customerJourneys.reduce((sum, j) => sum + j.totalPurchases, 0) / totalCustomers;
    const repeatCustomers = customerJourneys.filter(j => j.totalPurchases > 1).length;
    const repeatCustomerRate = (repeatCustomers / totalCustomers) * 100;

    // Top subsequent products
    const productCounts = new Map<string, number>();
    customerJourneys.forEach(j => {
      j.subsequentProducts.forEach(p => {
        productCounts.set(p, (productCounts.get(p) || 0) + 1);
      });
    });

    const topSubsequentProducts = Array.from(productCounts.entries())
      .map(([product, count]) => ({
        product,
        count,
        percentage: (count / totalCustomers) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cohort metrics by entry product/funnel
    const cohortMap = new Map<string, CustomerJourney[]>();
    customerJourneys.forEach(j => {
      const key = j.entryFunnelId 
        ? `funnel:${j.entryFunnelId}` 
        : `product:${j.entryProduct}`;
      if (!cohortMap.has(key)) {
        cohortMap.set(key, []);
      }
      cohortMap.get(key)!.push(j);
    });

    const cohortMetrics: CohortMetrics[] = Array.from(cohortMap.entries()).map(([key, journeys]) => {
      const [type, value] = key.split(':');
      const cohortRevenue = journeys.reduce((sum, j) => sum + j.totalSpent, 0);
      const cohortRepeatCustomers = journeys.filter(j => j.totalPurchases > 1).length;

      return {
        entryProduct: type === 'product' ? value : journeys[0]?.entryProduct || '',
        entryFunnel: type === 'funnel' ? funnelNames.get(value) || value : null,
        customerCount: journeys.length,
        avgLTV: cohortRevenue / journeys.length,
        avgPurchases: journeys.reduce((sum, j) => sum + j.totalPurchases, 0) / journeys.length,
        repeatRate: (cohortRepeatCustomers / journeys.length) * 100,
        totalRevenue: cohortRevenue,
      };
    }).sort((a, b) => b.avgLTV - a.avgLTV);

    // Origin metrics (for reverse analysis - where customers came from before target product)
    const originMap = new Map<string, { journeys: CustomerJourney[], ltvAfterTarget: number[] }>();
    
    if (targetFilter) {
      customerJourneys.forEach(j => {
        // Group by entry point
        const key = j.entryFunnelId 
          ? `funnel:${j.entryFunnelId}` 
          : `product:${j.entryProduct}`;
        
        if (!originMap.has(key)) {
          originMap.set(key, { journeys: [], ltvAfterTarget: [] });
        }
        
        // Calculate LTV after target purchase
        const targetIndex = j.purchases.findIndex(p => p.isTarget);
        const ltvAfter = targetIndex >= 0 
          ? j.purchases.slice(targetIndex).reduce((sum, p) => sum + p.totalPrice, 0)
          : 0;
        
        originMap.get(key)!.journeys.push(j);
        originMap.get(key)!.ltvAfterTarget.push(ltvAfter);
      });
    }

    const originMetrics: OriginMetrics[] = Array.from(originMap.entries()).map(([key, data]) => {
      const [type, value] = key.split(':');
      const avgLTVAfter = data.ltvAfterTarget.length > 0
        ? data.ltvAfterTarget.reduce((a, b) => a + b, 0) / data.ltvAfterTarget.length
        : 0;

      return {
        product: type === 'product' ? value : data.journeys[0]?.entryProduct || '',
        funnel: type === 'funnel' ? funnelNames.get(value) || value : null,
        customerCount: data.journeys.length,
        percentage: (data.journeys.length / totalCustomers) * 100,
        avgLTVAfter,
      };
    }).sort((a, b) => b.customerCount - a.customerCount);

    return {
      totalCustomers,
      avgLTV,
      avgPurchases,
      repeatCustomerRate,
      topSubsequentProducts,
      cohortMetrics,
      originMetrics,
    };
  }, [customerJourneys, funnelNames, targetFilter]);

  return {
    customerJourneys,
    journeyMetrics,
    uniqueProducts,
    uniqueFunnels,
    statusBreakdown: breakdowns.statusBreakdown,
    productBreakdown: breakdowns.productBreakdown,
    offerBreakdown: breakdowns.offerBreakdown,
    funnelBreakdown: breakdowns.funnelBreakdown,
    positionBreakdown: breakdowns.positionBreakdown,
    isLoading: loadingSales || loadingMappings || loadingFunnels,
    isLoadingBreakdown: loadingBreakdown,
  };
}
