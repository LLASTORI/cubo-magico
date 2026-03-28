import { useMemo } from 'react';
import {
  Rocket, Power, Eye, AlertOctagon,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/* ── Types ───────────────────────────────────────────── */

type Action = 'scale' | 'keep' | 'watch' | 'kill';

interface CreativeMetric {
  adId: string;
  adName: string;
  campaignName: string;
  spend: number;
  purchases: number;
  roas: number;
  cpa: number;
  action: Action;
  reason: string;
}

interface SaleRecord {
  meta_ad_id?: string | null;
  gross_amount?: number;
  [key: string]: any;
}

interface MetaInsight {
  ad_id?: string | null;
  ad_name?: string | null;
  campaign_name?: string | null;
  spend?: number | string;
  date_start?: string;
  [key: string]: any;
}

/* ── Constants ───────────────────────────────────────── */

const ACTION_CONFIG: Record<Action, {
  label: string;
  icon: React.ReactNode;
  badge: string;
  border: string;
}> = {
  scale: {
    label: 'Escalar',
    icon: <Rocket className="w-3.5 h-3.5" />,
    badge: 'bg-green-500/15 text-green-400 border-green-500/25',
    border: 'border-l-green-500/50',
  },
  keep: {
    label: 'Manter',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    border: 'border-l-blue-500/50',
  },
  watch: {
    label: 'Observar',
    icon: <Eye className="w-3.5 h-3.5" />,
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    border: 'border-l-yellow-500/50',
  },
  kill: {
    label: 'Desligar',
    icon: <Power className="w-3.5 h-3.5" />,
    badge: 'bg-red-500/15 text-red-400 border-red-500/25',
    border: 'border-l-red-500/50',
  },
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

/* ── Logic ───────────────────────────────────────────── */

function classifyCreative(
  spend: number,
  purchases: number,
  roas: number,
  avgSpend: number,
): { action: Action; reason: string } {
  // Low spend = not enough data
  if (spend < avgSpend * 0.15 && purchases === 0) {
    return {
      action: 'watch',
      reason: 'Pouco investimento para concluir',
    };
  }

  // Zero sales with significant spend
  if (purchases === 0 && spend > avgSpend * 0.3) {
    return {
      action: 'kill',
      reason: `${fmt(spend)} gastos sem nenhuma venda`,
    };
  }

  if (purchases === 0) {
    return {
      action: 'watch',
      reason: 'Sem vendas ainda — acompanhar',
    };
  }

  // Has sales — classify by ROAS
  if (roas >= 2) {
    return {
      action: 'scale',
      reason: `ROAS ${roas.toFixed(1)}x — alto retorno, aumentar investimento`,
    };
  }
  if (roas >= 1) {
    return {
      action: 'keep',
      reason: `ROAS ${roas.toFixed(1)}x — rentável, manter ativo`,
    };
  }
  if (roas >= 0.5) {
    return {
      action: 'watch',
      reason: `ROAS ${roas.toFixed(1)}x — no limite, otimizar ou pausar`,
    };
  }
  return {
    action: 'kill',
    reason: `ROAS ${roas.toFixed(1)}x — prejuízo, desligar`,
  };
}

/* ── Component ───────────────────────────────────────── */

interface Props {
  salesData: SaleRecord[];
  metaInsights: MetaInsight[];
}

export function CreativeDiagnostic({
  salesData, metaInsights,
}: Props) {
  const creatives = useMemo(() => {
    if (metaInsights.length === 0) return [];

    // Aggregate spend by ad_id (deduplicate by ad_id + date)
    const adSpend = new Map<string, {
      name: string;
      campaignName: string;
      spend: number;
    }>();
    const seen = new Set<string>();

    for (const i of metaInsights) {
      if (!i.ad_id) continue;
      const dedup = `${i.ad_id}_${i.date_start}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      const existing = adSpend.get(i.ad_id);
      const s = Number(i.spend) || 0;
      if (existing) {
        existing.spend += s;
      } else {
        adSpend.set(i.ad_id, {
          name: i.ad_name || i.ad_id,
          campaignName: i.campaign_name || '',
          spend: s,
        });
      }
    }

    // Count purchases by ad_id (via UTM)
    const adPurchases = new Map<string, {
      count: number;
      revenue: number;
    }>();
    for (const s of salesData) {
      if (!s.meta_ad_id) continue;
      const existing = adPurchases.get(s.meta_ad_id);
      const rev = s.gross_amount || 0;
      if (existing) {
        existing.count++;
        existing.revenue += rev;
      } else {
        adPurchases.set(s.meta_ad_id, {
          count: 1, revenue: rev,
        });
      }
    }

    // Average spend for classification thresholds
    const allSpends = Array.from(adSpend.values())
      .map(a => a.spend);
    const avgSpend = allSpends.length > 0
      ? allSpends.reduce((s, v) => s + v, 0) / allSpends.length
      : 0;

    // Build metrics
    const result: CreativeMetric[] = [];
    for (const [adId, ad] of adSpend) {
      const purchases = adPurchases.get(adId);
      const pCount = purchases?.count || 0;
      const pRevenue = purchases?.revenue || 0;
      const roas = ad.spend > 0 ? pRevenue / ad.spend : 0;
      const cpa = pCount > 0 ? ad.spend / pCount : 0;

      const { action, reason } = classifyCreative(
        ad.spend, pCount, roas, avgSpend,
      );

      result.push({
        adId,
        adName: ad.name,
        campaignName: ad.campaignName,
        spend: ad.spend,
        purchases: pCount,
        roas,
        cpa,
        action,
        reason,
      });
    }

    // Sort: scale first, then keep, kill, watch. Within each: by spend desc
    const ORDER: Record<Action, number> = {
      scale: 0, keep: 1, kill: 2, watch: 3,
    };
    result.sort((a, b) => {
      if (ORDER[a.action] !== ORDER[b.action]) {
        return ORDER[a.action] - ORDER[b.action];
      }
      return b.spend - a.spend;
    });

    // Filter out dust (< R$ 5 and no sales) — too noisy
    return result.filter(
      c => c.spend >= 5 || c.purchases > 0,
    );
  }, [salesData, metaInsights]);

  if (creatives.length === 0) return null;

  // Summary
  const summary = {
    scale: creatives.filter(c => c.action === 'scale'),
    keep: creatives.filter(c => c.action === 'keep'),
    watch: creatives.filter(c => c.action === 'watch'),
    kill: creatives.filter(c => c.action === 'kill'),
  };

  const wastedSpend = summary.kill.reduce(
    (s, c) => s + c.spend, 0,
  );

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        {summary.scale.length > 0 && (
          <SummaryBadge
            action="scale"
            count={summary.scale.length}
          />
        )}
        {summary.keep.length > 0 && (
          <SummaryBadge
            action="keep"
            count={summary.keep.length}
          />
        )}
        {summary.watch.length > 0 && (
          <SummaryBadge
            action="watch"
            count={summary.watch.length}
          />
        )}
        {summary.kill.length > 0 && (
          <SummaryBadge
            action="kill"
            count={summary.kill.length}
          />
        )}
        {wastedSpend > 0 && (
          <span className="text-xs text-red-400 ml-2">
            <TrendingDown className="w-3 h-3 inline mr-0.5" />
            {fmt(wastedSpend)} em criativos para desligar
          </span>
        )}
      </div>

      {/* Creative list — show actionable ones, collapse "watch" */}
      {(() => {
        const actionable = creatives.filter(
          c => c.action !== 'watch',
        );
        const watching = creatives.filter(
          c => c.action === 'watch',
        );
        return (
          <div className="space-y-1.5">
            {actionable.map(c => (
              <CreativeRow key={c.adId} creative={c} />
            ))}
            {watching.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/30 border-l-[3px] border-l-yellow-500/30 bg-muted/10">
                <Eye className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-yellow-400">
                    {watching.length} criativos
                  </span>
                  {' em observação (pouco investimento para concluir)'}
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function CreativeRow({ creative: c }: { creative: CreativeMetric }) {
  const cfg = ACTION_CONFIG[c.action];
  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2.5
        rounded-lg border border-border/40
        border-l-[3px] ${cfg.border}
        bg-card hover:bg-muted/20 transition-colors
      `}
    >
      <span className={`
        inline-flex items-center gap-1 px-2 py-0.5
        rounded text-[10px] font-semibold border
        shrink-0 ${cfg.badge}
      `}>
        {cfg.icon}
        {cfg.label}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {c.adName}
        </p>
        {c.campaignName && (
          <p className="text-[10px] text-muted-foreground truncate">
            {c.campaignName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0 text-xs tabular-nums">
        <div className="text-right">
          <p className="text-red-400 font-medium">{fmt(c.spend)}</p>
          <p className="text-[10px] text-muted-foreground">gasto</p>
        </div>
        <div className="text-right">
          <p className="text-foreground font-medium">{c.purchases}</p>
          <p className="text-[10px] text-muted-foreground">vendas</p>
        </div>
        <div className="text-right w-[50px]">
          <p className={`font-bold ${
            c.roas >= 2 ? 'text-green-400'
              : c.roas >= 1 ? 'text-blue-400'
                : c.roas >= 0.5 ? 'text-yellow-400'
                  : 'text-red-400'
          }`}>
            {c.roas.toFixed(1)}x
          </p>
          <p className="text-[10px] text-muted-foreground">ROAS</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground max-w-[220px] shrink-0 hidden lg:block">
        {c.reason}
      </p>
    </div>
  );
}

function SummaryBadge({
  action, count,
}: {
  action: Action;
  count: number;
}) {
  const cfg = ACTION_CONFIG[action];
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1
      rounded-md text-xs font-semibold border
      ${cfg.badge}
    `}>
      {cfg.icon}
      {count} {cfg.label}
    </span>
  );
}
