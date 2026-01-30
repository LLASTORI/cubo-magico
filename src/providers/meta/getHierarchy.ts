/**
 * Meta Paid Media Provider - Hierarchy
 * 
 * Reads data from meta_ad_accounts, meta_campaigns, meta_adsets, meta_ads
 * and returns in provider-agnostic format.
 * 
 * @see /docs/contracts/paid-media-provider-interface.md
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  PaidMediaHierarchy,
  PaidMediaAccount,
  PaidMediaCampaign,
  PaidMediaAdSet,
  PaidMediaAd,
} from "./types";

/**
 * Fetches the complete ad hierarchy for a project
 * 
 * @param projectId - The project UUID
 * @param accountIds - Optional filter by specific ad account IDs
 * @returns Hierarchy containing accounts, campaigns, adsets, and ads
 */
export async function getHierarchy(
  projectId: string,
  accountIds?: string[]
): Promise<PaidMediaHierarchy> {
  // Fetch accounts
  const accounts = await fetchAccounts(projectId);
  
  // Filter accounts if specific IDs provided
  const filteredAccounts = accountIds && accountIds.length > 0
    ? accounts.filter(a => accountIds.includes(a.account_id))
    : accounts;
  
  const activeAccountIds = filteredAccounts.map(a => a.account_id);
  
  if (activeAccountIds.length === 0) {
    return {
      accounts: filteredAccounts,
      campaigns: [],
      adsets: [],
      ads: [],
    };
  }

  // Fetch hierarchy in parallel
  const [campaigns, adsets, ads] = await Promise.all([
    fetchCampaigns(projectId, activeAccountIds),
    fetchAdSets(projectId, activeAccountIds),
    fetchAds(projectId, activeAccountIds),
  ]);

  return {
    accounts: filteredAccounts,
    campaigns,
    adsets,
    ads,
  };
}

async function fetchAccounts(projectId: string): Promise<PaidMediaAccount[]> {
  // Fetch accounts
  const { data: accountsData, error: accountsError } = await supabase
    .from('meta_ad_accounts')
    .select('account_id, account_name, is_active')
    .eq('project_id', projectId);

  if (accountsError) {
    console.error('[MetaProvider.getHierarchy] Error fetching accounts:', accountsError);
    throw accountsError;
  }

  // Fetch credentials for expiration info
  const { data: credentialsData } = await supabase
    .from('meta_credentials')
    .select('expires_at')
    .eq('project_id', projectId)
    .maybeSingle();

  const expiresAt = credentialsData?.expires_at || null;

  return (accountsData || []).map(account => ({
    account_id: account.account_id,
    account_name: account.account_name || account.account_id,
    is_active: account.is_active ?? true,
    credentials_expire_at: expiresAt,
  }));
}

async function fetchCampaigns(
  projectId: string,
  accountIds: string[]
): Promise<PaidMediaCampaign[]> {
  const PAGE_SIZE = 1000;
  let allCampaigns: PaidMediaCampaign[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('meta_campaigns')
      .select('id, campaign_id, campaign_name, status, ad_account_id')
      .eq('project_id', projectId)
      .in('ad_account_id', accountIds)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('[MetaProvider.getHierarchy] Error fetching campaigns:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allCampaigns = [
        ...allCampaigns,
        ...data.map(c => ({
          id: c.id,
          campaign_id: c.campaign_id,
          name: c.campaign_name,
          status: c.status,
          account_id: c.ad_account_id,
        })),
      ];
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allCampaigns;
}

async function fetchAdSets(
  projectId: string,
  accountIds: string[]
): Promise<PaidMediaAdSet[]> {
  const PAGE_SIZE = 1000;
  let allAdSets: PaidMediaAdSet[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('meta_adsets')
      .select('id, adset_id, adset_name, campaign_id, status')
      .eq('project_id', projectId)
      .in('ad_account_id', accountIds)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('[MetaProvider.getHierarchy] Error fetching adsets:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allAdSets = [
        ...allAdSets,
        ...data.map(a => ({
          id: a.id,
          adset_id: a.adset_id,
          name: a.adset_name,
          campaign_id: a.campaign_id,
          status: a.status,
        })),
      ];
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allAdSets;
}

async function fetchAds(
  projectId: string,
  accountIds: string[]
): Promise<PaidMediaAd[]> {
  const PAGE_SIZE = 1000;
  let allAds: PaidMediaAd[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('meta_ads')
      .select('id, ad_id, ad_name, adset_id, campaign_id, status')
      .eq('project_id', projectId)
      .in('ad_account_id', accountIds)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('[MetaProvider.getHierarchy] Error fetching ads:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allAds = [
        ...allAds,
        ...data.map(a => ({
          id: a.id,
          ad_id: a.ad_id,
          name: a.ad_name,
          adset_id: a.adset_id,
          campaign_id: a.campaign_id,
          status: a.status,
        })),
      ];
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allAds;
}
