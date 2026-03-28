import { useMemo } from 'react';
import { parseISO, format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ── Types ───────────────────────────────────────────── */

export interface ROASDay {
  date: string;
  dateLabel: string;
  revenue: number;
  spend: number;
  roas: number;
  roasAccum: number;
  sales: number;
}

interface SaleRecord {
  economic_day?: string;
  gross_amount?: number;
  [key: string]: any;
}

interface MetaInsight {
  date_start?: string;
  spend?: number | string;
  ad_id?: string | null;
  [key: string]: any;
}

/* ── Hook ────────────────────────────────────────────── */

export function useROASTimeline(
  salesData: SaleRecord[],
  metaInsights: MetaInsight[],
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
): ROASDay[] {
  return useMemo(() => {
    if (!startDateStr || !endDateStr) return [];
    if (salesData.length === 0 && metaInsights.length === 0) {
      return [];
    }

    const start = parseISO(startDateStr.slice(0, 10));
    const end = parseISO(endDateStr.slice(0, 10));

    // Revenue by day
    const revenueByDay = new Map<string, number>();
    const salesByDay = new Map<string, number>();
    for (const s of salesData) {
      const d = s.economic_day;
      if (!d) continue;
      revenueByDay.set(
        d, (revenueByDay.get(d) || 0) + (s.gross_amount || 0),
      );
      salesByDay.set(d, (salesByDay.get(d) || 0) + 1);
    }

    // Spend by day (deduplicate by ad_id + date)
    const spendByDay = new Map<string, number>();
    const seen = new Set<string>();
    for (const i of metaInsights) {
      const d = i.date_start?.slice(0, 10);
      if (!d) continue;
      const dedup = `${i.ad_id}_${d}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      spendByDay.set(
        d, (spendByDay.get(d) || 0) + (Number(i.spend) || 0),
      );
    }

    // Build daily timeline
    const result: ROASDay[] = [];
    let accumRevenue = 0;
    let accumSpend = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dateStr = format(cur, 'yyyy-MM-dd');
      const dateLabel = format(cur, 'dd/MM', {
        locale: ptBR,
      });
      const revenue = revenueByDay.get(dateStr) || 0;
      const spend = spendByDay.get(dateStr) || 0;
      const sales = salesByDay.get(dateStr) || 0;
      const roas = spend > 0 ? revenue / spend : 0;

      accumRevenue += revenue;
      accumSpend += spend;
      const roasAccum = accumSpend > 0
        ? accumRevenue / accumSpend : 0;

      result.push({
        date: dateStr,
        dateLabel,
        revenue,
        spend,
        roas,
        roasAccum,
        sales,
      });

      cur.setDate(cur.getDate() + 1);
    }

    return result;
  }, [salesData, metaInsights, startDateStr, endDateStr]);
}
