import { Users, TrendingUp, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { LTVResult } from '@/hooks/useLTVAnalysis';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const show = Math.min(3, local.length);
  return `${local.slice(0, show)}***@${domain}`;
}

interface Props {
  data: LTVResult;
}

export function LTVAnalysisCard({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* KPIs row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi
          label="LTV Médio"
          value={fmtFull(data.avgLTV)}
          accent="cyan"
        />
        <MiniKpi
          label="LTV Mediano"
          value={fmtFull(data.medianLTV)}
          accent="blue"
        />
        <MiniKpi
          label="Maior LTV"
          value={fmt(data.maxLTV)}
          accent="amber"
        />
        <MiniKpi
          label="Compradores"
          value={String(data.totalBuyers)}
          accent="emerald"
        />
      </div>

      {/* OB/US adoption */}
      {(data.pctWithOB > 0 || data.pctWithUS > 0) && (
        <div className="flex flex-wrap gap-3">
          {data.pctWithOB > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-muted-foreground">
                Order Bump:
              </span>
              <span className="text-sm font-semibold text-orange-400">
                {data.pctWithOB.toFixed(0)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({data.buyersWithOB} de {data.totalBuyers})
              </span>
            </div>
          )}
          {data.pctWithUS > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-muted-foreground">
                Upsell:
              </span>
              <span className="text-sm font-semibold text-purple-400">
                {data.pctWithUS.toFixed(0)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({data.buyersWithUS} de {data.totalBuyers})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Buckets distribution */}
      {data.buckets.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
            Distribuição por Comportamento
          </p>
          <div className="space-y-1.5">
            {data.buckets.map(bucket => (
              <div
                key={bucket.label}
                className="flex items-center gap-3"
              >
                {/* Bar */}
                <div className="flex-1 relative h-7 rounded-md bg-muted/30 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md bg-cyan-500/20"
                    style={{
                      width: `${Math.max(bucket.pct, 2)}%`,
                    }}
                  />
                  <div className="relative flex items-center justify-between h-full px-3">
                    <span className="text-xs font-medium">
                      {bucket.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {bucket.count} ({bucket.pct.toFixed(0)}%)
                      — LTV {fmt(bucket.avgLTV)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top buyers */}
      {data.topBuyers.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
            Top 5 Compradores
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">
                    #
                  </th>
                  <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">
                    Comprador
                  </th>
                  <th className="text-right py-1.5 px-3 text-muted-foreground font-medium">
                    LTV
                  </th>
                  <th className="text-center py-1.5 px-3 text-muted-foreground font-medium">
                    Posições
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topBuyers.map((buyer, i) => (
                  <tr
                    key={buyer.email}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {i === 0 ? (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        i + 1
                      )}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-[11px]">
                      {maskEmail(buyer.email)}
                    </td>
                    <td className="text-right py-1.5 px-3 tabular-nums font-semibold text-cyan-400">
                      {fmtFull(buyer.totalSpent)}
                    </td>
                    <td className="text-center py-1.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20"
                        >
                          F
                        </Badge>
                        {buyer.hasOB && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-400 border-orange-500/20"
                          >
                            OB
                          </Badge>
                        )}
                        {buyer.hasUS && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-400 border-purple-500/20"
                          >
                            US
                          </Badge>
                        )}
                        {buyer.hasDS && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 bg-pink-500/10 text-pink-400 border-pink-500/20"
                          >
                            DS
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniKpi({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent: 'cyan' | 'blue' | 'amber' | 'emerald';
}) {
  const colors = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  };
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums mt-0.5 ${colors[accent]}`}>
        {value}
      </p>
    </div>
  );
}
