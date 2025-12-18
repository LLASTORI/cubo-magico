import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface UseFunnelHealthMetricsProps {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
}

interface AbandonedSale {
  transaction_id: string;
  product_code: string | null;
  product_name: string;
  offer_code: string | null;
  total_price_brl: number | null;
  buyer_email: string | null;
  sale_date: string | null;
}

interface RefundChargebackSale {
  transaction_id: string;
  offer_code: string | null;
  total_price_brl: number | null;
  buyer_email: string | null;
  sale_date: string | null;
  status: string;
}

interface OfferMapping {
  id_funil: string;
  funnel_id: string | null;
  codigo_oferta: string | null;
  tipo_posicao: string | null;
  id_produto: string | null;
}

export interface FunnelHealthData {
  funnelId: string;
  funnelName: string;
  // Abandono
  totalAbandonos: number;
  valorAbandonos: number;
  abandonosRecuperados: number;
  valorRecuperados: number;
  taxaRecuperacao: number;
  // Reembolso
  totalReembolsos: number;
  valorReembolsado: number;
  taxaReembolso: number;
  // Chargeback
  totalChargebacks: number;
  valorChargeback: number;
  taxaChargeback: number;
  // Cancelamentos
  totalCancelamentos: number;
  valorCancelado: number;
  taxaCancelamento: number;
  // Vendas aprovadas (para referência)
  vendasAprovadas: number;
  // Flag para indicar se abandono é atribuível
  abandonoAtribuivel: boolean;
}

