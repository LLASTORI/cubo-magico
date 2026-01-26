/**
 * Hook canônico para Análise de Ascensão
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

export interface AscensionOrderItem {
  order_id: string;
  buyer_email: string;
  ordered_at: string;
  product_name: string | null;
  offer_name: string | null;
  provider_product_id: string | null;
  provider_offer_id: string | null;
  funnel_id: string | null;
  item_type: string | null;
}

export function useAscensionOrdersCore() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['ascension-orders-core', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Buscar orders com order_items para análise de ascensão
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_email,
          ordered_at,
          order_items (
            product_name,
            offer_name,
            provider_product_id,
            provider_offer_id,
            funnel_id,
            item_type
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('ordered_at', { ascending: true });
      
      if (error) throw error;
      
      // Flatten: cada order_item vira uma entrada
      const flattened: AscensionOrderItem[] = [];
      (data || []).forEach((order: any) => {
        (order.order_items || []).forEach((item: any) => {
          flattened.push({
            order_id: order.id,
            buyer_email: order.buyer_email,
            ordered_at: order.ordered_at,
            product_name: item.product_name,
            offer_name: item.offer_name,
            provider_product_id: item.provider_product_id,
            provider_offer_id: item.provider_offer_id,
            funnel_id: item.funnel_id,
            item_type: item.item_type,
          });
        });
      });
      
      return flattened;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  return { items, isLoading };
}
