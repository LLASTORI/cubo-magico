/**
 * SHADOW HOOK: useCRMJourneyOrders
 * 
 * REGRA CANÔNICA DE JORNADA:
 * - 1 pedido (orders) = 1 evento de jornada
 * - Order items são detalhes, não eventos
 * - Ledger não cria eventos de jornada
 * - CRM legacy (useCRMJourneyData) é transitório
 * 
 * Este hook consome crm_journey_orders_view, baseada exclusivamente em Orders Core.
 * Funnel name is resolved at runtime via funnel_id.
 * funnel_id is the canonical link; name is a mutable label.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

// Interface para um item de produto dentro do pedido
export interface JourneyOrderItem {
  item_type: 'main' | 'bump' | 'upsell' | string;
  product_name: string;
  offer_name: string | null;
  base_price: number;
  funnel_id: string | null;
  funnel_name?: string; // Resolvido em runtime
}

// Interface para um evento de jornada (1 pedido = 1 evento)
export interface JourneyOrderEvent {
  order_id: string;
  provider_order_id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string;
  ordered_at: string;
  customer_paid: number;
  producer_net: number;
  currency: string;
  provider: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_placement: string | null;
  utm_creative: string | null;
  items_count: number;
  status: string;
  products: JourneyOrderItem[];
  main_product_name: string | null;
  main_funnel_id: string | null;
  main_funnel_name?: string; // Resolvido em runtime
  purchase_sequence: number;
  is_first_purchase: boolean;
}

// Interface para métricas agregadas do contato
export interface JourneyContactMetrics {
  contact_id: string | null;
  contact_email: string;
  contact_name: string | null;
  total_orders: number;
  total_customer_paid: number;
  total_producer_net: number;
  total_items: number;
  first_order_at: string | null;
  last_order_at: string | null;
  is_repeat_customer: boolean;
  first_product: string | null;
  last_product: string | null;
  first_utm_source: string | null;
}

interface UseCRMJourneyOrdersResult {
  // Eventos de jornada (pedidos)
  journeyEvents: JourneyOrderEvent[];
  
  // Métricas agregadas por contato
  contactMetrics: JourneyContactMetrics[];
  
  // Resumo geral
  summary: {
    totalOrders: number;
    totalCustomers: number;
    totalRevenue: number;
    repeatCustomerRate: number;
    avgOrderValue: number;
  };
  
  // Estados
  isLoading: boolean;
  isLoadingMetrics: boolean;
  error: Error | null;
}

export function useCRMJourneyOrders(contactEmail?: string): UseCRMJourneyOrdersResult {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // Query para buscar eventos de jornada (pedidos)
  const {
    data: journeyEventsRaw,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useQuery({
    queryKey: ['crm-journey-orders', projectId, contactEmail],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('crm_journey_orders_view')
        .select('*')
        .eq('project_id', projectId)
        .order('ordered_at', { ascending: false });

      // Filtrar por contato específico se fornecido
      if (contactEmail) {
        query = query.eq('contact_email', contactEmail);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Query para buscar nomes dos funis
  const funnelIds = journeyEventsRaw
    ? [...new Set(journeyEventsRaw.flatMap(e => {
        const products = (e.products_detail as unknown as JourneyOrderItem[]) || [];
        return products.map(p => p.funnel_id).filter(Boolean);
      }))]
    : [];

  const {
    data: funnelsData,
  } = useQuery({
    queryKey: ['funnels-for-journey', projectId, funnelIds],
    queryFn: async () => {
      if (!projectId || funnelIds.length === 0) return {};

      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', projectId)
        .in('id', funnelIds);

      if (error) throw error;

      const funnelMap: Record<string, string> = {};
      (data || []).forEach(f => {
        funnelMap[f.id] = f.name;
      });
      return funnelMap;
    },
    enabled: !!projectId && funnelIds.length > 0,
  });

  // Query para métricas agregadas
  const {
    data: metricsRaw,
    isLoading: isLoadingMetrics,
  } = useQuery({
    queryKey: ['crm-journey-metrics', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('crm_contact_journey_metrics_view')
        .select('*')
        .eq('project_id', projectId)
        .order('total_customer_paid', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !contactEmail, // Apenas se não estiver filtrando por contato
  });

  // Processar eventos com nomes de funil resolvidos
  const journeyEvents: JourneyOrderEvent[] = (journeyEventsRaw || []).map(event => {
    const productsRaw = (event.products_detail as unknown as JourneyOrderItem[]) || [];
    const products = productsRaw.map(p => ({
      ...p,
      funnel_name: p.funnel_id && funnelsData ? funnelsData[p.funnel_id] : undefined,
    }));

    return {
      order_id: event.order_id,
      provider_order_id: event.provider_order_id,
      contact_id: event.contact_id,
      contact_name: event.contact_name,
      contact_email: event.contact_email,
      ordered_at: event.ordered_at,
      customer_paid: Number(event.customer_paid) || 0,
      producer_net: Number(event.producer_net) || 0,
      currency: event.currency || 'BRL',
      provider: event.provider,
      utm_source: event.utm_source,
      utm_campaign: event.utm_campaign,
      utm_adset: event.utm_adset,
      utm_placement: event.utm_placement,
      utm_creative: event.utm_creative,
      items_count: Number(event.items_count) || 0,
      status: event.status,
      products,
      main_product_name: event.main_product_name,
      main_funnel_id: event.main_funnel_id,
      main_funnel_name: event.main_funnel_id && funnelsData ? funnelsData[event.main_funnel_id] : undefined,
      purchase_sequence: Number(event.purchase_sequence) || 1,
      is_first_purchase: Number(event.purchase_sequence) === 1,
    };
  });

  // Processar métricas
  const contactMetrics: JourneyContactMetrics[] = (metricsRaw || []).map(m => ({
    contact_id: m.contact_id,
    contact_email: m.contact_email,
    contact_name: m.contact_name,
    total_orders: Number(m.total_orders) || 0,
    total_customer_paid: Number(m.total_customer_paid) || 0,
    total_producer_net: Number(m.total_producer_net) || 0,
    total_items: Number(m.total_items) || 0,
    first_order_at: m.first_order_at,
    last_order_at: m.last_order_at,
    is_repeat_customer: m.is_repeat_customer || false,
    first_product: m.first_product,
    last_product: m.last_product,
    first_utm_source: m.first_utm_source,
  }));

  // Calcular resumo
  const totalOrders = journeyEvents.length;
  const totalCustomers = new Set(journeyEvents.map(e => e.contact_email)).size;
  const totalRevenue = journeyEvents.reduce((sum, e) => sum + e.customer_paid, 0);
  const repeatCustomers = contactMetrics.filter(m => m.is_repeat_customer).length;
  const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    journeyEvents,
    contactMetrics,
    summary: {
      totalOrders,
      totalCustomers,
      totalRevenue,
      repeatCustomerRate,
      avgOrderValue,
    },
    isLoading: isLoadingEvents,
    isLoadingMetrics,
    error: eventsError as Error | null,
  };
}
