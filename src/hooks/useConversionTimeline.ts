import { useMemo } from 'react';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ── Types ───────────────────────────────────────────── */

export interface ConversionDay {
  date: string;
  dateLabel: string;
  landingPageViews: number;
  initiateCheckouts: number;
  purchases: number;
  txPagCheckout: number;
  txCheckoutCompra: number;
  txPagCompra: number;
}

export interface ConversionTimelineResult {
  days: ConversionDay[];
  avgTxPagCompra: number;
  avgTxPagCheckout: number;
  avgTxCheckoutCompra: number;
}

interface MetaInsight {
  date_start?: string;
  ad_id?: string | null;
  actions?: any[];
  [key: string]: any;
}

/* ── Helpers ─────────────────────────────────────────── */

const getActionValue = (
  actions: any[] | null | undefined,
  type: string,
): number => {
  if (!actions || !Array.isArray(actions)) return 0;
  const a = actions.find(
    (x: any) => x.action_type === type,
  );
  return a ? parseInt(a.value || '0', 10) : 0;
};

/* ── Hook ────────────────────────────────────────────── */

export function useConversionTimeline(
  metaInsights: MetaInsight[],
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
): ConversionTimelineResult {
  return useMemo(() => {
    const empty = {
      days: [],
      avgTxPagCompra: 0,
      avgTxPagCheckout: 0,
      avgTxCheckoutCompra: 0,
    };

    if (!startDateStr || !endDateStr || metaInsights.length === 0) {
      return empty;
    }

    // Aggregate actions by day (deduplicate by ad_id + date)
    const byDay = new Map<string, {
      lp: number; ic: number; p: number;
    }>();
    const seen = new Set<string>();

    for (const i of metaInsights) {
      const d = i.date_start?.slice(0, 10);
      if (!d || !i.ad_id) continue;
      const dedup = `${i.ad_id}_${d}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      const lp =
        getActionValue(i.actions, 'landing_page_view') ||
        getActionValue(i.actions, 'omni_landing_page_view');
      const ic =
        getActionValue(i.actions, 'initiate_checkout') ||
        getActionValue(i.actions, 'omni_initiated_checkout');
      const p =
        getActionValue(i.actions, 'purchase') ||
        getActionValue(i.actions, 'omni_purchase');

      const existing = byDay.get(d);
      if (existing) {
        existing.lp += lp;
        existing.ic += ic;
        existing.p += p;
      } else {
        byDay.set(d, { lp, ic, p });
      }
    }

    // Build timeline
    const start = parseISO(startDateStr.slice(0, 10));
    const end = parseISO(endDateStr.slice(0, 10));
    const days: ConversionDay[] = [];
    const cur = new Date(start);

    while (cur <= end) {
      const dateStr = format(cur, 'yyyy-MM-dd');
      const dateLabel = format(cur, 'dd/MM', {
        locale: ptBR,
      });
      const d = byDay.get(dateStr);
      const lp = d?.lp || 0;
      const ic = d?.ic || 0;
      const p = d?.p || 0;

      days.push({
        date: dateStr,
        dateLabel,
        landingPageViews: lp,
        initiateCheckouts: ic,
        purchases: p,
        txPagCheckout: lp > 0 ? (ic / lp) * 100 : 0,
        txCheckoutCompra: ic > 0 ? (p / ic) * 100 : 0,
        txPagCompra: lp > 0 ? (p / lp) * 100 : 0,
      });

      cur.setDate(cur.getDate() + 1);
    }

    // Average (only days with data)
    const daysWithData = days.filter(d => d.landingPageViews > 0);
    const totalLp = daysWithData.reduce(
      (s, d) => s + d.landingPageViews, 0,
    );
    const totalIc = daysWithData.reduce(
      (s, d) => s + d.initiateCheckouts, 0,
    );
    const totalP = daysWithData.reduce(
      (s, d) => s + d.purchases, 0,
    );

    return {
      days,
      avgTxPagCompra: totalLp > 0
        ? (totalP / totalLp) * 100 : 0,
      avgTxPagCheckout: totalLp > 0
        ? (totalIc / totalLp) * 100 : 0,
      avgTxCheckoutCompra: totalIc > 0
        ? (totalP / totalIc) * 100 : 0,
    };
  }, [metaInsights, startDateStr, endDateStr]);
}
