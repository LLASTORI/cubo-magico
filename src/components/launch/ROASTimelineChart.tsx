import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ROASDay } from '@/hooks/useROASTimeline';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ROASDay;
  if (!d) return null;

  return (
    <div className="bg-[#1a1f2e] border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1.5">
        {d.dateLabel}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            Investimento
          </span>
          <span className="text-red-400 font-medium">
            {fmt(d.spend)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            Faturamento
          </span>
          <span className="text-green-400 font-medium">
            {fmt(d.revenue)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Vendas</span>
          <span className="text-foreground font-medium">
            {d.sales}
          </span>
        </div>
        <div className="border-t border-border/50 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              ROAS dia
            </span>
            <span className={`font-bold ${
              d.roas >= 2 ? 'text-green-400'
                : d.roas >= 1 ? 'text-blue-400'
                  : 'text-red-400'
            }`}>
              {d.roas.toFixed(2)}x
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              ROAS acumulado
            </span>
            <span className={`font-bold ${
              d.roasAccum >= 2 ? 'text-green-400'
                : d.roasAccum >= 1 ? 'text-blue-400'
                  : 'text-red-400'
            }`}>
              {d.roasAccum.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  data: ROASDay[];
}

export function ROASTimelineChart({ data }: Props) {
  if (data.length === 0) return null;

  // Summary stats
  const totalRevenue = data.reduce(
    (s, d) => s + d.revenue, 0,
  );
  const totalSpend = data.reduce(
    (s, d) => s + d.spend, 0,
  );
  const totalROAS = totalSpend > 0
    ? totalRevenue / totalSpend : 0;

  // Days with positive ROAS
  const daysAbove1 = data.filter(
    d => d.roas >= 1 && d.spend > 0,
  ).length;
  const daysWithSpend = data.filter(
    d => d.spend > 0,
  ).length;
  const pctAbove1 = daysWithSpend > 0
    ? (daysAbove1 / daysWithSpend) * 100 : 0;

  // Trend: compare first half vs second half
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid).filter(
    d => d.spend > 0,
  );
  const secondHalf = data.slice(mid).filter(
    d => d.spend > 0,
  );
  const roasFirst = firstHalf.length > 0
    ? firstHalf.reduce((s, d) => s + d.revenue, 0) /
      firstHalf.reduce((s, d) => s + d.spend, 0)
    : 0;
  const roasSecond = secondHalf.length > 0
    ? secondHalf.reduce((s, d) => s + d.revenue, 0) /
      secondHalf.reduce((s, d) => s + d.spend, 0)
    : 0;

  let trendLabel = '';
  let trendColor = '';
  if (roasFirst > 0 && roasSecond > 0) {
    const diff = roasSecond - roasFirst;
    if (diff > 0.2) {
      trendLabel = 'Melhorando';
      trendColor = 'text-green-400';
    } else if (diff < -0.2) {
      trendLabel = 'Caindo';
      trendColor = 'text-red-400';
    } else {
      trendLabel = 'Estável';
      trendColor = 'text-blue-400';
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            ROAS total:
          </span>
          <span className={`font-bold text-sm ${
            totalROAS >= 2 ? 'text-green-400'
              : totalROAS >= 1 ? 'text-blue-400'
                : 'text-red-400'
          }`}>
            {totalROAS.toFixed(2)}x
          </span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            Dias ROAS ≥ 1x:
          </span>
          <span className="font-medium text-foreground">
            {daysAbove1}/{daysWithSpend}
            <span className="text-muted-foreground ml-1">
              ({pctAbove1.toFixed(0)}%)
            </span>
          </span>
        </div>
        {trendLabel && (
          <>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">
                Tendência:
              </span>
              <span className={`font-semibold ${trendColor}`}>
                {trendLabel}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border/30"
          />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="roas"
            orientation="right"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            domain={[0, 'auto']}
          />
          <YAxis
            yAxisId="money"
            orientation="left"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000
                ? `${(v / 1000).toFixed(0)}k`
                : String(v)
            }
          />

          {/* Reference line at ROAS 1x */}
          <ReferenceLine
            yAxisId="roas"
            y={1}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />

          {/* Spend bars */}
          <Bar
            yAxisId="money"
            dataKey="spend"
            fill="#ef4444"
            fillOpacity={0.3}
            radius={[2, 2, 0, 0]}
            name="Invest."
          />

          {/* Revenue bars */}
          <Bar
            yAxisId="money"
            dataKey="revenue"
            fill="#22c55e"
            fillOpacity={0.4}
            radius={[2, 2, 0, 0]}
            name="Fat."
          />

          {/* ROAS line (daily) */}
          <Line
            yAxisId="roas"
            dataKey="roas"
            stroke="#60a5fa"
            strokeWidth={1.5}
            dot={false}
            name="ROAS dia"
          />

          {/* ROAS accumulated line */}
          <Line
            yAxisId="roas"
            dataKey="roasAccum"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            name="ROAS acum."
          />

          <RechartsTooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-red-500/30" />
          Investimento
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-green-500/40" />
          Faturamento
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 bg-blue-400 rounded" />
          ROAS diário
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-400 border-dashed" style={{ borderTop: '2px dashed #f59e0b' }} />
          ROAS acumulado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5" style={{ borderTop: '2px dashed #ef4444' }} />
          ROAS 1x (breakeven)
        </span>
      </div>
    </div>
  );
}
