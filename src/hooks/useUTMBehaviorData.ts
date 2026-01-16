import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { toast } from 'sonner';

/**
 * 🚫 LEGACY TABLES FORBIDDEN
 * This hook uses ONLY Orders Core views:
 * - crm_contact_revenue_view (customer_paid, producer_net)
 * - crm_contact_attribution_view (UTMs)
 * 
 * DO NOT USE: crm_contacts.total_revenue, crm_contacts.first_utm_*
 */

export interface UTMMetrics {
  key: string;
  totalContacts: number;
  totalCustomers: number;
  conversionRate: number;
  totalCustomerPaid: number;  // What customer paid
  totalProducerNet: number;   // What producer received
  avgLTV: number;
  avgPurchases: number;
  avgTicket: number;
  repurchaseRate: number;
  avgDaysToFirstPurchase: number | null;
}

export interface UseUTMBehaviorDataProps {
  projectId: string | null;
}

interface RevenueData {
  buyer_email: string;
  total_orders: number;
  total_customer_paid: number;
  total_producer_net: number;
  first_purchase_at: string | null;
}

interface AttributionData {
  buyer_email: string;
  utm_source: string | null;
  utm_placement: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  raw_sck: string | null;
}

interface CombinedContact {
  email: string;
  isCustomer: boolean;
  totalOrders: number;
  totalCustomerPaid: number;
  totalProducerNet: number;
  firstPurchaseAt: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  utmAdset: string | null;
  utmAd: string | null;
  utmCreative: string | null;
}

