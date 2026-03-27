import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Layers, Tag, TrendingUp } from 'lucide-react';
import { LotAnalysis, EditionTotals, OfferMetric } from '@/types/launch-lots';

interface SaleRecord {
  offer_code?: string | null;
  gross_amount: number;
  all_offer_codes?: string[] | null;
}

interface LaunchProductsSalesBreakdownProps {
  lotsAnalysis: LotAnalysis[];
  editionTotals: EditionTotals;
  unassignedSales: SaleRecord[];
  /** Fallback para edições sem lotes configurados */
  projectId?: string;
  funnelId?: string;
  salesData?: SaleRecord[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string) => {
  try {
    return format(parseISO(iso), 'dd/MM HH:mm', { locale: ptBR });
  } catch {
    return iso.slice(0, 10);
  }
};

const STATUS_MAP = {
  planned: { label: 'Planejado', className: 'bg-slate-500/20 text-slate-400' },
  active: { label: 'Ativo', className: 'bg-green-500/20 text-green-400' },
  finished: { label: 'Encerrado', className: 'bg-amber-500/20 text-amber-400' },
} as const;

const getRoleBadge = (role: string) => {
  if (role === 'front') {
    return <Badge className="text-[10px] px-1.5 py-0 bg-blue-600 text-white">Principal</Badge>;
  }
  const match = role.match(/^(bump|upsell|downsell)_(\d+)$/);
  if (match) {
    const labels: Record<string, string> = {
      bump: 'OB', upsell: 'US', downsell: 'DS',
    };
    const label = `${labels[match[1]] || match[1]}${match[2]}`;
    const colors: Record<string, string> = {
      bump: 'bg-orange-500/20 text-orange-400',
      upsell: 'bg-purple-500/20 text-purple-400',
      downsell: 'bg-pink-500/20 text-pink-400',
    };
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[match[1]] || ''}`}>
        {label}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{role}</Badge>;
};

export const LaunchProductsSalesBreakdown = ({
  lotsAnalysis,
  editionTotals,
  unassignedSales,
}: LaunchProductsSalesBreakdownProps) => {
  // Receita das vendas sem lote
  const unassignedRevenue = useMemo(
    () => unassignedSales.reduce((s, sale) => s + (sale.gross_amount || 0), 0),
    [unassignedSales]
  );

  if (lotsAnalysis.length === 0 && unassignedSales.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Detalhamento por Lote
        </h4>
      </div>

      {/* Cards por lote */}
      {lotsAnalysis.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground text-sm">
          Nenhum lote configurado — configure lotes em Ofertas → Configurar → Produtos
        </Card>
      ) : (
        <div className="space-y-3">
          {lotsAnalysis.map((la) => (
            <LotCard key={la.lot.id} lotAnalysis={la} editionTotals={editionTotals} />
          ))}
        </div>
      )}

      {/* Vendas sem lote */}
      {unassignedSales.length > 0 && (
        <Card className="p-3 border-dashed border-amber-500/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-400 font-medium">
              ⚠ {unassignedSales.length} vendas sem lote atribuído
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(unassignedRevenue)}
            </span>
          </div>
        </Card>
      )}

      {/* Tabela comparativa */}
      {lotsAnalysis.length > 1 && (
        <ComparativeTable lots={lotsAnalysis} totals={editionTotals} />
      )}
    </div>
  );
};

// --- Subcomponentes ---

function LotCard({
  lotAnalysis,
  editionTotals,
}: {
  lotAnalysis: LotAnalysis;
  editionTotals: EditionTotals;
}) {
  const { lot, totalRevenue, totalTickets, totalSpend, roas, offerMetrics } = lotAnalysis;
  const sc = STATUS_MAP[lot.status] || STATUS_MAP.planned;

  // Ordenar: front primeiro, depois bumps, upsells, downsells
  const sortedMetrics = [...offerMetrics].sort((a, b) => {
    const order = (role: string) => {
      if (role === 'front') return 0;
      if (role.startsWith('bump')) return 10 + parseInt(role.split('_')[1] || '0');
      if (role.startsWith('upsell')) return 20 + parseInt(role.split('_')[1] || '0');
      if (role.startsWith('downsell')) return 30 + parseInt(role.split('_')[1] || '0');
      return 99;
    };
    return order(a.role) - order(b.role);
  });

  const revenueShare = editionTotals.totalRevenue > 0
    ? (totalRevenue / editionTotals.totalRevenue) * 100
    : 0;

  return (
    <Card className="overflow-hidden">
      {/* Header do lote */}
      <div className="bg-muted/30 px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{lot.name}</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              #{lot.lot_number}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${sc.className}`}>
              {sc.label}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {lot.start_datetime && formatDate(lot.start_datetime)}
            {lot.end_datetime && ` → ${formatDate(lot.end_datetime)}`}
          </div>
        </div>

