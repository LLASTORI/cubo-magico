import { useMemo } from 'react';

/* ── Types ───────────────────────────────────────────── */

export interface PositionBreakdown {
  tipo: string;
  ordem: number;
  vendas: number;
  receita: number;
  taxaConversao: number;
}

export type ScoreStatus =
  | 'excellent'
  | 'good'
  | 'attention'
  | 'danger';

export interface FunnelScoreResult {
  score: number;
  status: ScoreStatus;
  statusLabel: string;
  message: string;
  gradient: string;
  breakdown: {
    positionScore: number | null;
    connectScore: number | null;
    txPaginaScore: number | null;
    txCheckoutScore: number | null;
  };
}

/* ── Helpers ─────────────────────────────────────────── */

const getActionValue = (
  actions: any[] | null,
  actionType: string,
): number => {
  if (!actions || !Array.isArray(actions)) return 0;
  const action = actions.find(
    (a: any) => a.action_type === actionType,
  );
  return action ? parseInt(action.value || '0', 10) : 0;
};

/** Ideal conversion rates per position */
const IDEALS: Record<string, { min: number; max: number }> = {
  OB1: { min: 30, max: 40 },
  OB2: { min: 20, max: 30 },
  OB3: { min: 10, max: 20 },
  OB4: { min: 5, max: 10 },
  OB5: { min: 3, max: 5 },
  US1: { min: 1, max: 5 },
  DS1: { min: 1, max: 3 },
  US2: { min: 0.5, max: 1.5 },
};

function scorePosition(
  positions: PositionBreakdown[],
): number | null {
  let total = 0;
  let count = 0;

  for (const pos of positions) {
    if (pos.tipo === 'FRONT' || pos.tipo === 'FE') continue;
    const key = `${pos.tipo}${pos.ordem || 1}`;
    const ideal = IDEALS[key];
    if (!ideal) continue;

    if (pos.taxaConversao >= ideal.min) {
      total += 100;
    } else if (pos.taxaConversao >= ideal.min * 0.5) {
      total += 50 + (pos.taxaConversao / ideal.min) * 50;
    } else {
      total += (pos.taxaConversao / ideal.min) * 50;
    }
    count++;
  }

  return count > 0 ? total / count : null;
}

function scoreRange(
  value: number,
  thresholds: [number, number, number, number],
): number {
  const [t100, t80, t60, base] = thresholds;
  if (value >= t100) return 100;
  if (value >= t80) return 80;
  if (value >= t60) return 60;
  return (value / base) * 60;
}

function statusFromScore(score: number): {
  status: ScoreStatus;
  statusLabel: string;
  message: string;
  gradient: string;
} {
  if (score >= 80) return {
    status: 'excellent',
    statusLabel: 'Excelente',
    message: 'Funil performando muito bem!',
    gradient: 'from-green-500 to-emerald-400',
  };
  if (score >= 60) return {
    status: 'good',
    statusLabel: 'Bom',
    message: 'Bom resultado com oportunidades de melhoria.',
    gradient: 'from-blue-500 to-cyan-400',
  };
  if (score >= 40) return {
    status: 'attention',
    statusLabel: 'Atenção',
    message: 'Margem para melhorar. Foque nas métricas em destaque.',
    gradient: 'from-yellow-500 to-amber-400',
  };
  return {
    status: 'danger',
    statusLabel: 'Crítico',
    message: 'Precisa de atenção urgente.',
    gradient: 'from-red-500 to-rose-400',
  };
}

/* ── Hook ────────────────────────────────────────────── */

/**
 * Calcula o Funnel Score (0-100) a partir de:
 * - positionBreakdown: OBs/USs/DSs com taxaConversao
 * - metaInsights: dados de ações Meta (link_click, landing_page_view, etc.)
 *
 * Pesos: Posições 40% + Connect 20% + TX Pág→Checkout 20% + TX Checkout→Compra 20%
 * Métricas sem dados são excluídas do peso total.
 */
export function useFunnelScore(
  positionBreakdown: PositionBreakdown[],
  metaInsights: any[],
): FunnelScoreResult | null {
  return useMemo(() => {
    if (
      positionBreakdown.length === 0 &&
      metaInsights.length === 0
    ) {
      return null;
    }

    // Extract action metrics from meta insights
    const actionMap = new Map<string, {
      linkClicks: number;
      landingPageViews: number;
      initiateCheckouts: number;
      purchases: number;
    }>();

    for (const i of metaInsights) {
      if (!i.ad_id) continue;
      const key = `${i.ad_id}_${i.date_start}`;
      if (actionMap.has(key)) continue;
      actionMap.set(key, {
        linkClicks: getActionValue(
          i.actions, 'link_click',
        ),
        landingPageViews:
          getActionValue(i.actions, 'landing_page_view') ||
          getActionValue(
            i.actions, 'omni_landing_page_view',
          ),
        initiateCheckouts:
          getActionValue(i.actions, 'initiate_checkout') ||
          getActionValue(
            i.actions, 'omni_initiated_checkout',
          ),
        purchases:
          getActionValue(i.actions, 'purchase') ||
          getActionValue(i.actions, 'omni_purchase'),
      });
    }

    let linkClicks = 0;
    let landingPageViews = 0;
    let initiateCheckouts = 0;
    let purchases = 0;
    for (const m of actionMap.values()) {
      linkClicks += m.linkClicks;
      landingPageViews += m.landingPageViews;
      initiateCheckouts += m.initiateCheckouts;
      purchases += m.purchases;
    }

    const connectRate = linkClicks > 0
      ? (landingPageViews / linkClicks) * 100 : 0;
    const txPaginaCheckout = landingPageViews > 0
      ? (initiateCheckouts / landingPageViews) * 100 : 0;
    const txCheckoutCompra = initiateCheckouts > 0
      ? (purchases / initiateCheckouts) * 100 : 0;

    // Calculate sub-scores
    const posScore = scorePosition(positionBreakdown);
    const connScore = linkClicks > 0
      ? scoreRange(connectRate, [81, 70, 55, 50]) : null;
    const txPagScore = landingPageViews > 0
      ? scoreRange(txPaginaCheckout, [35, 25, 15, 15]) : null;
    const txChkScore = initiateCheckouts > 0
      ? scoreRange(txCheckoutCompra, [50, 35, 20, 20]) : null;

    // Weighted average (only components with data)
    let totalScore = 0;
    let totalWeight = 0;

    if (posScore !== null) {
      totalScore += posScore * 0.4;
      totalWeight += 0.4;
    }
    if (connScore !== null) {
      totalScore += connScore * 0.2;
      totalWeight += 0.2;
    }
    if (txPagScore !== null) {
      totalScore += txPagScore * 0.2;
      totalWeight += 0.2;
    }
    if (txChkScore !== null) {
      totalScore += txChkScore * 0.2;
      totalWeight += 0.2;
    }

    if (totalWeight === 0) return null;

    const finalScore = Math.round(totalScore / totalWeight);
    const meta = statusFromScore(finalScore);

    return {
      score: finalScore,
      ...meta,
      breakdown: {
        positionScore: posScore !== null
          ? Math.round(posScore) : null,
        connectScore: connScore !== null
          ? Math.round(connScore) : null,
        txPaginaScore: txPagScore !== null
          ? Math.round(txPagScore) : null,
        txCheckoutScore: txChkScore !== null
          ? Math.round(txChkScore) : null,
      },
    };
  }, [positionBreakdown, metaInsights]);
}
