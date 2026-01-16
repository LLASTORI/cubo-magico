/**
 * REGRA CANÔNICA DE LTV
 * - LTV é calculado por pedido, não por item/transação
 * - Orders Core é a única fonte válida
 * - CRM legado é transitório
 * 
 * Este hook retorna métricas canônicas do contato baseadas em PEDIDOS,
 * não em transações. Fonte: crm_contact_orders_metrics_view
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

export interface ContactOrdersMetrics {
  contact_id: string;
  contact_email: string;
  contact_name: string | null;
  project_id: string;
  
  // Order counts
  orders_count: number;
  items_count: number;
  
  // Revenue metrics (canonical LTV)
  total_customer_paid: number;
  total_producer_net: number;
  
  // Average ticket
  avg_ticket: number;
  
  // Order dates
  first_order_at: string | null;
  last_order_at: string | null;
  days_since_last_order: number | null;
  
  // Repeat customer flag
  is_repeat_customer: boolean;
  
  // Product info
  first_product: string | null;
  last_product: string | null;
  
  // First UTM source
  first_utm_source: string | null;
  
  // Provider breakdown
  provider_breakdown: Record<string, { count: number; revenue: number }> | null;
}

/**
 * Hook shadow para métricas canônicas de contato baseadas em pedidos.
 * NÃO substitui useCRMContact - roda em paralelo.
 * 
 * @param contactId - ID do contato no CRM
 * @returns Métricas canônicas baseadas em Orders Core
 */
export function useCRMContactOrdersMetrics(contactId: string | undefined) {
  const { currentProject } = useProject();

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['crm-contact-orders-metrics', contactId, currentProject?.id],
    queryFn: async () => {
      if (!contactId || !currentProject?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('crm_contact_orders_metrics_view')
        .select('*')
        .eq('contact_id', contactId)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contact orders metrics:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      return data as ContactOrdersMetrics;
    },
    enabled: !!contactId && !!currentProject?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    metrics,
    isLoading,
    error,
    refetch,
    
    // Convenience getters
    ordersCount: metrics?.orders_count ?? 0,
    totalCustomerPaid: metrics?.total_customer_paid ?? 0,
    totalProducerNet: metrics?.total_producer_net ?? 0,
    avgTicket: metrics?.avg_ticket ?? 0,
    isRepeatCustomer: metrics?.is_repeat_customer ?? false,
    firstOrderAt: metrics?.first_order_at ?? null,
    lastOrderAt: metrics?.last_order_at ?? null,
    daysSinceLastOrder: metrics?.days_since_last_order ?? null,
    firstProduct: metrics?.first_product ?? null,
    lastProduct: metrics?.last_product ?? null,
    providerBreakdown: metrics?.provider_breakdown ?? null,
  };
}