        {/* KPIs do lote */}
        <div className="flex items-center gap-6 mt-2 text-xs">
          <div>
            <span className="text-muted-foreground">Ingressos:</span>
            <span className="font-bold ml-1">{totalTickets}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Receita:</span>
            <span className="font-bold ml-1 text-green-400">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          {totalSpend > 0 && (
            <>
              <div>
                <span className="text-muted-foreground">Spend:</span>
                <span className="font-bold ml-1 text-red-400">
                  {formatCurrency(totalSpend)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">ROAS:</span>
                <span className={`font-bold ml-1 ${roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {roas.toFixed(2)}x
                </span>
              </div>
            </>
          )}
          <div>
            <span className="text-muted-foreground">% edição:</span>
            <span className="font-bold ml-1">{revenueShare.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Tabela de ofertas */}
      {sortedMetrics.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="text-[11px]">
              <TableHead className="py-2">Produto</TableHead>
              <TableHead className="text-center py-2">Posição</TableHead>
              <TableHead className="text-right py-2">Preço</TableHead>
              <TableHead className="text-right py-2">Vendas</TableHead>
              <TableHead className="text-right py-2">Receita</TableHead>
              <TableHead className="text-right py-2">TX Conv.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((m) => (
              <TableRow key={m.offerMappingId} className="text-sm">
                <TableCell className="py-2">
                  <div>
                    <p className="font-medium text-xs">{m.nomeProduto}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {m.nomeOferta} · {m.codigoOferta}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-center py-2">
                  {getRoleBadge(m.role)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs py-2">
                  {formatCurrency(m.valor)}
                </TableCell>
                <TableCell className="text-right font-bold py-2">
                  {m.salesCount}
                </TableCell>
                <TableCell className="text-right font-bold text-green-400 py-2">
                  {formatCurrency(m.revenue)}
                </TableCell>
                <TableCell className="text-right py-2">
                  {m.role === 'front' ? (
                    <span className="text-muted-foreground text-xs">base</span>
                  ) : (
                    <span className={`font-bold text-xs ${
                      m.conversionRate >= 30 ? 'text-green-400' :
                      m.conversionRate >= 15 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {m.conversionRate.toFixed(1)}%
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="p-3 text-center text-muted-foreground text-xs">
          Nenhuma oferta vinculada
        </div>
      )}
    </Card>
  );
}

function ComparativeTable({
  lots,
  totals,
}: {
  lots: LotAnalysis[];
  totals: EditionTotals;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 border-b border-border/50 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Comparativo de Lotes</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="py-2">Lote</TableHead>
            <TableHead className="text-right py-2">Ingressos</TableHead>
            <TableHead className="text-right py-2">Receita</TableHead>
            <TableHead className="text-right py-2">Spend</TableHead>
            <TableHead className="text-right py-2">ROAS</TableHead>
            <TableHead className="text-right py-2">Ticket Médio</TableHead>
            <TableHead className="text-right py-2">TX OB Média</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((la) => {
            const obMetrics = la.offerMetrics.filter(
              m => m.role.startsWith('bump')
            );
            const avgObRate = obMetrics.length > 0
              ? obMetrics.reduce((s, m) => s + m.conversionRate, 0) / obMetrics.length
              : 0;

            return (
              <TableRow key={la.lot.id} className="text-sm">
                <TableCell className="py-2 font-medium">
                  {la.lot.name}
                </TableCell>
                <TableCell className="text-right py-2 font-bold">
                  {la.totalTickets}
                </TableCell>
                <TableCell className="text-right py-2 font-bold text-green-400">
                  {formatCurrency(la.totalRevenue)}
                </TableCell>
                <TableCell className="text-right py-2 text-red-400">
                  {la.totalSpend > 0 ? formatCurrency(la.totalSpend) : '—'}
                </TableCell>
                <TableCell className="text-right py-2">
                  {la.totalSpend > 0 ? (
                    <span className={la.roas >= 1 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {la.roas.toFixed(2)}x
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-right py-2 font-mono text-xs">
                  {formatCurrency(la.avgTicket)}
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className={`font-bold ${
                    avgObRate >= 30 ? 'text-green-400' :
                    avgObRate >= 15 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {avgObRate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            );
          })}

          {/* Linha TOTAL */}
          <TableRow className="bg-muted/30 font-bold text-sm">
            <TableCell className="py-2">TOTAL</TableCell>
            <TableCell className="text-right py-2">
              {totals.totalTickets}
            </TableCell>
            <TableCell className="text-right py-2 text-green-400">
              {formatCurrency(totals.totalRevenue)}
            </TableCell>
            <TableCell className="text-right py-2 text-red-400">
              {totals.totalSpend > 0 ? formatCurrency(totals.totalSpend) : '—'}
            </TableCell>
            <TableCell className="text-right py-2">
              {totals.totalSpend > 0 ? (
                <span className={totals.roas >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {totals.roas.toFixed(2)}x
                </span>
              ) : '—'}
            </TableCell>
            <TableCell className="text-right py-2 font-mono text-xs">
              {formatCurrency(totals.avgTicket)}
            </TableCell>
            <TableCell className="text-right py-2">—</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
