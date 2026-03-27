import { ArrowRight } from 'lucide-react';

/* ── Types ───────────────────────────────────────────── */

interface MetaFunnelData {
  linkClicks: number;
  landingPageViews: number;
  initiateCheckouts: number;
  purchases: number;
  connectRate: number;
  txPaginaCheckout: number;
  txCheckoutCompra: number;
}

/* ── Helpers ─────────────────────────────────────────── */

type Status = 'excellent' | 'good' | 'warning' | 'danger';

function rateStatus(
  value: number,
  thresholds: [number, number, number],
): { status: Status; label: string } {
  const [excellent, good, warning] = thresholds;
  if (value >= excellent) return { status: 'excellent', label: 'Ótimo' };
  if (value >= good) return { status: 'good', label: 'Bom' };
  if (value >= warning) return { status: 'warning', label: 'Pode melhorar' };
  return { status: 'danger', label: 'Precisa de ajustes' };
}

const STATUS_COLORS: Record<Status, {
  text: string; bg: string; ring: string;
}> = {
  excellent: {
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    ring: 'ring-green-500/30',
  },
  good: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/30',
  },
  warning: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    ring: 'ring-yellow-500/30',
  },
  danger: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/30',
  },
};

const fmt = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(1).replace('.0', '')}k`
    : String(v);

/* ── Component ───────────────────────────────────────── */

interface Props {
  data: MetaFunnelData;
}

export function MetaConversionFunnel({ data }: Props) {
  if (data.linkClicks === 0) return null;

  const connectInfo = rateStatus(
    data.connectRate, [81, 70, 55],
  );
  const txPagInfo = rateStatus(
    data.txPaginaCheckout, [35, 25, 15],
  );
  const txChkInfo = rateStatus(
    data.txCheckoutCompra, [50, 35, 20],
  );

  const steps: {
    label: string;
    value: string;
    sub?: string;
    rate?: { pct: string; status: Status; label: string };
    color: string;
  }[] = [
    {
      label: 'Cliques',
      value: fmt(data.linkClicks),
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Visitas Página',
      value: fmt(data.landingPageViews),
      rate: {
        pct: `${data.connectRate.toFixed(1)}%`,
        status: connectInfo.status,
        label: connectInfo.label,
      },
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      label: 'Checkouts',
      value: fmt(data.initiateCheckouts),
      rate: {
        pct: `${data.txPaginaCheckout.toFixed(1)}%`,
        status: txPagInfo.status,
        label: txPagInfo.label,
      },
      color: 'bg-orange-500/10 text-orange-400',
    },
    {
      label: 'Compras',
      value: fmt(data.purchases),
      rate: {
        pct: `${data.txCheckoutCompra.toFixed(1)}%`,
        status: txChkInfo.status,
        label: txChkInfo.label,
      },
      color: 'bg-green-500/10 text-green-400',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="contents">
          {/* Arrow between steps */}
          {i > 0 && (
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              {step.rate && (
                <span className={`
                  text-[10px] font-bold tabular-nums
                  ${STATUS_COLORS[step.rate.status].text}
                `}>
                  {step.rate.pct}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
              {step.rate && (
                <span className={`
                  text-[9px]
                  ${STATUS_COLORS[step.rate.status].text}
                `}>
                  {step.rate.label}
                </span>
              )}
            </div>
          )}

          {/* Step card */}
          <div className={`
            flex-1 min-w-[100px] max-w-[160px]
            rounded-lg border border-border/40 p-3
            ${step.rate
              ? `ring-1 ${STATUS_COLORS[step.rate.status].ring}`
              : ''
            }
          `}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {step.label}
            </p>
            <p className={`text-xl font-extrabold tabular-nums mt-0.5 ${step.color.split(' ')[1]}`}>
              {step.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
