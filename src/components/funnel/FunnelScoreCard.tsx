import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FunnelScoreResult } from '@/hooks/useFunnelScore';

function scoreColor(value: number): string {
  if (value >= 80) return 'text-green-300';
  if (value >= 60) return 'text-white/90';
  if (value >= 40) return 'text-yellow-300';
  return 'text-red-300';
}

function scoreBg(value: number): string {
  if (value >= 80) return 'bg-green-400/20';
  if (value >= 60) return 'bg-white/10';
  if (value >= 40) return 'bg-yellow-400/20';
  return 'bg-red-400/20';
}

interface FunnelScoreCardProps {
  score: FunnelScoreResult;
  funnelName?: string;
}

export function FunnelScoreCard({
  score, funnelName,
}: FunnelScoreCardProps) {
  const circumference = 2 * Math.PI * 35;
  const dashLength = (score.score / 100) * circumference;

  const breakdownItems: {
    label: string;
    value: number | null;
    weight: string;
  }[] = [
    {
      label: 'Posições',
      value: score.breakdown.positionScore,
      weight: '40%',
    },
    {
      label: 'Connect Rate',
      value: score.breakdown.connectScore,
      weight: '20%',
    },
    {
      label: 'TX Pag→Checkout',
      value: score.breakdown.txPaginaScore,
      weight: '20%',
    },
    {
      label: 'TX Checkout→Compra',
      value: score.breakdown.txCheckoutScore,
      weight: '20%',
    },
  ];

  const activeItems = breakdownItems.filter(
    b => b.value !== null,
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`
            relative overflow-hidden rounded-xl p-5
            bg-gradient-to-br shadow-lg cursor-help
            ${score.gradient}
          `}
        >
          <div className="flex items-start justify-between text-white gap-6">
            {/* Left: ring + info */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    cx="40" cy="40" r="35"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="40" cy="40" r="35"
                    stroke="white"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${dashLength} ${circumference}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black">
                    {score.score}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {score.statusLabel}
                  </span>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs">
                    {score.score}/100
                  </Badge>
                </div>
                <p className="text-sm text-white/80 max-w-sm mt-1">
                  {score.message}
                </p>
                {funnelName && (
                  <p className="text-xs text-white/40 mt-1">
                    {funnelName}
                  </p>
                )}
              </div>
            </div>

            {/* Right: breakdown with colors */}
            {activeItems.length > 0 && (
              <div className="hidden md:flex flex-col gap-1.5 shrink-0">
                {activeItems.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[11px] text-white/50 w-[130px] text-right">
                      {item.label}
                    </span>
                    <span className={`
                      text-xs font-bold tabular-nums
                      px-1.5 py-0.5 rounded
                      ${scoreBg(item.value!)}
                      ${scoreColor(item.value!)}
                    `}>
                      {item.value}
                    </span>
                    <span className="text-[9px] text-white/30">
                      ({item.weight})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-[340px] bg-[#1a1f2e] border-border p-3"
      >
        <p className="font-semibold mb-2">
          Como o Score é calculado?
        </p>
        <div className="space-y-1 text-xs">
          {breakdownItems.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between"
            >
              <span className="text-muted-foreground">
                {item.label} ({item.weight})
              </span>
              <span className={
                item.value !== null
                  ? item.value >= 80
                    ? 'text-green-400 font-semibold'
                    : item.value >= 60
                      ? 'text-foreground'
                      : item.value >= 40
                        ? 'text-yellow-400 font-semibold'
                        : 'text-red-400 font-semibold'
                  : 'text-muted-foreground'
              }>
                {item.value !== null
                  ? `${item.value}/100`
                  : 'sem dados'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
          Se qualquer sub-score &lt; 40, o total recebe
          penalidade proporcional ao gargalo.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
