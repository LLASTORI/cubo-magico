import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseLaunchConversionDataProps {
  projectId: string | undefined;
  funnelId: string;
  launchTag: string | null;
  startDate: Date;
  endDate: Date;
}

interface ContactJourney {
  contactId: string;
  email: string;
  name: string | null;
  firstSeenAt: string;
  tags: string[];
  becameCustomer: boolean;
  firstPurchaseAt: string | null;
  totalRevenue: number;
  interactions: Interaction[];
  transactions: Transaction[];
}

interface Interaction {
  id: string;
  type: string;
  pageName: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmAdset: string | null;
  utmAd: string | null;
  utmCreative: string | null;
  interactedAt: string;
}

interface Transaction {
  id: string;
  productName: string;
  status: string;
  totalPrice: number;
  utmSource: string | null;
  utmCampaign: string | null;
  utmAdset: string | null;
  utmAd: string | null;
  transactionDate: string;
}

export interface UTMConversionMetrics {
  utmValue: string;
  utmType: 'campaign' | 'adset' | 'ad' | 'creative';
  leadsCount: number;
  customersCount: number;
  conversionRate: number;
  totalRevenue: number;
  avgTicket: number;
}

export function useLaunchConversionData({
  projectId,
  funnelId,
  launchTag,
  startDate,
  endDate,
}: UseLaunchConversionDataProps) {
  // Fetch contacts with the launch tag
  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['launch-contacts', projectId, launchTag, startDate, endDate],
    queryFn: async () => {
      if (!projectId || !launchTag) return [];

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('crm_contacts')
        .select(`
          id,
          email,
          name,
          tags,
          first_seen_at,
          first_purchase_at,
          total_purchases,
          total_revenue,
          first_utm_source,
          first_utm_campaign,
          first_utm_adset,
          first_utm_ad,
          first_utm_creative
        `)
        .eq('project_id', projectId)
        .contains('tags', [launchTag])
        .gte('first_seen_at', startStr)
        .lte('first_seen_at', endStr + 'T23:59:59');

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!launchTag,
  });

  // Fetch interactions for these contacts
  const contactIds = contacts?.map(c => c.id) || [];
  
  const { data: interactions, isLoading: loadingInteractions } = useQuery({
    queryKey: ['launch-interactions', projectId, contactIds],
    queryFn: async () => {
      if (!projectId || contactIds.length === 0) return [];

      const { data, error } = await supabase
        .from('crm_contact_interactions')
        .select('*')
        .eq('project_id', projectId)
        .in('contact_id', contactIds)
        .order('interacted_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && contactIds.length > 0,
  });

  // Fetch transactions for these contacts
  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['launch-transactions', projectId, contactIds],
    queryFn: async () => {
      if (!projectId || contactIds.length === 0) return [];

      const { data, error } = await supabase
        .from('crm_transactions')
        .select('*')
        .eq('project_id', projectId)
        .in('contact_id', contactIds)
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && contactIds.length > 0,
  });

  // Build contact journeys
  const contactJourneys: ContactJourney[] = (contacts || []).map(contact => {
    const contactInteractions = (interactions || [])
      .filter(i => i.contact_id === contact.id)
      .map(i => ({
        id: i.id,
        type: i.interaction_type,
        pageName: i.page_name,
        utmSource: i.utm_source,
        utmCampaign: i.utm_campaign,
        utmAdset: i.utm_adset,
        utmAd: i.utm_ad,
        utmCreative: i.utm_creative,
        interactedAt: i.interacted_at,
      }));

    const contactTransactions = (transactions || [])
      .filter(t => t.contact_id === contact.id)
      .map(t => ({
        id: t.id,
        productName: t.product_name,
        status: t.status,
        totalPrice: t.total_price_brl || t.total_price || 0,
        utmSource: t.utm_source,
        utmCampaign: t.utm_campaign,
        utmAdset: t.utm_adset,
        utmAd: t.utm_ad,
        transactionDate: t.transaction_date || t.created_at,
      }));

    const hasApprovedPurchase = contactTransactions.some(t => 
      ['APPROVED', 'COMPLETE'].includes(t.status)
    );

    return {
      contactId: contact.id,
      email: contact.email,
      name: contact.name,
      firstSeenAt: contact.first_seen_at,
      tags: contact.tags || [],
      becameCustomer: hasApprovedPurchase,
      firstPurchaseAt: contact.first_purchase_at,
      totalRevenue: contact.total_revenue || 0,
      interactions: contactInteractions,
      transactions: contactTransactions,
    };
  });

  // Calculate UTM conversion metrics
  const calculateUTMMetrics = (utmType: 'campaign' | 'adset' | 'ad' | 'creative'): UTMConversionMetrics[] => {
    const utmField = `first_utm_${utmType}` as keyof typeof contacts[0];
    const utmMap = new Map<string, { leads: Set<string>; customers: Set<string>; revenue: number }>();

    (contacts || []).forEach(contact => {
      const utmValue = contact[utmField] as string | null;
      if (!utmValue) return;

      if (!utmMap.has(utmValue)) {
        utmMap.set(utmValue, { leads: new Set(), customers: new Set(), revenue: 0 });
      }

      const entry = utmMap.get(utmValue)!;
      entry.leads.add(contact.id);

      const journey = contactJourneys.find(j => j.contactId === contact.id);
      if (journey?.becameCustomer) {
        entry.customers.add(contact.id);
        entry.revenue += journey.totalRevenue;
      }
    });

    return Array.from(utmMap.entries()).map(([utmValue, data]) => ({
      utmValue,
      utmType,
      leadsCount: data.leads.size,
      customersCount: data.customers.size,
      conversionRate: data.leads.size > 0 ? (data.customers.size / data.leads.size) * 100 : 0,
      totalRevenue: data.revenue,
      avgTicket: data.customers.size > 0 ? data.revenue / data.customers.size : 0,
    })).sort((a, b) => b.leadsCount - a.leadsCount);
  };

  // Also calculate from interactions (for leads that had interactions during the launch)
  const calculateInteractionUTMMetrics = (utmType: 'campaign' | 'adset' | 'ad' | 'creative'): UTMConversionMetrics[] => {
    const utmField = `utm_${utmType}` as keyof typeof interactions[0];
    const utmMap = new Map<string, { leads: Set<string>; customers: Set<string>; revenue: number }>();

    (interactions || []).forEach(interaction => {
      const utmValue = interaction[utmField] as string | null;
      if (!utmValue) return;

      if (!utmMap.has(utmValue)) {
        utmMap.set(utmValue, { leads: new Set(), customers: new Set(), revenue: 0 });
      }

      const entry = utmMap.get(utmValue)!;
      entry.leads.add(interaction.contact_id);
    });

    // Add customer data from journeys
    contactJourneys.forEach(journey => {
      if (!journey.becameCustomer) return;

      journey.interactions.forEach(interaction => {
        const utmValue = interaction[`utm${utmType.charAt(0).toUpperCase() + utmType.slice(1)}` as keyof typeof interaction] as string | null;
        if (!utmValue) return;

        const entry = utmMap.get(utmValue);
        if (entry) {
          entry.customers.add(journey.contactId);
          entry.revenue = Math.max(entry.revenue, journey.totalRevenue);
        }
      });
    });

    return Array.from(utmMap.entries()).map(([utmValue, data]) => ({
      utmValue,
      utmType,
      leadsCount: data.leads.size,
      customersCount: data.customers.size,
      conversionRate: data.leads.size > 0 ? (data.customers.size / data.leads.size) * 100 : 0,
      totalRevenue: data.revenue,
      avgTicket: data.customers.size > 0 ? data.revenue / data.customers.size : 0,
    })).sort((a, b) => b.leadsCount - a.leadsCount);
  };

  // Summary metrics
  const summaryMetrics = {
    totalLeads: contacts?.length || 0,
    totalCustomers: contactJourneys.filter(j => j.becameCustomer).length,
    conversionRate: contacts?.length 
      ? (contactJourneys.filter(j => j.becameCustomer).length / contacts.length) * 100 
      : 0,
    totalRevenue: contactJourneys.reduce((sum, j) => sum + j.totalRevenue, 0),
    avgTicket: contactJourneys.filter(j => j.becameCustomer).length > 0
      ? contactJourneys.reduce((sum, j) => sum + j.totalRevenue, 0) / 
        contactJourneys.filter(j => j.becameCustomer).length
      : 0,
  };

  return {
    contacts,
    interactions,
    transactions,
    contactJourneys,
    summaryMetrics,
    utmMetrics: {
      byCampaign: calculateUTMMetrics('campaign'),
      byAdset: calculateUTMMetrics('adset'),
      byAd: calculateUTMMetrics('ad'),
      byCreative: calculateUTMMetrics('creative'),
      interactionsByCampaign: calculateInteractionUTMMetrics('campaign'),
      interactionsByAdset: calculateInteractionUTMMetrics('adset'),
    },
    isLoading: loadingContacts || loadingInteractions || loadingTransactions,
  };
}
