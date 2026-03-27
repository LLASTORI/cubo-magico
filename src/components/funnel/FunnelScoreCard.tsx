import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FunnelScoreResult } from '@/hooks/useFunnelScore';

interface FunnelScoreCardProps {
  score: FunnelScoreResult;
  funnelName?: string;
}

export function FunnelScoreCard({
  score, funnelName,
}: FunnelScoreCardProps) {
  const circumference = 2 * Math.PI * 35; // r=35
  const dashLength = (score.score / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`
            relative overflow-hidden rounded-xl p-4
            bg-gradient-to-br shadow-lg cursor-help
            ${score.gradient}
          `}
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              {/* SVG ring */}
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
                <p className="text-sm text-white/80 max-w-md mt-1">
                  {score.message}
                </p>
              </div>
            </div>

            {/* Breakdown (desktop) */}
            <div className="hidden md:flex flex-col items-end text-right text-xs text-white/70 space-y-1">
              {score.breakdown.positionScore !== null && (
                <span>Posições: {score.breakdown.positionScore}/100</span>
              )}
              {score.breakdown.connectScore !== null && (
                <span>Connect Rate: {score.breakdown.connectScore}/100</span>
              )}
              {score.breakdown.txPaginaScore !== null && (
                <span>TX Pag→Checkout: {score.breakdown.txPaginaScore}/100</span>
              )}
              {score.breakdown.txCheckoutScore !== null && (
                <span>TX Checkout→Compra: {score.breakdown.txCheckoutScore}/100</span>
              )}
            </div>
          </div>

          {funnelName && (
            <p className="text-xs text-white/50 mt-2">
              {funnelName}
            </p>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-[320px]"
      >
        <p className="font-semibold mb-1">
          Como o Score é calculado?
        </p>
        <ul className="text-xs space-y-0.5">
          <li>Posições do Funil (OBs/USs/DSs): 40%</li>
          <li>Connect Rate (LP/cliques): 20%</li>
          <li>TX Página → Checkout: 20%</li>
          <li>TX Checkout → Compra: 20%</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-1">
          Apenas métricas com dados entram no cálculo.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
