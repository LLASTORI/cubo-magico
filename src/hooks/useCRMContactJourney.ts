import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactInteraction {
  id: string;
  contact_id: string;
  project_id: string;
  interaction_type: string;
  interacted_at: string;
  page_name: string | null;
  page_url: string | null;
  funnel_id: string | null;
  launch_tag: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_adset: string | null;
  utm_ad: string | null;
  utm_creative: string | null;
  utm_placement: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SegmentInsights {
  segmentName: string;
  totalCustomers: number;
  averageLTV: number;
  repurchaseRate: number;
  averagePurchases: number;
  averageTimeToFirstPurchase: number | null;
}

export function useCRMContactJourney(contactId: string | undefined, projectId: string | undefined) {
  // Buscar interações do contato
  const { data: interactions, isLoading: isLoadingInteractions } = useQuery({
    queryKey: ['contact-interactions', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('crm_contact_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('interacted_at', { ascending: false });

      if (error) throw error;
      return data as ContactInteraction[];
    },
    enabled: !!contactId,
  });

  // Buscar insights do segmento baseado na UTM source do contato
  const { data: segmentInsights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['segment-insights', contactId, projectId],
    queryFn: async () => {
      if (!contactId || !projectId) return null;

      // Primeiro buscar a UTM do contato atual
      const { data: currentContact, error: contactError } = await supabase
        .from('crm_contacts')
        .select('first_utm_source, first_utm_campaign')
        .eq('id', contactId)
        .single();

      if (contactError || !currentContact) return null;

      const utmSource = currentContact.first_utm_source;
      const utmCampaign = currentContact.first_utm_campaign;

      // Se não tem UTM, retornar null
      if (!utmSource && !utmCampaign) return null;

      // Buscar todos os contatos do mesmo segmento
      let query = supabase
        .from('crm_contacts')
        .select('id, total_purchases, total_revenue, first_purchase_at, first_seen_at, status')
        .eq('project_id', projectId);

      // Priorizar campaign, se não tiver usar source
      if (utmCampaign) {
        query = query.eq('first_utm_campaign', utmCampaign);
      } else if (utmSource) {
        query = query.eq('first_utm_source', utmSource);
      }

      const { data: segmentContacts, error: segmentError } = await query;

      if (segmentError || !segmentContacts || segmentContacts.length === 0) return null;

      // Calcular métricas do segmento
      const totalCustomers = segmentContacts.length;
      const customersWithPurchases = segmentContacts.filter(c => (c.total_purchases || 0) > 0);
      const repeatCustomers = segmentContacts.filter(c => (c.total_purchases || 0) > 1);
      
      const totalRevenue = segmentContacts.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
      const averageLTV = customersWithPurchases.length > 0 
        ? totalRevenue / customersWithPurchases.length 
        : 0;
      
      const repurchaseRate = customersWithPurchases.length > 0 
        ? (repeatCustomers.length / customersWithPurchases.length) * 100 
        : 0;

      const totalPurchases = segmentContacts.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
      const averagePurchases = customersWithPurchases.length > 0 
        ? totalPurchases / customersWithPurchases.length 
        : 0;

      // Calcular tempo médio até primeira compra
      let averageTimeToFirstPurchase: number | null = null;
      const timesToFirstPurchase = customersWithPurchases
        .filter(c => c.first_seen_at && c.first_purchase_at)
        .map(c => {
          const firstSeen = new Date(c.first_seen_at).getTime();
          const firstPurchase = new Date(c.first_purchase_at!).getTime();
          return (firstPurchase - firstSeen) / (1000 * 60 * 60 * 24); // dias
        });

      if (timesToFirstPurchase.length > 0) {
        averageTimeToFirstPurchase = timesToFirstPurchase.reduce((a, b) => a + b, 0) / timesToFirstPurchase.length;
      }

      const segmentName = utmCampaign || utmSource || 'Desconhecido';

      return {
        segmentName,
        totalCustomers,
        averageLTV,
        repurchaseRate,
        averagePurchases,
        averageTimeToFirstPurchase,
      } as SegmentInsights;
    },
    enabled: !!contactId && !!projectId,
  });

  return {
    interactions: interactions || [],
    segmentInsights,
    isLoadingInteractions,
    isLoadingInsights,
  };
}
