import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface UTMMetrics {
  key: string;
  totalContacts: number;
  totalCustomers: number;
  conversionRate: number;
  totalRevenue: number;
  avgLTV: number;
  avgPurchases: number;
  avgTicket: number;
  repurchaseRate: number;
  avgDaysToFirstPurchase: number | null;
}

export interface UseUTMBehaviorDataProps {
  projectId: string | null;
}

export function useUTMBehaviorData({ projectId }: UseUTMBehaviorDataProps) {
  // Fetch all contacts with UTM data
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['utm-behavior-contacts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('crm_contacts')
        .select(`
          id,
          first_utm_source,
          first_utm_campaign,
          first_utm_medium,
          first_utm_adset,
          first_utm_ad,
          first_utm_creative,
          first_meta_campaign_id,
          first_meta_adset_id,
          first_meta_ad_id,
          status,
          total_revenue,
          total_purchases,
          first_seen_at,
          first_purchase_at
        `)
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate metrics by UTM dimension
  const calculateMetrics = (
    dimension: 'source' | 'campaign' | 'medium' | 'adset' | 'ad' | 'creative'
  ): UTMMetrics[] => {
    if (!contacts) return [];

    const fieldMap = {
      source: 'first_utm_source',
      campaign: 'first_utm_campaign',
      medium: 'first_utm_medium',
      adset: 'first_utm_adset',
      ad: 'first_utm_ad',
      creative: 'first_utm_creative',
    };

    const field = fieldMap[dimension] as keyof typeof contacts[0];
    const grouped = new Map<string, typeof contacts>();

    contacts.forEach((contact) => {
      const key = (contact[field] as string) || '(não definido)';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(contact);
    });

    const metrics: UTMMetrics[] = [];

    grouped.forEach((groupContacts, key) => {
      const customers = groupContacts.filter(c => c.status === 'customer');
      const totalRevenue = customers.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
      const totalPurchases = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
      const repeatCustomers = customers.filter(c => (c.total_purchases || 0) > 1);
      
      // Calculate avg days to first purchase
      const daysToFirstPurchase = customers
        .filter(c => c.first_seen_at && c.first_purchase_at)
        .map(c => {
          const firstSeen = new Date(c.first_seen_at!);
          const firstPurchase = new Date(c.first_purchase_at!);
          return Math.floor((firstPurchase.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      const avgDaysToFirstPurchase = daysToFirstPurchase.length > 0
        ? daysToFirstPurchase.reduce((a, b) => a + b, 0) / daysToFirstPurchase.length
        : null;

      metrics.push({
        key,
        totalContacts: groupContacts.length,
        totalCustomers: customers.length,
        conversionRate: groupContacts.length > 0 ? (customers.length / groupContacts.length) * 100 : 0,
        totalRevenue,
        avgLTV: customers.length > 0 ? totalRevenue / customers.length : 0,
        avgPurchases: customers.length > 0 ? totalPurchases / customers.length : 0,
        avgTicket: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
        repurchaseRate: customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0,
        avgDaysToFirstPurchase,
      });
    });

    // Sort by revenue
    return metrics.sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const metricsBySource = useMemo(() => calculateMetrics('source'), [contacts]);
  const metricsByCampaign = useMemo(() => calculateMetrics('campaign'), [contacts]);
  const metricsByMedium = useMemo(() => calculateMetrics('medium'), [contacts]);
  const metricsByAdset = useMemo(() => calculateMetrics('adset'), [contacts]);
  const metricsByAd = useMemo(() => calculateMetrics('ad'), [contacts]);
  const metricsByCreative = useMemo(() => calculateMetrics('creative'), [contacts]);

  // Summary totals
  const summary = useMemo(() => {
    if (!contacts) return null;
    
    const customers = contacts.filter(c => c.status === 'customer');
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
    const totalPurchases = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
    const repeatCustomers = customers.filter(c => (c.total_purchases || 0) > 1);
    
    return {
      totalContacts: contacts.length,
      totalCustomers: customers.length,
      conversionRate: contacts.length > 0 ? (customers.length / contacts.length) * 100 : 0,
      totalRevenue,
      avgLTV: customers.length > 0 ? totalRevenue / customers.length : 0,
      avgTicket: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
      repurchaseRate: customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0,
    };
  }, [contacts]);

  return {
    contacts,
    isLoading: contactsLoading,
    metricsBySource,
    metricsByCampaign,
    metricsByMedium,
    metricsByAdset,
    metricsByAd,
    metricsByCreative,
    summary,
  };
}
