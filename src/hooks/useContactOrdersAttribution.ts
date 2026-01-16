import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * 🚫 LEGACY TABLES FORBIDDEN
 * This hook uses ONLY Orders Core views:
 * - crm_contact_attribution_view
 * - crm_contact_revenue_view
 * 
 * DO NOT USE: crm_contacts.first_utm_*, crm_contacts.total_revenue
 */

export interface ContactOrdersAttribution {
  buyer_email: string;
  buyer_name: string | null;
  first_order_at: string | null;
  utm_source: string | null;
  utm_placement: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  raw_sck: string | null;
}

export interface ContactOrdersRevenue {
  buyer_email: string;
  buyer_name: string | null;
  total_orders: number;
  total_customer_paid: number;
  total_producer_net: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  average_ticket: number;
}

export function useContactOrdersAttribution(projectId: string | null, buyerEmail: string | null) {
  return useQuery({
    queryKey: ['contact-orders-attribution', projectId, buyerEmail],
    queryFn: async () => {
      if (!projectId || !buyerEmail) return null;
      
      const { data, error } = await supabase
        .from('crm_contact_attribution_view')
        .select('*')
        .eq('project_id', projectId)
        .ilike('buyer_email', buyerEmail)
        .maybeSingle();

      if (error) throw error;
      return data as ContactOrdersAttribution | null;
    },
    enabled: !!projectId && !!buyerEmail,
  });
}

export function useContactOrdersRevenue(projectId: string | null, buyerEmail: string | null) {
  return useQuery({
    queryKey: ['contact-orders-revenue', projectId, buyerEmail],
    queryFn: async () => {
      if (!projectId || !buyerEmail) return null;
      
      const { data, error } = await supabase
        .from('crm_contact_revenue_view')
        .select('*')
        .eq('project_id', projectId)
        .ilike('buyer_email', buyerEmail)
        .maybeSingle();

      if (error) throw error;
      return data as ContactOrdersRevenue | null;
    },
    enabled: !!projectId && !!buyerEmail,
  });
}
