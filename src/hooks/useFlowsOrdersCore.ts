/**
 * Hook canônico para Análise de Fluxos
 * 
 * PROMPT 3: Consolidação Total do Orders Core
 * 
 * Fonte única: orders + order_items
 * ❌ crm_transactions foi removido definitivamente
 * ✅ CSV e Webhook são indistinguíveis
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

export interface FlowsOrderData {
  order_id: string;
  buyer_email: string;
  ordered_at: string;
  customer_paid: number;
  product_name: string | null;
}

export function useFlowsOrdersCore(dateRange?: { start: Date; end: Date } | null) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['flows-orders-core', projectId, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Buscar orders com order_items para análise de fluxos
      let query = supabase
        .from('orders')
        .select(`
          id,
          buyer_email,
          ordered_at,
          customer_paid,
          order_items (
            product_name
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('ordered_at', { ascending: true });
      
      // Aplicar filtro de data se fornecido
      if (dateRange?.start) {
        query = query.gte('ordered_at', dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        query = query.lte('ordered_at', dateRange.end.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Flatten: cada order_item vira uma entrada (considerando produto principal)
      const flattened: FlowsOrderData[] = [];
      (data || []).forEach((order: any) => {
        // Usar o primeiro item como produto principal para fluxos
        const mainItem = order.order_items?.[0];
        if (mainItem) {
          flattened.push({
            order_id: order.id,
            buyer_email: order.buyer_email,
            ordered_at: order.ordered_at,
            customer_paid: order.customer_paid,
            product_name: mainItem.product_name,
          });
        }
      });
      
      return flattened;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  return { items, isLoading };
}
