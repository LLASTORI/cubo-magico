import { useMemo } from 'react';
import {
  parseISO, addDays, format, differenceInDays, min,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ── Types ───────────────────────────────────────────── */

export interface PeriodMetrics {
  label: string;
  startDate: string;
  endDate: string;
  sales: number;
  revenue: number;
  spend: number;
  roas: number;
  cpa: number;
  avgTicket: number;
  uniqueBuyers: number;
}

export type PeriodMode = 'weekly' | 'custom';

interface SaleRecord {
  economic_day?: string;
  gross_amount?: number;
  buyer_email?: string;
  [key: string]: any;
}

interface MetaInsight {
  date_start?: string;
  spend?: number | string;
  [key: string]: any;
}

/* ── Hook ────────────────────────────────────────────── */

export function usePeriodComparison(
  salesData: SaleRecord[],
  metaInsights: MetaInsight[],
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
  mode: PeriodMode = 'weekly',
) {
  return useMemo(() => {
    if (!startDateStr || !endDateStr) return [];
    if (salesData.length === 0 && metaInsights.length === 0) {
      return [];
    }

    const start = parseISO(startDateStr.slice(0, 10));
    const end = parseISO(endDateStr.slice(0, 10));
    const totalDays = differenceInDays(end, start) + 1;

    if (totalDays < 2) return [];

    // Generate period ranges
    const periods: { start: Date; end: Date; label: string }[] = [];

    if (mode === 'weekly') {
      if (totalDays >= 8) {
        // Weekly split (7 days each)
        let periodStart = start;
        let weekNum = 1;
        while (periodStart <= end) {
          const periodEnd = min([
            addDays(periodStart, 6), end,
          ]);
          const fmtS = format(
            periodStart, 'dd/MM', { locale: ptBR },
          );
          const fmtE = format(
            periodEnd, 'dd/MM', { locale: ptBR },
          );
          periods.push({
            start: periodStart,
            end: periodEnd,
            label: `Sem ${weekNum} (${fmtS}–${fmtE})`,
          });
          periodStart = addDays(periodEnd, 1);
          weekNum++;
        }
      } else if (totalDays >= 2) {
        // Short edition: split in half
        const mid = Math.ceil(totalDays / 2);
        const midDate = addDays(start, mid - 1);
        const fmtS1 = format(start, 'dd/MM', { locale: ptBR });
        const fmtE1 = format(midDate, 'dd/MM', { locale: ptBR });
        const start2 = addDays(midDate, 1);
        const fmtS2 = format(start2, 'dd/MM', { locale: ptBR });
        const fmtE2 = format(end, 'dd/MM', { locale: ptBR });
        periods.push({
          start, end: midDate,
          label: `1ª Metade (${fmtS1}–${fmtE1})`,
        });
        periods.push({
          start: start2, end,
          label: `2ª Metade (${fmtS2}–${fmtE2})`,
        });
      }
    }

    if (periods.length < 2) return [];

    // Compute metrics per period
    const results: PeriodMetrics[] = periods.map(p => {
      const pStartStr = format(p.start, 'yyyy-MM-dd');
      const pEndStr = format(p.end, 'yyyy-MM-dd');

      const periodSales = salesData.filter(s => {
        const d = s.economic_day;
        return d && d >= pStartStr && d <= pEndStr;
      });

      const periodInsights = metaInsights.filter(m => {
        const d = m.date_start?.slice(0, 10);
        return d && d >= pStartStr && d <= pEndStr;
      });

      const revenue = periodSales.reduce(
        (sum, s) => sum + (s.gross_amount || 0), 0,
      );
      const spend = periodInsights.reduce(
        (sum, m) => sum + (Number(m.spend) || 0), 0,
      );
      const sales = periodSales.length;
      const uniqueBuyers = new Set(
        periodSales
          .map(s => s.buyer_email)
          .filter(Boolean),
      ).size;

      return {
        label: p.label,
        startDate: pStartStr,
        endDate: pEndStr,
        sales,
        revenue,
        spend,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: sales > 0 ? spend / sales : 0,
        avgTicket: sales > 0 ? revenue / sales : 0,
        uniqueBuyers,
      };
    });

    return results;
  }, [salesData, metaInsights, startDateStr, endDateStr, mode]);
}
