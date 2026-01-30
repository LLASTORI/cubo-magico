/**
 * Meta Paid Media Provider Types
 * 
 * Types that map Meta-specific data to the PaidMediaProvider interface
 * defined in /docs/contracts/paid-media-provider-interface.md
 */

// Domain-level metrics (provider-agnostic)
export interface PaidMediaDailyMetrics {
  date: string; // economic_day (date_start)
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  // CTR, CPC, CPM are NOT calculated here - derived at domain level
  actions: Record<string, number> | null;
}

export interface PaidMediaAccount {
  account_id: string;
  account_name: string;
  is_active: boolean;
  credentials_expire_at: string | null;
}

export interface PaidMediaCampaign {
  id: string;
  campaign_id: string;
  name: string | null;
  status: string | null;
  account_id: string;
}

export interface PaidMediaAdSet {
  id: string;
  adset_id: string;
  name: string | null;
  campaign_id: string;
  status: string | null;
}

export interface PaidMediaAd {
  id: string;
  ad_id: string;
  name: string | null;
  adset_id: string;
  campaign_id: string;
  status: string | null;
}

export interface PaidMediaHierarchy {
  accounts: PaidMediaAccount[];
  campaigns: PaidMediaCampaign[];
  adsets: PaidMediaAdSet[];
  ads: PaidMediaAd[];
}

export interface PaidMediaDataHealth {
  is_complete: boolean;
  missing_days: string[];
  last_sync_at: string | null;
  credentials_status: 'valid' | 'expiring_soon' | 'expired' | 'not_configured';
}

export interface DateRange {
  start: string;
  end: string;
}

export interface PaidMediaProviderInterface {
  provider: string;
  getMetrics: (projectId: string, dateRange: DateRange, accountIds?: string[]) => Promise<PaidMediaDailyMetrics[]>;
  getHierarchy: (projectId: string, accountIds?: string[]) => Promise<PaidMediaHierarchy>;
  getDataHealth: (projectId: string, dateRange: DateRange, accountIds?: string[]) => Promise<PaidMediaDataHealth>;
}