export function useUTMBehaviorData({ projectId }: UseUTMBehaviorDataProps) {
  const queryClient = useQueryClient();

  // Fetch revenue data from crm_contact_revenue_view
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['utm-behavior-revenue', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allData: RevenueData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_contact_revenue_view')
          .select('buyer_email, total_orders, total_customer_paid, total_producer_net, first_purchase_at')
          .eq('project_id', projectId)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as RevenueData[]));
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch attribution data from crm_contact_attribution_view
  const { data: attributionData, isLoading: attributionLoading } = useQuery({
    queryKey: ['utm-behavior-attribution', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allData: AttributionData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_contact_attribution_view')
          .select('buyer_email, utm_source, utm_placement, meta_campaign_id, meta_adset_id, meta_ad_id, raw_sck')
          .eq('project_id', projectId)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as AttributionData[]));
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Combine revenue and attribution data
  const contacts = useMemo(() => {
    if (!revenueData || !attributionData) return [];
    
    // Create map from attribution by email
    const attributionMap = new Map<string, AttributionData>();
    attributionData.forEach(attr => {
      attributionMap.set(attr.buyer_email.toLowerCase(), attr);
    });
    
    // Combine with revenue data
    const combined: CombinedContact[] = revenueData.map(rev => {
      const email = rev.buyer_email.toLowerCase();
      const attr = attributionMap.get(email);
      
      // Parse raw_sck for additional UTM fields
      // Format: source|campaign|adset|term|ad
      const sckParts = attr?.raw_sck?.split('|') || [];
      
      return {
        email,
        isCustomer: rev.total_orders > 0,
        totalOrders: rev.total_orders,
        totalCustomerPaid: rev.total_customer_paid,
        totalProducerNet: rev.total_producer_net,
        firstPurchaseAt: rev.first_purchase_at,
        utmSource: attr?.utm_source || sckParts[0] || null,
        utmCampaign: sckParts[1] || null,
        utmMedium: attr?.utm_placement || null, // Using placement as medium
        utmAdset: sckParts[2] || null,
        utmAd: sckParts[4] || null,
        utmCreative: null, // Not available in sck
      };
    });
    
    return combined;
  }, [revenueData, attributionData]);

  // Calculate metrics by UTM dimension
  const calculateMetrics = (
    dimension: 'source' | 'campaign' | 'medium' | 'adset' | 'ad' | 'creative'
  ): UTMMetrics[] => {
    if (!contacts || contacts.length === 0) return [];

    const fieldMap: Record<string, keyof CombinedContact> = {
      source: 'utmSource',
      campaign: 'utmCampaign',
      medium: 'utmMedium',
      adset: 'utmAdset',
      ad: 'utmAd',
      creative: 'utmCreative',
    };

    const field = fieldMap[dimension];
    const grouped = new Map<string, CombinedContact[]>();

    contacts.forEach((contact) => {
      const key = (contact[field] as string) || '(não definido)';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(contact);
    });

    const metrics: UTMMetrics[] = [];

    grouped.forEach((groupContacts, key) => {
      const customers = groupContacts.filter(c => c.isCustomer);
      const totalCustomerPaid = customers.reduce((sum, c) => sum + c.totalCustomerPaid, 0);
      const totalProducerNet = customers.reduce((sum, c) => sum + c.totalProducerNet, 0);
      const totalPurchases = customers.reduce((sum, c) => sum + c.totalOrders, 0);
      const repeatCustomers = customers.filter(c => c.totalOrders > 1);

      metrics.push({
        key,
        totalContacts: groupContacts.length,
        totalCustomers: customers.length,
        conversionRate: groupContacts.length > 0 ? (customers.length / groupContacts.length) * 100 : 0,
        totalCustomerPaid,
        totalProducerNet,
        avgLTV: customers.length > 0 ? totalCustomerPaid / customers.length : 0,
        avgPurchases: customers.length > 0 ? totalPurchases / customers.length : 0,
        avgTicket: totalPurchases > 0 ? totalCustomerPaid / totalPurchases : 0,
        repurchaseRate: customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0,
        avgDaysToFirstPurchase: null, // Would need first_seen_at from contacts
      });
    });

    // Sort by customer paid (what customer paid)
    return metrics.sort((a, b) => b.totalCustomerPaid - a.totalCustomerPaid);
  };

  const metricsBySource = useMemo(() => calculateMetrics('source'), [contacts]);
  const metricsByCampaign = useMemo(() => calculateMetrics('campaign'), [contacts]);
  const metricsByMedium = useMemo(() => calculateMetrics('medium'), [contacts]);
  const metricsByAdset = useMemo(() => calculateMetrics('adset'), [contacts]);
  const metricsByAd = useMemo(() => calculateMetrics('ad'), [contacts]);
  const metricsByCreative = useMemo(() => calculateMetrics('creative'), [contacts]);

  // Summary totals
  const summary = useMemo(() => {
    if (!contacts || contacts.length === 0) return null;
    
    const customers = contacts.filter(c => c.isCustomer);
    const totalCustomerPaid = customers.reduce((sum, c) => sum + c.totalCustomerPaid, 0);
    const totalProducerNet = customers.reduce((sum, c) => sum + c.totalProducerNet, 0);
    const totalPurchases = customers.reduce((sum, c) => sum + c.totalOrders, 0);
    const repeatCustomers = customers.filter(c => c.totalOrders > 1);
    
    return {
      totalContacts: contacts.length,
      totalCustomers: customers.length,
      conversionRate: contacts.length > 0 ? (customers.length / contacts.length) * 100 : 0,
      totalRevenue: totalCustomerPaid,  // Keep as totalRevenue for backward compatibility
      totalCustomerPaid,
      totalProducerNet,
      avgLTV: customers.length > 0 ? totalCustomerPaid / customers.length : 0,
      avgTicket: totalPurchases > 0 ? totalCustomerPaid / totalPurchases : 0,
      repurchaseRate: customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0,
    };
  }, [contacts]);

  // Legacy mutation kept for backward compatibility
  const populateUTMs = useMutation({
    mutationFn: async () => {
      // This is now deprecated - data comes from Orders Core
      toast.info('UTMs agora são derivados automaticamente dos pedidos');
      return { updated_count: 0 };
    },
  });

  return {
    contacts,
    isLoading: revenueLoading || attributionLoading,
    metricsBySource,
    metricsByCampaign,
    metricsByMedium,
    metricsByAdset,
    metricsByAd,
    metricsByCreative,
    summary,
    populateUTMs,
  };
}
