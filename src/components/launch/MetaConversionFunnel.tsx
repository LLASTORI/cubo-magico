import { ArrowRight, MousePointerClick, Globe, ShoppingCart, CreditCard } from 'lucide-react';

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

const STATUS_STYLES: Record<Status, {
  text: string; bg: string; ring: string; badge: string;
}> = {
  excellent: {
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    ring: 'ring-1 ring-green-500/30',
    badge: 'bg-green-500/15 text-green-400 border-green-500/25',
  },
  good: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-1 ring-blue-500/30',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  },
  warning: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    ring: 'ring-1 ring-yellow-500/30',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  },
  danger: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    ring: 'ring-1 ring-red-500/30',
    badge: 'bg-red-500/15 text-red-400 border-red-500/25',
  },
};

const fmtNum = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(1).replace('.0', '')}k`
    : String(v);

/* ── Component ───────────────────────────────────────── */

interface Props {
  data: MetaFunnelData;
}

export function MetaConversionFunnel({ data }: Props) {
  if (data.linkClicks === 0) return null;

  const connectInfo = rateStatus(data.connectRate, [81, 70, 55]);
  const txPagInfo = rateStatus(data.txPaginaCheckout, [35, 25, 15]);
  const txChkInfo = rateStatus(data.txCheckoutCompra, [50, 35, 20]);

  // TX end-to-end: Página → Compra
  // Benchmark: ≥10% excelente, ≥8% bom, ≥7% pode melhorar, <7% ruim
  const txPagCompra = data.landingPageViews > 0
    ? (data.purchases / data.landingPageViews) * 100 : 0;
  const txPagCompraInfo = rateStatus(txPagCompra, [10, 8, 7]);

  const steps = [
    {
      icon: <MousePointerClick className="w-4 h-4" />,
      label: 'Cliques',
      value: fmtNum(data.linkClicks),
      iconColor: 'text-blue-400',
    },
    {
      icon: <Globe className="w-4 h-4" />,
      label: 'Visitas Página',
      value: fmtNum(data.landingPageViews),
      iconColor: 'text-purple-400',
      rate: {
        pct: `${data.connectRate.toFixed(1)}%`,
        ...connectInfo,
      },
    },
    {
      icon: <ShoppingCart className="w-4 h-4" />,
      label: 'Checkouts',
      value: fmtNum(data.initiateCheckouts),
      iconColor: 'text-orange-400',
      rate: {
        pct: `${data.txPaginaCheckout.toFixed(1)}%`,
        ...txPagInfo,
      },
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      label: 'Compras',
      value: fmtNum(data.purchases),
      iconColor: 'text-green-400',
      rate: {
        pct: `${data.txCheckoutCompra.toFixed(1)}%`,
        ...txChkInfo,
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Funnel steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <div key={step.label} className="relative">
            {/* Rate badge between cards (mobile: hidden) */}
            {i > 0 && step.rate && (
              <div className="hidden sm:flex absolute -left-[18px] top-1/2 -translate-y-1/2 z-10 flex-col items-center">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30" />
              </div>
            )}

            <div className={`
              rounded-xl border border-border/50 p-4
              bg-card
              ${step.rate ? STATUS_STYLES[step.rate.status].ring : ''}
            `}>
              {/* Rate label above card */}
              {step.rate && (
                <div className="flex items-center justify-between mb-2">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-md
                    text-[10px] font-semibold border
                    ${STATUS_STYLES[step.rate.status].badge}
                  `}>
                    {step.rate.label}
                  </span>
                  <span className={`
                    text-lg font-bold tabular-nums
                    ${STATUS_STYLES[step.rate.status].text}
                  `}>
                    {step.rate.pct}
                  </span>
                </div>
              )}

              {/* Icon + Label */}
              <div className="flex items-center gap-2 mb-1">
                <span className={step.iconColor}>{step.icon}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {step.label}
                </span>
              </div>

              {/* Value */}
              <p className={`text-3xl font-extrabold tabular-nums ${step.iconColor}`}>
                {step.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* End-to-end metric */}
      {(() => {
        // Identify worst step for diagnostic
        const stepsAnalysis = [
          { name: 'Connect Rate', rate: data.connectRate, info: connectInfo, ideal: 81, action: 'Verifique velocidade da página e congruência anúncio→LP' },
          { name: 'Página→Checkout', rate: data.txPaginaCheckout, info: txPagInfo, ideal: 35, action: 'Revise a copy, oferta, preço e prova social da página de vendas' },
          { name: 'Checkout→Compra', rate: data.txCheckoutCompra, info: txChkInfo, ideal: 50, action: 'Verifique formas de pagamento, parcelamento e fricção no checkout' },
        ];
        const worstStep = stepsAnalysis
          .filter(s => s.info.status === 'danger' || s.info.status === 'warning')
          .sort((a, b) => a.rate - b.rate)[0];

        return (
          <div className={`
            rounded-xl border p-4
            ${STATUS_STYLES[txPagCompraInfo.status].ring}
            ${STATUS_STYLES[txPagCompraInfo.status].bg}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  TX Página → Compra (end-to-end)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`
                  text-xs px-2 py-0.5 rounded border font-semibold
                  ${STATUS_STYLES[txPagCompraInfo.status].badge}
                `}>
                  {txPagCompraInfo.label}
                </span>
                <span className={`
                  text-2xl font-extrabold tabular-nums
                  ${STATUS_STYLES[txPagCompraInfo.status].text}
                `}>
                  {txPagCompra.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
              <span className="text-xs text-muted-foreground">
                {data.purchases} compras de {fmtNum(data.landingPageViews)} visitas
              </span>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>
              <span className="text-red-400 font-medium">&lt;7%</span> ruim
            </span>
            <span>
              <span className="text-blue-400 font-medium">7–10%</span> bom
            </span>
            <span>
              <span className="text-green-400 font-medium">&gt;10%</span> excelente
            </span>
          </div>
        </div>

            {/* Bottleneck diagnostic */}
            {worstStep && (
              <div className="mt-2 pt-2 border-t border-border/30 flex items-start gap-2">
                <span className="text-xs text-amber-400 font-semibold shrink-0">
                  Gargalo:
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className={`font-semibold ${STATUS_STYLES[worstStep.info.status].text}`}>
                    {worstStep.name} ({worstStep.rate.toFixed(1)}%)
                  </span>
                  {' — '}
                  {worstStep.action}
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
