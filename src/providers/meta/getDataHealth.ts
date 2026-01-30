/**
 * Meta Paid Media Provider - Data Health
 * 
 * Checks for data gaps by economic_day and credentials status.
 * Does NOT trigger sync operations.
 * 
 * @see /docs/contracts/paid-media-provider-interface.md
 */

import { supabase } from "@/integrations/supabase/client";
import type { PaidMediaDataHealth, DateRange } from "./types";
import { eachDayOfInterval, format, parseISO, differenceInDays } from "date-fns";

/**
 * Checks data completeness and credentials status
 * 
 * @param projectId - The project UUID
 * @param dateRange - Start and end dates to check
 * @param accountIds - Optional filter by specific ad account IDs
 * @returns Health status including missing days and credentials state
 */
export async function getDataHealth(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<PaidMediaDataHealth> {
  // Fetch distinct dates with data
  const datesWithData = await fetchDatesWithData(projectId, dateRange, accountIds);
  
  // Calculate expected dates
  const expectedDates = getExpectedDates(dateRange);
  
  // Find missing days
  const datesSet = new Set(datesWithData);
  const missingDays = expectedDates.filter(date => !datesSet.has(date));
  
  // Fetch credentials status
  const credentialsStatus = await getCredentialsStatus(projectId);
  
  // Get last sync timestamp
  const lastSyncAt = await getLastSyncAt(projectId, accountIds);

  return {
    is_complete: missingDays.length === 0,
    missing_days: missingDays,
    last_sync_at: lastSyncAt,
    credentials_status: credentialsStatus,
  };
}

async function fetchDatesWithData(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<string[]> {
  const PAGE_SIZE = 1000;
  let allDates: string[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('meta_insights')
      .select('date_start')
      .eq('project_id', projectId)
      .gte('date_start', dateRange.start)
      .lte('date_start', dateRange.end)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (accountIds && accountIds.length > 0) {
      query = query.in('ad_account_id', accountIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MetaProvider.getDataHealth] Error fetching dates:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allDates = [...allDates, ...data.map(d => d.date_start)];
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  // Return unique dates
  return [...new Set(allDates)];
}

function getExpectedDates(dateRange: DateRange): string[] {
  const start = parseISO(dateRange.start);
  const end = parseISO(dateRange.end);
  
  // Don't include today (might not have complete data yet)
  const today = new Date();
  const adjustedEnd = end > today ? today : end;
  
  if (differenceInDays(adjustedEnd, start) < 0) {
    return [];
  }
  
  const interval = eachDayOfInterval({ start, end: adjustedEnd });
  return interval.map(date => format(date, 'yyyy-MM-dd'));
}

async function getCredentialsStatus(
  projectId: string
): Promise<'valid' | 'expiring_soon' | 'expired' | 'not_configured'> {
  const { data: credentials } = await supabase
    .from('meta_credentials')
    .select('expires_at')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!credentials) {
    return 'not_configured';
  }

  if (!credentials.expires_at) {
    return 'valid'; // No expiration set = valid
  }

  const expiresAt = new Date(credentials.expires_at);
  const now = new Date();
  const daysUntilExpiration = differenceInDays(expiresAt, now);

  if (daysUntilExpiration < 0) {
    return 'expired';
  }

  if (daysUntilExpiration <= 7) {
    return 'expiring_soon';
  }

  return 'valid';
}

async function getLastSyncAt(
  projectId: string,
  accountIds?: string[]
): Promise<string | null> {
  let query = supabase
    .from('meta_insights')
    .select('updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (accountIds && accountIds.length > 0) {
    query = query.in('ad_account_id', accountIds);
  }

  const { data } = await query;

  return data && data.length > 0 ? data[0].updated_at : null;
}
