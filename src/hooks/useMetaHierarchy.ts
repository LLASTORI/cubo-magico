import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MetaCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  status: string | null;
}

interface MetaAdset {
  id: string;
  adset_id: string;
  adset_name: string | null;
  campaign_id: string;
  status: string | null;
}

interface MetaAd {
  id: string;
  ad_id: string;
  ad_name: string | null;
  adset_id: string;
  campaign_id: string;
  status: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
}

interface MetaInsight {
  id?: string;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  ad_account_id: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  date_start: string;
  date_stop: string;
}

interface UseMetaHierarchyProps {
  projectId: string | undefined;
  insights: MetaInsight[] | undefined;
  enabled?: boolean;
  activeAccountIds?: string[]; // Filter by active accounts
}

interface UseMetaHierarchyResult {
  campaigns: MetaCampaign[];
  adsets: MetaAdset[];
  ads: MetaAd[];
  isLoading: boolean;
  insightIds: {
    adIds: string[];
    adsetIds: string[];
    campaignIds: string[];
  };
}

/**
 * Unified hook for fetching Meta Ads hierarchy (campaigns, adsets, ads)
 * based on insight data. This ensures consistent caching across components.
 * IMPORTANT: Filters by activeAccountIds to only fetch data from selected accounts.
 */
export const useMetaHierarchy = ({
  projectId,
  insights,
  enabled = true,
  activeAccountIds = [],
}: UseMetaHierarchyProps): UseMetaHierarchyResult => {
  const isEnabled = enabled && !!projectId;

  // Extract unique IDs from insights for optimized queries
  const insightIds = useMemo(() => {
    if (!insights || insights.length === 0) {
      return { adIds: [], adsetIds: [], campaignIds: [] };
    }
    const adIds = [...new Set(insights.filter(i => i.ad_id).map(i => i.ad_id!))] as string[];
    const adsetIds = [...new Set(insights.filter(i => i.adset_id).map(i => i.adset_id!))] as string[];
    const campaignIds = [...new Set(insights.filter(i => i.campaign_id).map(i => i.campaign_id!))] as string[];
    return { adIds, adsetIds, campaignIds };
  }, [insights]);

  // Extract unique account IDs from insights if not provided
  const accountIdsFromInsights = useMemo(() => {
    if (activeAccountIds.length > 0) return activeAccountIds;
    if (!insights || insights.length === 0) return [];
    return [...new Set(insights.map(i => i.ad_account_id))];
  }, [insights, activeAccountIds]);

  // Fetch campaigns - ONLY from active accounts (filtered by ad_account_id)
  const campaignsQuery = useQuery({
    queryKey: ['meta-hierarchy-campaigns', projectId, accountIdsFromInsights.join(',')],
    queryFn: async () => {
      if (accountIdsFromInsights.length === 0) return [];
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('id, campaign_id, campaign_name, status')
        .eq('project_id', projectId!)
        .in('ad_account_id', accountIdsFromInsights);
      if (error) throw error;
      console.log(`[useMetaHierarchy] Campaigns loaded: ${data?.length || 0} from ${accountIdsFromInsights.length} accounts`);
      return (data as MetaCampaign[]) || [];
    },
    enabled: isEnabled && accountIdsFromInsights.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch adsets only for those appearing in insights (optimized with batching)
  const adsetsQuery = useQuery({
    queryKey: ['meta-hierarchy-adsets', projectId, insightIds.adsetIds.length],
    queryFn: async () => {
      if (insightIds.adsetIds.length === 0) return [];
      console.log(`[useMetaHierarchy] Fetching ${insightIds.adsetIds.length} adsets for project=${projectId}`);
      
      const allAdsets: MetaAdset[] = [];
      const batchSize = 100;
      
      for (let i = 0; i < insightIds.adsetIds.length; i += batchSize) {
        const batch = insightIds.adsetIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('meta_adsets')
          .select('id, adset_id, adset_name, campaign_id, status')
          .eq('project_id', projectId!)
          .in('adset_id', batch);
        if (error) throw error;
        if (data) allAdsets.push(...(data as MetaAdset[]));
      }
      
      console.log(`[useMetaHierarchy] Adsets loaded: ${allAdsets.length}`);
      return allAdsets;
    },
    enabled: isEnabled && insightIds.adsetIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ads only for those appearing in insights (optimized with batching)
  const adsQuery = useQuery({
    queryKey: ['meta-hierarchy-ads', projectId, insightIds.adIds.length],
    queryFn: async () => {
      if (insightIds.adIds.length === 0) return [];
      console.log(`[useMetaHierarchy] Fetching ${insightIds.adIds.length} ads for project=${projectId}`);
      
      const allAds: MetaAd[] = [];
      const batchSize = 100;
      
      for (let i = 0; i < insightIds.adIds.length; i += batchSize) {
        const batch = insightIds.adIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('meta_ads')
          .select('id, ad_id, ad_name, adset_id, campaign_id, status, preview_url, thumbnail_url')
          .eq('project_id', projectId!)
          .in('ad_id', batch);
        if (error) throw error;
        if (data) allAds.push(...(data as MetaAd[]));
      }
      
      console.log(`[useMetaHierarchy] Ads loaded: ${allAds.length}`);
      return allAds;
    },
    enabled: isEnabled && insightIds.adIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    campaigns: campaignsQuery.data || [],
    adsets: adsetsQuery.data || [],
    ads: adsQuery.data || [],
    isLoading: campaignsQuery.isLoading || adsetsQuery.isLoading || adsQuery.isLoading,
    insightIds,
  };
};
