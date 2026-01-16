import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * 🚫 LEGACY TABLES FORBIDDEN
 * This hook uses ONLY Orders Core views:
 * - crm_recovery_orders_view
 * 
 * DO NOT USE: crm_transactions, hotmart_sales
 */

export interface RecoveryOrder {
  order_id: string;
  project_id: string;
  provider_order_id: string;
  buyer_email: string;
  buyer_name: string | null;
  ordered_at: string | null;
  status: string;
  customer_paid: number;
  producer_net: number;
  item_count: number;
  main_product_name: string | null;
  funnel_id: string | null;
  funnel_name: string | null;
  recovery_category: string;
}

export interface UseRecoveryOrdersProps {
  projectId: string | null;
  startDate: string;
  endDate: string;
}

export function useRecoveryOrders({ projectId, startDate, endDate }: UseRecoveryOrdersProps) {
  return useQuery({
    queryKey: ['recovery-orders-core', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allOrders: RecoveryOrder[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_recovery_orders_view')
          .select('*')
          .eq('project_id', projectId)
          .gte('ordered_at', `${startDate}T00:00:00`)
          .lte('ordered_at', `${endDate}T23:59:59`)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allOrders.push(...(data as RecoveryOrder[]));
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allOrders;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecoveryStats(orders: RecoveryOrder[]) {
  // Calculate stats by recovery category
  const stats = {
    total: orders.length,
    cancelados: orders.filter(o => o.recovery_category === 'Cancelado').length,
    chargebacks: orders.filter(o => o.recovery_category === 'Chargeback').length,
    reembolsados: orders.filter(o => o.recovery_category === 'Reembolsado').length,
    abandonados: orders.filter(o => o.recovery_category === 'Carrinho Abandonado').length,
    pendentes: orders.filter(o => o.recovery_category === 'Pendente').length,
    totalValueLost: orders.reduce((sum, o) => sum + o.customer_paid, 0),
  };
  
  return stats;
}
