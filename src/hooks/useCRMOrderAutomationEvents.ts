/**
 * REGRA CANÔNICA DE AUTOMAÇÃO:
 * - 1 pedido = 1 evento de automação
 * - Não dispara por item/transação
 * - event_type: 'first_order' ou 'repeat_order'
 * - Orders Core é a única fonte válida
 * - CRM legado (crm_transactions) é transitório
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderAutomationEvent {
  order_id: string;
  provider_order_id: string | null;
  project_id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  event_type: 'first_order' | 'repeat_order';
  order_sequence: number;
  order_value: number;
  producer_net: number;
  currency: string | null;
  ordered_at: string;
  created_at: string;
  items_count: number;
  main_product_name: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  provider: string | null;
  status: string;
  funnel_id: string | null;
}

export interface UseCRMOrderAutomationEventsResult {
  events: OrderAutomationEvent[];
  firstOrderEvents: OrderAutomationEvent[];
  repeatOrderEvents: OrderAutomationEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseCRMOrderAutomationEventsOptions {
  contactEmail?: string;
  eventType?: 'first_order' | 'repeat_order';
  limit?: number;
}

export function useCRMOrderAutomationEvents(
  options: UseCRMOrderAutomationEventsOptions = {}
): UseCRMOrderAutomationEventsResult {
  const { contactEmail, eventType, limit = 100 } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['crm-order-automation-events', contactEmail, eventType, limit],
    queryFn: async () => {
      let query = supabase
        .from('crm_order_automation_events_view')
        .select('*')
        .order('ordered_at', { ascending: false })
        .limit(limit);

      if (contactEmail) {
        query = query.eq('contact_email', contactEmail);
      }

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OrderAutomationEvent[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const events = data || [];
  const firstOrderEvents = events.filter(e => e.event_type === 'first_order');
  const repeatOrderEvents = events.filter(e => e.event_type === 'repeat_order');

  return {
    events,
    firstOrderEvents,
    repeatOrderEvents,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook para buscar eventos de automação de um contato específico
 */
export function useCRMContactAutomationEvents(contactEmail: string | undefined) {
  return useCRMOrderAutomationEvents({
    contactEmail,
    limit: 50,
  });
}

/**
 * Hook para buscar apenas eventos de primeira compra
 */
export function useCRMFirstOrderEvents(limit = 100) {
  return useCRMOrderAutomationEvents({
    eventType: 'first_order',
    limit,
  });
}

/**
 * Hook para buscar apenas eventos de recompra
 */
export function useCRMRepeatOrderEvents(limit = 100) {
  return useCRMOrderAutomationEvents({
    eventType: 'repeat_order',
    limit,
  });
}
