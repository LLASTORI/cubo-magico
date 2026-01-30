/**
 * Meta Paid Media Provider - Metrics
 * 
 * Reads data from meta_insights and aggregates by economic_day.
 * Does NOT calculate CTR/CPC/CPM - that is domain responsibility.
 * 
 * @see /docs/contracts/paid-media-provider-interface.md
 */

import { supabase } from "@/integrations/supabase/client";
import type { PaidMediaDailyMetrics, DateRange } from "./types";

interface MetaInsightRow {
  date_start: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  actions: unknown;
}

/**
 * Fetches daily metrics from meta_insights, aggregated by date_start (economic_day)
 * 
 * @param projectId - The project UUID
 * @param dateRange - Start and end dates for the query
 * @param accountIds - Optional filter by specific ad account IDs
 * @returns Array of daily metrics in provider-agnostic format
 */
export async function getMetrics(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<PaidMediaDailyMetrics[]> {
  const PAGE_SIZE = 1000;
  let allInsights: MetaInsightRow[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('meta_insights')
      .select('date_start, spend, impressions, clicks, reach, actions')
      .eq('project_id', projectId)
      .gte('date_start', dateRange.start)
      .lte('date_start', dateRange.end)
      .not('ad_id', 'is', null) // Require ad-level granularity (matches legacy invariant)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (accountIds && accountIds.length > 0) {
      query = query.in('ad_account_id', accountIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MetaProvider.getMetrics] Error fetching insights:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allInsights = [...allInsights, ...data];
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  // Aggregate by date (economic_day)
  const dailyMap = new Map<string, PaidMediaDailyMetrics>();

  for (const insight of allInsights) {
    const date = insight.date_start;
    const existing = dailyMap.get(date);

    if (existing) {
      existing.spend += insight.spend || 0;
      existing.impressions += insight.impressions || 0;
      existing.clicks += insight.clicks || 0;
      existing.reach += insight.reach || 0;
      // Merge actions if needed (simplified - just keep first non-null)
      if (!existing.actions && insight.actions) {
        existing.actions = insight.actions as Record<string, number>;
      }
    } else {
      dailyMap.set(date, {
        date,
        spend: insight.spend || 0,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        reach: insight.reach || 0,
        actions: (insight.actions && typeof insight.actions === 'object' && !Array.isArray(insight.actions)) 
          ? insight.actions as Record<string, number> 
          : null,
      });
    }
  }

  // Sort by date and return
  return Array.from(dailyMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
}
