import { useTenantNavigation } from '@/navigation';
import { useEditionsComparativo } from '@/hooks/useEditionsComparativo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  funnelId: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

const STATUS_MAP = {
  planned:  { label: 'Planejada',  className: 'bg-slate-100 text-slate-700 border-0' },
  active:   { label: 'Ativa',      className: 'bg-green-100 text-green-700 border-0' },
  finished: { label: 'Encerrada',  className: 'bg-amber-100 text-amber-700 border-0' },
} as const;

export function EditionsComparativoTable({ projectId, funnelId }: Props) {
  const { rows, isLoading } = useEditionsComparativo(projectId, funnelId);
  const { navigateTo } = useTenantNavigation();

  if (!isLoading && !rows.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma edição cadastrada para comparar.
      </p>
    );
  }

  const bestRoas = rows.length ? Math.max(...rows.map((r) => r.roas)) : 0;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Edição</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Evento</TableHead>
            <TableHead className="text-right">Ingressos</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Investimento</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ edition, totalIngressos, faturamentoTotal, totalSpend, roas, isLoading: rowLoading }) => {
            const status = STATUS_MAP[edition.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.planned;
            const isBest = bestRoas > 0 && roas === bestRoas && rows.length > 1;
            const dash = rowLoading ? '—' : undefined;

            return (
              <TableRow key={edition.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{edition.name}</TableCell>
                <TableCell className="text-center">
                  <Badge className={status.className}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {edition.event_date
                    ? format(parseISO(edition.event_date), 'dd/MM/yy', { locale: ptBR })
                    : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dash ?? totalIngressos}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dash ?? fmt(faturamentoTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dash ?? fmt(totalSpend)}
                </TableCell>
                <TableCell className={cn(
                  'text-right font-bold tabular-nums',
                  isBest ? 'text-green-600' : '',
                )}>
                  {dash ?? `${roas.toFixed(2)}x`}
                  {isBest && !rowLoading && (
                    <span className="ml-1 text-xs">↑</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Ver análise"
                    onClick={() => navigateTo(`/lancamentos/${funnelId}/edicoes/${edition.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
