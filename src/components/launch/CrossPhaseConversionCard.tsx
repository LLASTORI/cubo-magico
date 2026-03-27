import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowRight, Users, ShoppingCart, Clock,
  TrendingUp, Layers, Zap,
} from 'lucide-react';
import { CrossPhaseData } from '@/hooks/useCrossPhaseConversion';

interface CrossPhaseConversionCardProps {
  data: CrossPhaseData;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

const pct = (v: number) => `${v.toFixed(1)}%`;

const txColor = (v: number) =>
  v >= 15 ? 'text-green-400' :
  v >= 8 ? 'text-amber-400' :
  'text-red-400';

export function CrossPhaseConversionCard({
  data,
}: CrossPhaseConversionCardProps) {
  if (!data.hasProdutoData) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Conversão Ingresso → Produto Principal
          </h3>
        </div>
        <div className="p-6 text-center space-y-2">
          <p className="text-muted-foreground text-sm">
            Sem dados de produto principal nesta edição.
          </p>
          <p className="text-xs text-muted-foreground">
            Quando o produto principal for integrado ao mesmo funil,
            o cruzamento de compradores aparecerá aqui automaticamente.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">
          Conversão Ingresso → Produto Principal
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {/* Funil visual */}
        <div className="flex items-center justify-center gap-3 py-4">
          <FunnelStep
            icon={<Users className="w-5 h-5" />}
            label="Compraram Ingresso"
            value={data.totalIngressoBuyers}
            color="bg-blue-500/20 text-blue-400 border-blue-500/30"
          />
          <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          <FunnelStep
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Converteram"
            value={data.buyersBoth}
            subtitle={pct(data.txIngressoToProduto)}
            color="bg-green-500/20 text-green-400 border-green-500/30"
          />
          <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          <FunnelStep
            icon={<Zap className="w-5 h-5" />}
            label="Compraram Direto"
            value={data.buyersOnlyProduto}
            subtitle="sem ingresso"
            color="bg-purple-500/20 text-purple-400 border-purple-500/30"
          />
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="TX Conversão"
            value={pct(data.txIngressoToProduto)}
            className={txColor(data.txIngressoToProduto)}
          />
          <MetricCard
            label="Receita Produto"
            value={fmt(data.receitaProduto)}
            className="text-green-400"
          />
          <MetricCard
            label="Ticket Médio"
            value={fmt(data.ticketMedioProduto)}
          />
          {data.diasEntreCompras && (
            <MetricCard
              label="Tempo Médio"
              value={`${Math.round(data.diasEntreCompras.media)} dias`}
              subtitle={`Mediana: ${Math.round(data.diasEntreCompras.mediana)}d`}
            />
          )}
        </div>

        {/* Tempo entre compras */}
        {data.diasEntreCompras && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 text-xs">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              Tempo entre ingresso e produto:
            </span>
            <span>
              Média <strong>{Math.round(data.diasEntreCompras.media)}d</strong>
            </span>
            <span>
              Mediana <strong>{Math.round(data.diasEntreCompras.mediana)}d</strong>
            </span>
            <span>
              Mais rápido <strong>{data.diasEntreCompras.min}d</strong>
            </span>
            <span>
              Mais lento <strong>{data.diasEntreCompras.max}d</strong>
            </span>
          </div>
        )}

