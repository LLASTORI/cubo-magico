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
  ctr: number;
  cpm: number;
  hookRate: number;
  frequency: number;
  score: number;
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
  impressions?: number | string;
  clicks?: number | string;
  ctr?: number | string;
  cpm?: number | string;
  frequency?: number | string;
  actions?: any[];
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

const getActionValue = (
  actions: any[] | null | undefined,
  type: string,
): number => {
  if (!actions || !Array.isArray(actions)) return 0;
  const a = actions.find(
    (x: any) => x.action_type === type,
  );
  return a ? parseInt(a.value || '0', 10) : 0;
};

/* ── Ad Pulse Score ───────────────────────────────────── */

/**
 * Ad Pulse Score (0-100) — score multi-dimensional por criativo.
 *
 * Vídeos: ROAS 40% + CTR 15% + CPM 10% + Hook 10% + Freq 10% + Volume 15%
 * Imagens: ROAS 45% + CTR 20% + CPM 10% + Freq 10% + Volume 15%
 * (Hook redistribuído para ROAS +5% e CTR +5% em imagens)
 *
 * Volume = confiança estatística (mais vendas = mais confiável)
 */
function calcAdPulseScore(
  roas: number,
  ctr: number,
  cpm: number,
  hookRate: number,
  frequency: number,
  purchases: number,
  hasVideo: boolean,
): number {
  // ROAS score
  let roasScore: number;
  if (roas >= 3) roasScore = 100;
  else if (roas >= 2) roasScore = 85;
  else if (roas >= 1) roasScore = 70;
  else if (roas >= 0.5) roasScore = 40;
  else roasScore = Math.max(0, roas * 40);

  // CTR score — >2% ótimo, >1% bom
  let ctrScore: number;
  if (ctr >= 3) ctrScore = 100;
  else if (ctr >= 2) ctrScore = 85;
  else if (ctr >= 1) ctrScore = 65;
  else if (ctr >= 0.5) ctrScore = 40;
  else ctrScore = Math.max(0, ctr * 80);

  // CPM score — invertido, menor é melhor
  let cpmScore: number;
  if (cpm <= 15) cpmScore = 100;
  else if (cpm <= 25) cpmScore = 85;
  else if (cpm <= 40) cpmScore = 65;
  else if (cpm <= 60) cpmScore = 40;
  else cpmScore = Math.max(0, 40 - ((cpm - 60) / 60) * 40);

  // Hook Rate score — video_view / impressions
  let hookScore = 0;
  if (hasVideo) {
    if (hookRate >= 30) hookScore = 100;
    else if (hookRate >= 20) hookScore = 85;
    else if (hookRate >= 10) hookScore = 65;
    else if (hookRate >= 5) hookScore = 40;
    else hookScore = Math.max(0, hookRate * 8);
  }

  // Frequency penalty — >3 = saturado
  let freqScore: number;
  if (frequency <= 1.5) freqScore = 100;
  else if (frequency <= 2.5) freqScore = 80;
  else if (frequency <= 3.5) freqScore = 50;
  else if (frequency <= 5) freqScore = 25;
  else freqScore = 0;

  // Volume score — confiança estatística
  let volScore: number;
  if (purchases >= 20) volScore = 100;
  else if (purchases >= 10) volScore = 85;
  else if (purchases >= 5) volScore = 65;
  else if (purchases >= 2) volScore = 45;
  else if (purchases >= 1) volScore = 30;
  else volScore = 0;

  // Pesos diferentes para vídeo vs imagem
  if (hasVideo) {
    return Math.round(
      roasScore * 0.40 +
      ctrScore * 0.15 +
      cpmScore * 0.10 +
      hookScore * 0.10 +
      freqScore * 0.10 +
      volScore * 0.15
    );
  }
  // Imagem: hook redistribuído para ROAS e CTR
  return Math.round(
    roasScore * 0.45 +
    ctrScore * 0.20 +
    cpmScore * 0.10 +
    freqScore * 0.10 +
    volScore * 0.15
  );
}

/* ── Classification ──────────────────────────────────── */

