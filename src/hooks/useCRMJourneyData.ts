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
  totalPurchases: number;
  totalSpent: number;
  purchases: CustomerPurchase[];
  subsequentProducts: string[];
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
}

export interface EntryFilter {
  type: 'product' | 'funnel';
  values: string[];
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

export interface JourneyMetrics {
  totalCustomers: number;
  avgLTV: number;
  avgPurchases: number;
  repeatCustomerRate: number;
  topSubsequentProducts: { product: string; count: number; percentage: number }[];
  cohortMetrics: CohortMetrics[];
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
}

interface Funnel {
  id: string;
  name: string;
}

export function useCRMJourneyData(entryFilter: EntryFilter | null) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // Fetch all sales for the project
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['crm-sales', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allSales: Sale[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('transaction_id, buyer_email, buyer_name, product_name, offer_code, sale_date, total_price_brl, status')
          .eq('project_id', projectId)
          .eq('status', 'APPROVED')
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
        .select('codigo_oferta, funnel_id, nome_produto')
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

      // Apply entry filter
      if (entryFilter) {
        if (entryFilter.type === 'product') {
          if (!entryFilter.values.includes(firstSale.product_name)) return;
        } else if (entryFilter.type === 'funnel') {
          if (!entryFunnelId || !entryFilter.values.includes(entryFunnelId)) return;
        }
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
      }));

      const totalSpent = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
      const subsequentProducts = purchases
        .filter(p => !p.isEntry)
        .map(p => p.productName)
        .filter((v, i, a) => a.indexOf(v) === i);

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
        totalPurchases: purchases.length,
        totalSpent,
        purchases,
        subsequentProducts,
        daysSinceFirstPurchase: Math.floor((Date.now() - new Date(firstSale.sale_date).getTime()) / (1000 * 60 * 60 * 24)),
        avgTimeBetweenPurchases,
      });
    });

    return journeys.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [salesData, entryFilter, offerToFunnel, funnelNames]);

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

    return {
      totalCustomers,
      avgLTV,
      avgPurchases,
      repeatCustomerRate,
      topSubsequentProducts,
      cohortMetrics,
    };
  }, [customerJourneys, funnelNames]);

  return {
    customerJourneys,
    journeyMetrics,
    uniqueProducts,
    uniqueFunnels,
    isLoading: loadingSales || loadingMappings || loadingFunnels,
  };
}
