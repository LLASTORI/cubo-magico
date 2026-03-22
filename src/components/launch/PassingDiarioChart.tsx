import { useMemo } from 'react';
import {
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ComposedChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PassingDiarioItem } from '@/hooks/useLaunchEditionData';

interface Props {
  data: PassingDiarioItem[];
}

const STATUS_COLORS = {
  above: '#22c55e',
  near: '#f59e0b',
  below: '#ef4444',
} as const;

export function PassingDiarioChart({ data }: Props) {
  const totalIngressos = data.reduce((s, d) => s + d.ingressos, 0);
  const metaTotal = data.length > 0 ? data[0].meta * data.length : 0;
  const pctAtingido = metaTotal > 0 ? (totalIngressos / metaTotal) * 100 : 0;
  const mediaReal = data.length > 0 ? totalIngressos / data.length : 0;
  const hoje = new Date().toISOString().split('T')[0];
  const diasRestantes = data.filter(d => d.date > hoje).length;

  const chartData = useMemo(
    () => data.map(d => ({ ...d, label: format(parseISO(d.date), 'dd/MM', { locale: ptBR }) })),
    [data]
  );

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sem dados de vendas para o período de ingressos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(value: number, name: string) =>
              [value, name === 'ingressos' ? 'Ingressos' : 'Meta diária']
            }
            labelFormatter={(label) => `Dia ${label}`}
          />
          <Bar dataKey="ingressos" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="meta"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Meta diária"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-sm">
        <Stat label="Ingressos" value={totalIngressos} />
        <Stat label="Meta total" value={metaTotal} />
        <Stat label="% Atingido" value={`${pctAtingido.toFixed(0)}%`} />
        <Stat label="Média/dia" value={mediaReal.toFixed(1)} />
        <Stat label="Dias restantes" value={diasRestantes} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