function classifyCreative(
  score: number,
  spend: number,
  purchases: number,
  roas: number,
  avgSpend: number,
): { action: Action; reason: string } {
  if (spend < avgSpend * 0.15 && purchases === 0) {
    return {
      action: 'watch',
      reason: 'Pouco investimento para concluir',
    };
  }

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

  // Score-based classification
  if (score >= 75) {
    return {
      action: 'scale',
      reason: `Score ${score} — performance excelente, escalar`,
    };
  }
  if (score >= 55) {
    return {
      action: 'keep',
      reason: `Score ${score} — bom desempenho, manter`,
    };
  }
  if (score >= 35) {
    return {
      action: 'watch',
      reason: `Score ${score} — otimizar ou pausar`,
    };
  }
  return {
    action: 'kill',
    reason: `Score ${score} — desempenho ruim, desligar`,
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

    // Aggregate metrics by ad_id (deduplicate by ad_id + date)
    const adData = new Map<string, {
      name: string;
      campaignName: string;
      spend: number;
      impressions: number;
      clicks: number;
      videoViews: number;
      frequency: number;
      dayCount: number;
    }>();
    const seen = new Set<string>();

    for (const i of metaInsights) {
      if (!i.ad_id) continue;
      const dedup = `${i.ad_id}_${i.date_start}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      const existing = adData.get(i.ad_id);
      const s = Number(i.spend) || 0;
      const imp = Number(i.impressions) || 0;
      const clk = Number(i.clicks) || 0;
      const vv = getActionValue(i.actions, 'video_view');
      const freq = Number(i.frequency) || 0;

      if (existing) {
        existing.spend += s;
        existing.impressions += imp;
        existing.clicks += clk;
        existing.videoViews += vv;
        existing.frequency += freq;
        existing.dayCount++;
      } else {
        adData.set(i.ad_id, {
          name: i.ad_name || i.ad_id,
          campaignName: i.campaign_name || '',
          spend: s,
          impressions: imp,
          clicks: clk,
          videoViews: vv,
          frequency: freq,
          dayCount: 1,
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
    const allSpends = Array.from(adData.values())
      .map(a => a.spend);
    const avgSpend = allSpends.length > 0
      ? allSpends.reduce((s, v) => s + v, 0) / allSpends.length
      : 0;

    // Build metrics
    const result: CreativeMetric[] = [];
    for (const [adId, ad] of adData) {
      const purchases = adPurchases.get(adId);
      const pCount = purchases?.count || 0;
      const pRevenue = purchases?.revenue || 0;
      const roas = ad.spend > 0 ? pRevenue / ad.spend : 0;
      const cpa = pCount > 0 ? ad.spend / pCount : 0;

      // Derived metrics
      const ctr = ad.impressions > 0
        ? (ad.clicks / ad.impressions) * 100 : 0;
      const cpm = ad.impressions > 0
        ? (ad.spend / ad.impressions) * 1000 : 0;
      const hookRate = ad.impressions > 0
        ? (ad.videoViews / ad.impressions) * 100 : 0;
      const avgFreq = ad.dayCount > 0
        ? ad.frequency / ad.dayCount : 0;
      const hasVideo = ad.videoViews > 0;

      const score = calcAdPulseScore(
        roas, ctr, cpm, hookRate, avgFreq, pCount, hasVideo,
      );

      const { action, reason } = classifyCreative(
        score, ad.spend, pCount, roas, avgSpend,
      );

      result.push({
        adId,
        adName: ad.name,
        campaignName: ad.campaignName,
        spend: ad.spend,
        purchases: pCount,
        roas,
        cpa,
        ctr,
        cpm,
        hookRate,
        frequency: avgFreq,
        score,
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

function scoreColor(s: number): string {
  if (s >= 75) return 'text-green-400';
  if (s >= 55) return 'text-blue-400';
  if (s >= 35) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBg(s: number): string {
  if (s >= 75) return 'bg-green-500/15';
  if (s >= 55) return 'bg-blue-500/15';
  if (s >= 35) return 'bg-yellow-500/15';
  return 'bg-red-500/15';
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
      {/* Score badge */}
      <span className={`
        w-8 h-8 rounded-lg flex items-center justify-center
        text-xs font-bold tabular-nums shrink-0
        ${scoreBg(c.score)} ${scoreColor(c.score)}
      `}>
        {c.score}
      </span>

      {/* Action badge */}
      <span className={`
        inline-flex items-center gap-1 px-2 py-0.5
        rounded text-[10px] font-semibold border
        shrink-0 ${cfg.badge}
      `}>
        {cfg.icon}
        {cfg.label}
      </span>

      {/* Name */}
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

      {/* Metrics */}
      <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
        <div className="text-right">
          <p className="text-red-400 font-medium">{fmt(c.spend)}</p>
          <p className="text-[10px] text-muted-foreground">gasto</p>
        </div>
        <div className="text-right">
          <p className="text-foreground font-medium">{c.purchases}</p>
          <p className="text-[10px] text-muted-foreground">vendas</p>
        </div>
        <div className="text-right w-[44px]">
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
        <div className="text-right w-[40px] hidden xl:block">
          <p className="text-foreground">{c.ctr.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">CTR</p>
        </div>
        {c.hookRate > 0 && (
          <div className="text-right w-[40px] hidden xl:block">
            <p className="text-foreground">{c.hookRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">Hook</p>
          </div>
        )}
        {c.frequency > 0 && (
          <div className="text-right w-[32px] hidden xl:block">
            <p className={`${
              c.frequency > 3.5 ? 'text-red-400'
                : c.frequency > 2.5 ? 'text-yellow-400'
                  : 'text-foreground'
            }`}>
              {c.frequency.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">Freq</p>
          </div>
        )}
      </div>

      {/* Reason */}
      <p className="text-[11px] text-muted-foreground max-w-[180px] shrink-0 hidden lg:block">
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
