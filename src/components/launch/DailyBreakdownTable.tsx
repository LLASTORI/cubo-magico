import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { CalendarDays } from 'lucide-react';
import { LotAnalysis } from '@/types/launch-lots';

interface SaleRecord {
  offer_code?: string | null;
  gross_amount: number;
  all_offer_codes?: string[] | null;
  economic_day?: string;
  meta_campaign_id?: string | null;
}

interface MetaInsight {
  date_start: string;
  spend: number;
}

interface DailyBreakdownTableProps {
  salesData: SaleRecord[];
  metaInsights: MetaInsight[];
  lotsAnalysis: LotAnalysis[];
  startDate: string; // ISO
  endDate: string;   // ISO
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

export function DailyBreakdownTable({
  salesData, metaInsights, lotsAnalysis, startDate, endDate,
}: DailyBreakdownTableProps) {
  // Descobrir colunas dinâmicas de OBs a partir dos lotes
  const offerColumns = useMemo(() => {
    const cols: { role: string; label: string; code: string }[] = [];
    const seen = new Set<string>();

    // FRONT primeiro
    for (const la of lotsAnalysis) {
      for (const o of la.lot.offers) {
        if (seen.has(o.codigo_oferta || '')) continue;
        seen.add(o.codigo_oferta || '');
        if (o.role === 'front') {
          cols.push({
            role: o.role,
            label: 'FRONT',
            code: o.codigo_oferta || '',
          });
        }
      }
    }
    // Depois OBs ordenados
    for (const la of lotsAnalysis) {
      for (const o of la.lot.offers) {
        if (seen.has(o.codigo_oferta || '') && o.role !== 'front') continue;
        if (o.role === 'front') continue;
        seen.add(o.codigo_oferta || '');
        const match = o.role.match(/^(bump|upsell|downsell)_(\d+)$/);
        const labels: Record<string, string> = {
          bump: 'OB', upsell: 'US', downsell: 'DS',
        };
        const label = match
          ? `${labels[match[1]] || match[1]}${match[2]}`
          : o.role;
        cols.push({
          role: o.role,
          label,
          code: o.codigo_oferta || '',
        });
      }
    }
    return cols;
  }, [lotsAnalysis]);

  // Agregar por dia
  const dailyData = useMemo(() => {
    const start = startDate.slice(0, 10);
    const end = endDate.slice(0, 10);

    // Spend por dia
    const spendByDay: Record<string, number> = {};
    for (const m of metaInsights) {
      const d = m.date_start?.slice(0, 10);
      if (d) spendByDay[d] = (spendByDay[d] || 0) + (Number(m.spend) || 0);
    }

    // Vendas por dia: FRONT (main_offer_code) e OBs (all_offer_codes)
    const frontCodes = offerColumns
      .filter(c => c.role === 'front')
      .map(c => c.code);

    const salesByDay: Record<string, {
      revenue: number;
      frontCount: number;
      obCounts: Record<string, number>;
    }> = {};

    for (const sale of salesData) {
      const day = sale.economic_day;
      if (!day) continue;

      if (!salesByDay[day]) {
        salesByDay[day] = { revenue: 0, frontCount: 0, obCounts: {} };
      }

      salesByDay[day].revenue += sale.gross_amount || 0;

      // FRONT
      if (sale.offer_code && frontCodes.includes(sale.offer_code)) {
        salesByDay[day].frontCount++;
      }

      // OBs
      for (const col of offerColumns) {
        if (col.role === 'front') continue;
        if (sale.all_offer_codes?.includes(col.code)) {
          salesByDay[day].obCounts[col.code] =
            (salesByDay[day].obCounts[col.code] || 0) + 1;
        }
      }
    }

    // Gerar array de dias
    const result: {
      date: string;
      dateLabel: string;
      spend: number;
      revenue: number;
      frontCount: number;
      obCounts: Record<string, number>;
    }[] = [];

    const cur = parseISO(start);
    const endD = parseISO(end);
    while (cur <= endD) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayData = salesByDay[dateStr];
      result.push({
        date: dateStr,
        dateLabel: format(cur, 'dd/MM', { locale: ptBR }),
        spend: spendByDay[dateStr] || 0,
        revenue: dayData?.revenue || 0,
        frontCount: dayData?.frontCount || 0,
        obCounts: dayData?.obCounts || {},
      });
      cur.setDate(cur.getDate() + 1);
    }

    return result;
  }, [salesData, metaInsights, offerColumns, startDate, endDate]);

  // Totais
  const totals = useMemo(() => {
    const t = {
      spend: 0, revenue: 0, frontCount: 0,
      obCounts: {} as Record<string, number>,
    };
    for (const d of dailyData) {
      t.spend += d.spend;
      t.revenue += d.revenue;
      t.frontCount += d.frontCount;
      for (const [code, count] of Object.entries(d.obCounts)) {
        t.obCounts[code] = (t.obCounts[code] || 0) + count;
      }
    }
    return t;
  }, [dailyData]);

  if (dailyData.length === 0) return null;

  const obColumns = offerColumns.filter(c => c.role !== 'front');

  return (
    <Card className="overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Acompanhamento Diário</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px]">
              <TableHead className="py-2 sticky left-0 bg-background z-10">
                Data
              </TableHead>
              <TableHead className="text-right py-2">Invest.</TableHead>
              <TableHead className="text-right py-2">Faturado</TableHead>
              <TableHead className="text-right py-2">FRONT</TableHead>
              {obColumns.map(col => (
                <TableHead key={col.code} className="text-right py-2">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyData.map(day => {
              const hasData = day.frontCount > 0 || day.spend > 0;
              return (
                <TableRow
                  key={day.date}
                  className={`text-xs ${!hasData ? 'opacity-40' : ''}`}
                >
                  <TableCell className="py-1.5 font-mono sticky left-0 bg-background z-10">
                    {day.dateLabel}
                  </TableCell>
                  <TableCell className="text-right py-1.5 text-red-400">
                    {day.spend > 0 ? fmt(day.spend) : '—'}
                  </TableCell>
                  <TableCell className="text-right py-1.5 text-green-400 font-semibold">
                    {day.revenue > 0 ? fmt(day.revenue) : '—'}
                  </TableCell>
                  <TableCell className="text-right py-1.5 font-bold">
                    {day.frontCount || '—'}
                  </TableCell>
                  {obColumns.map(col => (
                    <TableCell key={col.code} className="text-right py-1.5">
                      {day.obCounts[col.code] || '—'}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}

            {/* Linha TOTAL */}
            <TableRow className="bg-muted/30 font-bold text-xs border-t-2">
              <TableCell className="py-2 sticky left-0 bg-muted/30 z-10">
                TOTAL
              </TableCell>
              <TableCell className="text-right py-2 text-red-400">
                {fmt(totals.spend)}
              </TableCell>
              <TableCell className="text-right py-2 text-green-400">
                {fmt(totals.revenue)}
              </TableCell>
              <TableCell className="text-right py-2">
                {totals.frontCount}
              </TableCell>
              {obColumns.map(col => (
                <TableCell key={col.code} className="text-right py-2">
                  {totals.obCounts[col.code] || 0}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
