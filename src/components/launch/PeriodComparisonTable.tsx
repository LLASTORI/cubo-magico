import {
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import type { PeriodMetrics } from '@/hooks/usePeriodComparison';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

function Trend({
  current, previous, invert,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (previous === 0) return <Minus className="w-3 h-3 text-slate-500" />;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  const isGood = invert ? !isUp : isUp;
  const abs = Math.abs(pct);

  if (abs < 1) return <Minus className="w-3 h-3 text-slate-500" />;

  return (
    <span className={`
      inline-flex items-center gap-0.5 text-[10px] font-semibold
      ${isGood ? 'text-emerald-400' : 'text-red-400'}
    `}>
      {isUp
        ? <ArrowUpRight className="w-3 h-3" />
        : <ArrowDownRight className="w-3 h-3" />
      }
      {abs.toFixed(0)}%
    </span>
  );
}

interface Props {
  periods: PeriodMetrics[];
}

export function PeriodComparisonTable({ periods }: Props) {
  if (periods.length < 2) return null;

  const rows: {
    label: string;
    key: keyof PeriodMetrics;
    format: (v: number) => string;
    invert?: boolean;
  }[] = [
    {
      label: 'Vendas',
      key: 'sales',
      format: (v) => String(v),
    },
    {
      label: 'Faturamento',
      key: 'revenue',
      format: fmt,
    },
    {
      label: 'Investimento',
      key: 'spend',
      format: fmt,
      invert: true,
    },
    {
      label: 'ROAS',
      key: 'roas',
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      label: 'CPA',
      key: 'cpa',
      format: fmt,
      invert: true,
    },
    {
      label: 'Ticket Médio',
      key: 'avgTicket',
      format: fmt,
    },
    {
      label: 'Compradores',
      key: 'uniqueBuyers',
      format: (v) => String(v),
    },
  ];

  // Find best period (highest revenue)
  const bestIdx = periods.reduce(
    (best, p, i) =>
      p.revenue > periods[best].revenue ? i : best,
    0,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-muted-foreground font-medium">
              Métrica
            </th>
            {periods.map((p, i) => (
              <th
                key={p.label}
                className={`
                  text-right py-2 px-3 font-medium
                  ${i === bestIdx
                    ? 'text-cyan-400'
                    : 'text-muted-foreground'
                  }
                `}
              >
                {p.label}
                {i === bestIdx && (
                  <span className="ml-1 text-[9px] text-cyan-500/60">
                    melhor
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-b border-border/40 hover:bg-muted/20 transition-colors"
            >
              <td className="py-2 pr-4 text-muted-foreground">
                {row.label}
              </td>
              {periods.map((p, i) => {
                const val = p[row.key] as number;
                const prev = i > 0
                  ? periods[i - 1][row.key] as number
                  : null;

                const isRevenue =
                  row.key === 'revenue' || row.key === 'roas';
                const isBest = i === bestIdx && isRevenue;

                return (
                  <td
                    key={p.label}
                    className={`
                      text-right py-2 px-3 tabular-nums
                      ${isBest
                        ? 'text-cyan-400 font-semibold'
                        : 'text-foreground'
                      }
                    `}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {row.format(val)}
                      {prev !== null && (
                        <Trend
                          current={val}
                          previous={prev}
                          invert={row.invert}
                        />
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
