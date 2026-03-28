import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ConversionDay } from '@/hooks/useConversionTimeline';

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ConversionDay;
  if (!d) return null;

  return (
    <div className="bg-[#1a1f2e] border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1.5">
        {d.dateLabel}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            Visitas Página
          </span>
          <span className="text-purple-400 font-medium">
            {d.landingPageViews}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            Checkouts
          </span>
          <span className="text-orange-400 font-medium">
            {d.initiateCheckouts}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            Compras
          </span>
          <span className="text-green-400 font-medium">
            {d.purchases}
          </span>
        </div>
        <div className="border-t border-border/50 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              TX Pág→Compra
            </span>
            <span className={`font-bold ${
              d.txPagCompra >= 10 ? 'text-green-400'
                : d.txPagCompra >= 7 ? 'text-blue-400'
                  : 'text-red-400'
            }`}>
              {d.txPagCompra.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              TX Pág→Checkout
            </span>
            <span className="text-foreground">
              {d.txPagCheckout.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              TX Checkout→Compra
            </span>
            <span className="text-foreground">
              {d.txCheckoutCompra.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  data: ConversionDay[];
  avgTxPagCompra: number;
}

export function ConversionTimelineChart({
  data, avgTxPagCompra,
}: Props) {
  if (data.length === 0) return null;

  // Only show days with data
  const daysWithData = data.filter(
    d => d.landingPageViews > 0,
  );
  if (daysWithData.length < 2) return null;

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={daysWithData}
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
            yAxisId="pct"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
          />

          {/* Benchmark lines */}
          <ReferenceLine
            yAxisId="pct"
            y={7}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeOpacity={0.4}
            label={{
              value: '7%',
              position: 'right',
              fontSize: 9,
              fill: '#ef4444',
            }}
          />
          <ReferenceLine
            yAxisId="pct"
            y={10}
            stroke="#22c55e"
            strokeDasharray="5 5"
            strokeOpacity={0.4}
            label={{
              value: '10%',
              position: 'right',
              fontSize: 9,
              fill: '#22c55e',
            }}
          />

          {/* Average line */}
          <ReferenceLine
            yAxisId="pct"
            y={avgTxPagCompra}
            stroke="#f59e0b"
            strokeDasharray="8 4"
            strokeWidth={2}
            strokeOpacity={0.7}
          />

          {/* TX Pag→Compra bars */}
          <Bar
            yAxisId="pct"
            dataKey="txPagCompra"
            name="TX Pág→Compra"
            radius={[3, 3, 0, 0]}
            fill="#3b82f6"
            fillOpacity={0.6}
          />

          {/* TX Pag→Checkout line */}
          <Line
            yAxisId="pct"
            dataKey="txPagCheckout"
            stroke="#a855f7"
            strokeWidth={1.5}
            dot={false}
            name="TX Pág→Checkout"
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
          <span className="w-3 h-2 rounded-sm bg-blue-500/60" />
          TX Pág→Compra (diária)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 bg-purple-500 rounded" />
          TX Pág→Checkout
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5" style={{ borderTop: '2px dashed #f59e0b' }} />
          Média ({avgTxPagCompra.toFixed(1)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5" style={{ borderTop: '2px dashed #ef4444' }} />
          Ruim (&lt;7%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5" style={{ borderTop: '2px dashed #22c55e' }} />
          Excelente (&gt;10%)
        </span>
      </div>
    </div>
  );
}
