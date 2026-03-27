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
    <div className="flex flex-wrap gap-3">
      {sorted.map((pos, i) => {
        const key = `${pos.tipo}${pos.ordem || 1}`;
        const label = pos.tipo === 'FRONT' || pos.tipo === 'FE'
          ? 'FRONT' : key;
        const ideal = IDEALS[key];
        const status = getStatus(pos.taxaConversao, ideal);
        const gradient = GRADIENTS[pos.tipo] || 'from-gray-500 to-gray-400';
        const isFront = pos.tipo === 'FRONT' || pos.tipo === 'FE';

        // Potential revenue calculation
        let potentialMsg = '';
        if (ideal && pos.taxaConversao < ideal.min && vendasFront > 0) {
          const gap = ideal.min - pos.taxaConversao;
          const vendasPotenciais = Math.round(vendasFront * (gap / 100));
          const ticketPos = pos.vendas > 0 ? pos.receita / pos.vendas : 0;
          const receitaPot = vendasPotenciais * ticketPos;
          if (receitaPot > 0) {
            potentialMsg = `Receita potencial: +${fmt(receitaPot)} (${vendasPotenciais} vendas a mais)`;
          }
        }

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className={`
                  relative flex-shrink-0 w-[140px] rounded-xl
                  bg-card border border-border/50 p-3
                  transition-all duration-200
                  hover:-translate-y-0.5 cursor-help
                  ${STATUS_RING[status]}
                `}
              >
                {/* Header gradient bar */}
                <div className={`
                  h-1 w-12 rounded-full mb-2
                  bg-gradient-to-r ${gradient}
                `} />

                {/* Label */}
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {label}
                </p>

                {/* Sales count */}
                <p className="text-xl font-extrabold tabular-nums mt-1 text-foreground">
                  {pos.vendas}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">
                    vendas
                  </span>
                </p>

                {/* Conversion rate */}
                {!isFront && (
                  <div className="flex items-center gap-1 mt-1">
                    <Percent className="w-3 h-3 text-muted-foreground" />
                    <span className={`
                      text-sm font-bold tabular-nums
                      ${status === 'success' ? 'text-green-400'
                        : status === 'warning' ? 'text-yellow-400'
                          : status === 'danger' ? 'text-red-400'
                            : 'text-foreground'}
                    `}>
                      {pos.taxaConversao.toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* Revenue */}
                <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  {fmt(pos.receita)}
                </p>

                {/* Status icon */}
                {status === 'danger' && (
                  <AlertTriangle className="absolute top-2 right-2 w-3 h-3 text-red-400" />
                )}
                {status === 'success' && (
                  <CheckCircle2 className="absolute top-2 right-2 w-3 h-3 text-green-400" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[280px] bg-[#1a1f2e] border-border p-3"
            >
              <p className="font-semibold text-sm mb-1">
                {ideal?.desc || label}
              </p>

              {/* Products */}
              {pos.produtos.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  {pos.produtos.map((p, j) => (
                    <p key={j}>
                      {p.nome_produto || p.codigo_oferta || '—'}
                      {' — '}
                      <span className="text-foreground font-medium">
                        {p.vendas} vendas
                      </span>
                    </p>
                  ))}
                </div>
              )}

              {/* Benchmark */}
              {ideal && (
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">
                      Taxa ideal:
                    </span>{' '}
                    <span className="text-green-400 font-medium">
                      {ideal.min}–{ideal.max}%
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Taxa atual:
                    </span>{' '}
                    <span className={`font-medium ${
                      status === 'success' ? 'text-green-400'
                        : status === 'warning' ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}>
                      {pos.taxaConversao.toFixed(1)}%
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Receita:
                    </span>{' '}
                    <span className="text-foreground font-medium">
                      {fmt(pos.receita)}
                    </span>
                  </p>
                </div>
              )}

              {/* Actionable insight */}
              {potentialMsg && (
                <div className="mt-2 pt-2 border-t border-border/50 flex items-start gap-1.5">
                  <TrendingUp className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400">
                    {potentialMsg}
                  </p>
                </div>
              )}

              {status === 'success' && (
                <p className="mt-2 pt-2 border-t border-border/50 text-[11px] text-green-400">
                  Acima do benchmark. Continue otimizando!
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
