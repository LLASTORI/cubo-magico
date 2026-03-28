import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FunnelScoreResult } from '@/hooks/useFunnelScore';

function rateColor(score: number): string {
  if (score >= 80) return 'text-green-300';
  if (score >= 60) return 'text-white/90';
  if (score >= 40) return 'text-yellow-300';
  return 'text-red-300';
}

function rateBg(score: number): string {
  if (score >= 80) return 'bg-green-400/20';
  if (score >= 60) return 'bg-white/10';
  if (score >= 40) return 'bg-yellow-400/20';
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

  const detailItems = [
    score.details.positions,
    score.details.connect,
    score.details.txPagina,
    score.details.txCheckout,
  ].filter(d => d.score !== null);

  return (
    <div className="space-y-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              relative overflow-hidden p-5 cursor-help
              bg-gradient-to-br shadow-lg
              ${score.bottleneck
                ? 'rounded-t-xl'
                : 'rounded-xl'
              }
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

              {/* Right: breakdown with real rates */}
              {detailItems.length > 0 && (
                <div className="hidden md:flex flex-col gap-1.5 shrink-0">
                  {detailItems.map(item => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2"
                    >
                      <span className="text-[11px] text-white/50 w-[130px] text-right">
                        {item.label}
                      </span>
                      {item.rate !== null ? (
                        <span className={`
                          text-xs font-bold tabular-nums
                          px-1.5 py-0.5 rounded
                          ${rateBg(item.score!)}
                          ${rateColor(item.score!)}
                        `}>
                          {item.rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className={`
                          text-xs font-bold tabular-nums
                          px-1.5 py-0.5 rounded
                          ${rateBg(item.score!)}
                          ${rateColor(item.score!)}
                        `}>
                          {item.score}/100
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[360px] bg-[#1a1f2e] border-border p-3"
        >
          <p className="font-semibold mb-2">
            Como o Score é calculado?
          </p>
          <div className="space-y-1.5 text-xs">
            {detailItems.map(item => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-muted-foreground">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  {item.rate !== null && (
                    <span className="text-muted-foreground">
                      {item.rate.toFixed(1)}%
                    </span>
                  )}
                  <span className={
                    item.score! >= 80
                      ? 'text-green-400 font-semibold'
                      : item.score! >= 60
                        ? 'text-foreground'
                        : item.score! >= 40
                          ? 'text-yellow-400 font-semibold'
                          : 'text-red-400 font-semibold'
                  }>
                    score {item.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
            Sub-scores abaixo de 50 penalizam o total.
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Bottleneck diagnostic */}
      {score.bottleneck && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-b-xl bg-red-500/10 border border-t-0 border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300 leading-relaxed">
            {score.bottleneck}
          </p>
        </div>
      )}
    </div>
  );
}
