import { Percent, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Types ───────────────────────────────────────────── */

export interface PositionCard {
  tipo: string;
  ordem: number;
  vendas: number;
  receita: number;
  taxaConversao: number;
  produtos: Array<{
    nome_produto: string;
    nome_oferta: string | null;
    codigo_oferta: string | null;
    vendas: number;
  }>;
}

/* ── Constants ───────────────────────────────────────── */

const IDEALS: Record<string, { min: number; max: number; desc: string }> = {
  OB1: { min: 30, max: 40, desc: 'Order Bump 1' },
  OB2: { min: 20, max: 30, desc: 'Order Bump 2' },
  OB3: { min: 10, max: 20, desc: 'Order Bump 3' },
  OB4: { min: 5, max: 10, desc: 'Order Bump 4' },
  OB5: { min: 3, max: 5, desc: 'Order Bump 5' },
  US1: { min: 1, max: 5, desc: 'Upsell 1' },
  US2: { min: 0.5, max: 1.5, desc: 'Upsell 2' },
  DS1: { min: 1, max: 3, desc: 'Downsell 1' },
};

const GRADIENTS: Record<string, string> = {
  FRONT: 'from-blue-500 to-cyan-400',
  FE: 'from-blue-500 to-cyan-400',
  OB: 'from-emerald-500 to-green-400',
  US: 'from-purple-500 to-violet-400',
  DS: 'from-orange-500 to-amber-400',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

function getStatus(
  taxa: number, ideal: { min: number } | undefined,
): 'success' | 'warning' | 'danger' | 'base' {
  if (!ideal) return 'base';
  if (taxa >= ideal.min) return 'success';
  if (taxa >= ideal.min * 0.5) return 'warning';
  return 'danger';
}

const STATUS_RING = {
  success: 'ring-2 ring-green-500/40',
  warning: 'ring-2 ring-yellow-500/40',
  danger: 'ring-2 ring-red-500/40',
  base: '',
};

const STATUS_COLOR = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  base: 'text-foreground',
};

/* ── Component ───────────────────────────────────────── */

interface Props {
  positions: PositionCard[];
  vendasFront: number;
}

export function FunnelFlowCards({
  positions, vendasFront,
}: Props) {
  if (positions.length === 0) return null;

  // Sort: FRONT first, then by tipo + ordem
  const sorted = [...positions].sort((a, b) => {
    const aIsFront = a.tipo === 'FRONT' || a.tipo === 'FE';
    const bIsFront = b.tipo === 'FRONT' || b.tipo === 'FE';
    if (aIsFront && !bIsFront) return -1;
    if (!aIsFront && bIsFront) return 1;
    if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
    return a.ordem - b.ordem;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {sorted.map((pos) => {
        const key = `${pos.tipo}${pos.ordem || 1}`;
        const label = pos.tipo === 'FRONT' || pos.tipo === 'FE'
          ? 'FRONT' : key;
        const ideal = IDEALS[key];
        const status = getStatus(pos.taxaConversao, ideal);
        const gradient = GRADIENTS[pos.tipo] || 'from-gray-500 to-gray-400';
        const isFront = pos.tipo === 'FRONT' || pos.tipo === 'FE';

        // Primary product name
        const primaryProduct = pos.produtos[0]?.nome_produto || '';
        const truncatedName = primaryProduct.length > 30
          ? primaryProduct.slice(0, 28) + '...'
          : primaryProduct;

        // Potential revenue
        let potentialMsg = '';
        if (ideal && pos.taxaConversao < ideal.min && vendasFront > 0) {
          const gap = ideal.min - pos.taxaConversao;
          const vendasPot = Math.round(vendasFront * (gap / 100));
          const ticketPos = pos.vendas > 0 ? pos.receita / pos.vendas : 0;
          const receitaPot = vendasPot * ticketPos;
          if (receitaPot > 0) {
            potentialMsg = `+${fmt(receitaPot)} (${vendasPot} vendas a mais)`;
          }
        }

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className={`
                  relative rounded-xl
                  bg-card border border-border/50 p-4
                  transition-all duration-200
                  hover:-translate-y-0.5 cursor-help
                  ${STATUS_RING[status]}
                `}
              >
                {/* Header: gradient bar + label */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`
                      h-1.5 w-10 rounded-full
                      bg-gradient-to-r ${gradient}
                    `} />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      {label}
                    </span>
                  </div>
                  {status === 'danger' && (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  {status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                </div>

                {/* Product name */}
                {truncatedName && (
                  <p className="text-sm font-medium text-foreground mb-2 leading-tight">
                    {truncatedName}
                  </p>
                )}

                {/* Metrics row */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
                      {pos.vendas}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      vendas
                    </p>
                  </div>

                  {!isFront && (
                    <div className="text-right">
                      <p className={`
                        text-xl font-bold tabular-nums leading-none
                        ${STATUS_COLOR[status]}
                      `}>
                        {pos.taxaConversao.toFixed(1)}%
                      </p>
                      {ideal && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ideal {ideal.min}–{ideal.max}%
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Revenue */}
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Receita: <span className="text-foreground font-medium">{fmt(pos.receita)}</span>
                  </p>
                </div>

                {/* Potential revenue hint */}
                {potentialMsg && (
                  <div className="mt-1.5 flex items-start gap-1">
                    <TrendingUp className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-400 leading-tight">
                      {potentialMsg}
                    </p>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[300px] bg-[#1a1f2e] border-border p-3"
            >
              <p className="font-semibold text-sm mb-2">
                {ideal?.desc || label}
              </p>

              {/* All products */}
              {pos.produtos.length > 0 && (
                <div className="text-xs space-y-1 mb-2">
                  {pos.produtos.map((p, j) => (
                    <div key={j} className="flex justify-between gap-3">
                      <span className="text-muted-foreground truncate">
                        {p.nome_produto || p.codigo_oferta || '—'}
                      </span>
                      <span className="text-foreground font-medium shrink-0">
                        {p.vendas} vendas
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {ideal && (
                <div className="space-y-1 text-xs border-t border-border/50 pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa ideal</span>
                    <span className="text-green-400 font-medium">
                      {ideal.min}–{ideal.max}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa atual</span>
                    <span className={`font-medium ${STATUS_COLOR[status]}`}>
                      {pos.taxaConversao.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