        {/* Por Origem */}
        {data.conversaoPorOrigem.length > 0 && (
          <Section title="Por Origem do Ingresso" icon={<Layers className="w-4 h-4" />}>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px]">
                  <TableHead className="py-2">Origem</TableHead>
                  <TableHead className="text-right py-2">Ingressos</TableHead>
                  <TableHead className="text-right py-2">Converteram</TableHead>
                  <TableHead className="text-right py-2">TX</TableHead>
                  <TableHead className="text-right py-2">Receita</TableHead>
                  <TableHead className="text-right py-2">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.conversaoPorOrigem.map(o => (
                  <TableRow key={o.origem} className="text-xs">
                    <TableCell className="py-1.5 font-medium">{o.origem}</TableCell>
                    <TableCell className="text-right py-1.5">{o.ingressos}</TableCell>
                    <TableCell className="text-right py-1.5 font-bold">{o.convertidos}</TableCell>
                    <TableCell className={`text-right py-1.5 font-bold ${txColor(o.taxa)}`}>
                      {pct(o.taxa)}
                    </TableCell>
                    <TableCell className="text-right py-1.5 text-green-400">
                      {o.receitaProduto > 0 ? fmt(o.receitaProduto) : '—'}
                    </TableCell>
                    <TableCell className="text-right py-1.5 font-mono text-[11px]">
                      {o.ticketMedioProduto > 0 ? fmt(o.ticketMedioProduto) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}

        {/* Por Semana */}
        {data.conversaoPorSemana.length > 1 && (
          <Section title="Por Semana do Ingresso" icon={<Clock className="w-4 h-4" />}>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px]">
                  <TableHead className="py-2">Semana</TableHead>
                  <TableHead className="text-right py-2">Ingressos</TableHead>
                  <TableHead className="text-right py-2">Converteram</TableHead>
                  <TableHead className="text-right py-2">TX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.conversaoPorSemana.map(s => (
                  <TableRow key={s.semana} className="text-xs">
                    <TableCell className="py-1.5 font-medium">{s.label}</TableCell>
                    <TableCell className="text-right py-1.5">{s.ingressos}</TableCell>
                    <TableCell className="text-right py-1.5 font-bold">{s.convertidos}</TableCell>
                    <TableCell className={`text-right py-1.5 font-bold ${txColor(s.taxa)}`}>
                      {pct(s.taxa)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}

        {/* Por Lote */}
        {data.conversaoPorLote.length > 1 && (
          <Section title="Por Lote" icon={<Layers className="w-4 h-4" />}>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px]">
                  <TableHead className="py-2">Lote</TableHead>
                  <TableHead className="text-right py-2">Ingressos</TableHead>
                  <TableHead className="text-right py-2">Converteram</TableHead>
                  <TableHead className="text-right py-2">TX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.conversaoPorLote.map(l => (
                  <TableRow key={l.lotName} className="text-xs">
                    <TableCell className="py-1.5 font-medium">{l.lotName}</TableCell>
                    <TableCell className="text-right py-1.5">{l.ingressos}</TableCell>
                    <TableCell className="text-right py-1.5 font-bold">{l.convertidos}</TableCell>
                    <TableCell className={`text-right py-1.5 font-bold ${txColor(l.taxa)}`}>
                      {pct(l.taxa)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}

        {/* OB como Preditor */}
        {data.obPreditor && (
          <Section title="OB como Preditor de Conversão" icon={<Zap className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground">Com Order Bump</p>
                <p className="text-lg font-bold">
                  {data.obPreditor.comOBConverteram}/{data.obPreditor.comOB}
                </p>
                <p className={`text-sm font-bold ${txColor(data.obPreditor.txComOB)}`}>
                  TX {pct(data.obPreditor.txComOB)}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground">Sem Order Bump</p>
                <p className="text-lg font-bold">
                  {data.obPreditor.semOBConverteram}/{data.obPreditor.semOB}
                </p>
                <p className={`text-sm font-bold ${txColor(data.obPreditor.txSemOB)}`}>
                  TX {pct(data.obPreditor.txSemOB)}
                </p>
              </div>
            </div>
            {data.obPreditor.multiplicador > 1 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Quem comprou OB converte{' '}
                <strong className="text-green-400">
                  {data.obPreditor.multiplicador.toFixed(1)}x mais
                </strong>{' '}
                para o produto principal
              </p>
            )}
          </Section>
        )}
      </div>
    </Card>
  );
}

// --- Subcomponentes ---

function FunnelStep({
  icon, label, value, subtitle, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center p-4 rounded-xl border ${color} min-w-[120px]`}>
      {icon}
      <span className="text-2xl font-bold mt-1 tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider mt-0.5">{label}</span>
      {subtitle && (
        <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0">
          {subtitle}
        </Badge>
      )}
    </div>
  );
}

function MetricCard({
  label, value, subtitle, className = '',
}: {
  label: string;
  value: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card text-center">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${className}`}>{value}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function Section({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