export const useFunnelHealthMetrics = ({ projectId, startDate, endDate }: UseFunnelHealthMetricsProps) => {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  const enabled = !!projectId;

  // Timezone adjustment for Brazil (UTC-3)
  const startTimestamp = `${startDateStr}T03:00:00.000Z`;
  const endDateObj = new Date(endDateStr);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const adjustedEndDate = endDateObj.toISOString().split('T')[0];
  const adjustedEndTimestamp = `${adjustedEndDate}T02:59:59.999Z`;

  // Fetch perpetuo funnels
  const funnelsQuery = useQuery({
    queryKey: ['funnels-health-perpetuo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', projectId!)
        .eq('funnel_type', 'perpetuo');
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch offer mappings with product codes
  const mappingsQuery = useQuery({
    queryKey: ['mappings-health', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id_funil, funnel_id, codigo_oferta, tipo_posicao, id_produto')
        .eq('project_id', projectId!)
        .eq('status', 'Ativo');
      if (error) throw error;
      return (data as OfferMapping[]) || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch abandoned sales (for the period)
  const abandonedQuery = useQuery({
    queryKey: ['abandoned-sales', projectId, startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('transaction_id, product_code, product_name, offer_code, total_price_brl, buyer_email, sale_date')
        .eq('project_id', projectId!)
        .eq('status', 'ABANDONED')
        .gte('sale_date', startTimestamp)
        .lte('sale_date', adjustedEndTimestamp);
      if (error) throw error;
      return (data as AbandonedSale[]) || [];
    },
    enabled,
    staleTime: 30 * 1000,
  });

  // Fetch refunded, chargeback, cancelled sales (for the period)
  const problemSalesQuery = useQuery({
    queryKey: ['problem-sales', projectId, startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('transaction_id, offer_code, total_price_brl, buyer_email, sale_date, status')
        .eq('project_id', projectId!)
        .in('status', ['REFUNDED', 'CHARGEBACK', 'CANCELLED'])
        .gte('sale_date', startTimestamp)
        .lte('sale_date', adjustedEndTimestamp);
      if (error) throw error;
      return (data as RefundChargebackSale[]) || [];
    },
    enabled,
    staleTime: 30 * 1000,
  });

  // Fetch approved sales (for calculating rates and checking recovery)
  const approvedSalesQuery = useQuery({
    queryKey: ['approved-sales-health', projectId, startDateStr, endDateStr],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: { offer_code: string | null; buyer_email: string | null; product_code: string | null }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('offer_code, buyer_email, product_code')
          .eq('project_id', projectId!)
          .in('status', ['APPROVED', 'COMPLETE'])
          .gte('sale_date', startTimestamp)
          .lte('sale_date', adjustedEndTimestamp)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  // Calculate health metrics per funnel
  const healthMetrics = useMemo((): FunnelHealthData[] => {
    const funnels = funnelsQuery.data || [];
    const mappings = mappingsQuery.data || [];
    const abandonedSales = abandonedQuery.data || [];
    const problemSales = problemSalesQuery.data || [];
    const approvedSales = approvedSalesQuery.data || [];

    if (!funnels.length || !mappings.length) return [];

    // Build product_code → funnel mapping for FRONT offers
    // Only map when product_code belongs to a SINGLE funnel's FRONT
    const productCodeToFunnelCount = new Map<string, Set<string>>();
    const productCodeToFunnel = new Map<string, { funnelId: string; funnelName: string }>();

    // First pass: count how many funnels each product_code appears in as FRONT
    mappings.forEach(m => {
      if (m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE') {
        // Clean product code (remove "ID " prefix if present)
        const productCode = m.id_produto?.replace(/^ID\s*/i, '').trim();
        if (!productCode) return;

        // Find the funnel for this mapping
        const funnel = funnels.find(f => 
          m.funnel_id ? m.funnel_id === f.id : m.id_funil === f.name
        );
        if (!funnel) return;

        if (!productCodeToFunnelCount.has(productCode)) {
          productCodeToFunnelCount.set(productCode, new Set());
        }
        productCodeToFunnelCount.get(productCode)!.add(funnel.id);
      }
    });

    // Second pass: only create mapping for product_codes in a SINGLE funnel
    mappings.forEach(m => {
      if (m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE') {
        const productCode = m.id_produto?.replace(/^ID\s*/i, '').trim();
        if (!productCode) return;

        const funnelSet = productCodeToFunnelCount.get(productCode);
        if (funnelSet && funnelSet.size === 1) {
          const funnel = funnels.find(f => 
            m.funnel_id ? m.funnel_id === f.id : m.id_funil === f.name
          );
          if (funnel) {
            productCodeToFunnel.set(productCode, { funnelId: funnel.id, funnelName: funnel.name });
          }
        }
      }
    });

    // Build offer_code → funnel mapping (for all offers)
    const offerCodeToFunnel = new Map<string, { funnelId: string; funnelName: string }>();
    mappings.forEach(m => {
      if (!m.codigo_oferta) return;
      const funnel = funnels.find(f => 
        m.funnel_id ? m.funnel_id === f.id : m.id_funil === f.name
      );
      if (funnel) {
        offerCodeToFunnel.set(m.codigo_oferta, { funnelId: funnel.id, funnelName: funnel.name });
      }
    });

    // Get unique buyers with approved purchases (for recovery detection)
    const buyersWithPurchases = new Map<string, Set<string>>();
    approvedSales.forEach(sale => {
      if (sale.buyer_email && sale.product_code) {
        if (!buyersWithPurchases.has(sale.buyer_email)) {
          buyersWithPurchases.set(sale.buyer_email, new Set());
        }
        buyersWithPurchases.get(sale.buyer_email)!.add(sale.product_code);
      }
    });

    // Initialize metrics for each funnel
    const metricsMap = new Map<string, FunnelHealthData>();
    funnels.forEach(funnel => {
      metricsMap.set(funnel.id, {
        funnelId: funnel.id,
        funnelName: funnel.name,
        totalAbandonos: 0,
        valorAbandonos: 0,
        abandonosRecuperados: 0,
        valorRecuperados: 0,
        taxaRecuperacao: 0,
        totalReembolsos: 0,
        valorReembolsado: 0,
        taxaReembolso: 0,
        totalChargebacks: 0,
        valorChargeback: 0,
        taxaChargeback: 0,
        totalCancelamentos: 0,
        valorCancelado: 0,
        taxaCancelamento: 0,
        vendasAprovadas: 0,
        abandonoAtribuivel: true,
      });
    });

    // Count approved sales per funnel (for rate calculation)
    approvedSales.forEach(sale => {
      if (!sale.offer_code) return;
      const funnelInfo = offerCodeToFunnel.get(sale.offer_code);
      if (funnelInfo) {
        const metrics = metricsMap.get(funnelInfo.funnelId);
        if (metrics) {
          metrics.vendasAprovadas++;
        }
      }
    });

    // Process abandoned sales
    abandonedSales.forEach(sale => {
      const productCode = sale.product_code;
      if (!productCode) return;

      const funnelInfo = productCodeToFunnel.get(productCode);
      if (!funnelInfo) return; // Can't attribute - product in multiple funnels or not mapped

      const metrics = metricsMap.get(funnelInfo.funnelId);
      if (!metrics) return;

      metrics.totalAbandonos++;
      metrics.valorAbandonos += sale.total_price_brl || 0;

      // Check if this abandonment was recovered (same buyer purchased the same product)
      if (sale.buyer_email) {
        const buyerPurchases = buyersWithPurchases.get(sale.buyer_email);
        if (buyerPurchases && buyerPurchases.has(productCode)) {
          metrics.abandonosRecuperados++;
          metrics.valorRecuperados += sale.total_price_brl || 0;
        }
      }
    });

    // Process refunded, chargeback, cancelled sales
    problemSales.forEach(sale => {
      if (!sale.offer_code) return;

      const funnelInfo = offerCodeToFunnel.get(sale.offer_code);
      if (!funnelInfo) return;

      const metrics = metricsMap.get(funnelInfo.funnelId);
      if (!metrics) return;

      const value = sale.total_price_brl || 0;

      switch (sale.status) {
        case 'REFUNDED':
          metrics.totalReembolsos++;
          metrics.valorReembolsado += value;
          break;
        case 'CHARGEBACK':
          metrics.totalChargebacks++;
          metrics.valorChargeback += value;
          break;
        case 'CANCELLED':
          metrics.totalCancelamentos++;
          metrics.valorCancelado += value;
          break;
      }
    });

    // Calculate rates
    metricsMap.forEach(metrics => {
      // Recovery rate
      metrics.taxaRecuperacao = metrics.totalAbandonos > 0 
        ? (metrics.abandonosRecuperados / metrics.totalAbandonos) * 100 
        : 0;

      // Refund rate (based on approved sales)
      metrics.taxaReembolso = metrics.vendasAprovadas > 0 
        ? (metrics.totalReembolsos / metrics.vendasAprovadas) * 100 
        : 0;

      // Chargeback rate
      metrics.taxaChargeback = metrics.vendasAprovadas > 0 
        ? (metrics.totalChargebacks / metrics.vendasAprovadas) * 100 
        : 0;

      // Cancellation rate
      metrics.taxaCancelamento = metrics.vendasAprovadas > 0 
        ? (metrics.totalCancelamentos / metrics.vendasAprovadas) * 100 
        : 0;
    });

    // Check for non-attributable abandonments
    const nonAttributableAbandonments = abandonedSales.filter(sale => {
      const productCode = sale.product_code;
      return !productCode || !productCodeToFunnel.has(productCode);
    });

    // Mark funnels that might have incomplete abandonment data
    if (nonAttributableAbandonments.length > 0) {
      console.log(`[FunnelHealthMetrics] ${nonAttributableAbandonments.length} abandonments could not be attributed to a single funnel`);
    }

    return Array.from(metricsMap.values()).filter(m => 
      m.totalAbandonos > 0 || 
      m.totalReembolsos > 0 || 
      m.totalChargebacks > 0 || 
      m.totalCancelamentos > 0 ||
      m.vendasAprovadas > 0
    );
  }, [funnelsQuery.data, mappingsQuery.data, abandonedQuery.data, problemSalesQuery.data, approvedSalesQuery.data]);

  // Get global unattributed abandonments count
  const unattributedAbandonments = useMemo(() => {
    const mappings = mappingsQuery.data || [];
    const funnels = funnelsQuery.data || [];
    const abandonedSales = abandonedQuery.data || [];

    // Build the same product_code → funnel mapping
    const productCodeToFunnelCount = new Map<string, Set<string>>();
    mappings.forEach(m => {
      if (m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE') {
        const productCode = m.id_produto?.replace(/^ID\s*/i, '').trim();
        if (!productCode) return;
        const funnel = funnels.find(f => m.funnel_id ? m.funnel_id === f.id : m.id_funil === f.name);
        if (!funnel) return;
        if (!productCodeToFunnelCount.has(productCode)) {
          productCodeToFunnelCount.set(productCode, new Set());
        }
        productCodeToFunnelCount.get(productCode)!.add(funnel.id);
      }
    });

    const validProductCodes = new Set<string>();
    productCodeToFunnelCount.forEach((funnelSet, productCode) => {
      if (funnelSet.size === 1) {
        validProductCodes.add(productCode);
      }
    });

    return abandonedSales.filter(sale => {
      const productCode = sale.product_code;
      return !productCode || !validProductCodes.has(productCode);
    });
  }, [mappingsQuery.data, funnelsQuery.data, abandonedQuery.data]);

  return {
    healthMetrics,
    unattributedAbandonments,
    isLoading: funnelsQuery.isLoading || mappingsQuery.isLoading || abandonedQuery.isLoading || problemSalesQuery.isLoading || approvedSalesQuery.isLoading,
    refetch: async () => {
      await Promise.all([
        abandonedQuery.refetch(),
        problemSalesQuery.refetch(),
        approvedSalesQuery.refetch(),
      ]);
    },
  };
};
