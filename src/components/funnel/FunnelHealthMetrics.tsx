import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  ShoppingCart, 
  RotateCcw, 
  RefreshCw, 
  CreditCard, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FunnelHealthData } from '@/hooks/useFunnelHealthMetrics';

interface FunnelHealthMetricsProps {
  healthData: FunnelHealthData | undefined;
  compact?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export function FunnelHealthMetrics({ healthData, compact = false }: FunnelHealthMetricsProps) {
  if (!healthData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sem dados de saúde para este funil no período</p>
      </div>
    );
  }

  const hasAbandonmentData = healthData.totalAbandonos > 0;
  const hasRefundData = healthData.totalReembolsos > 0 || healthData.totalChargebacks > 0 || healthData.totalCancelamentos > 0;

  // Determine status colors based on rates
  const getRefundStatus = (rate: number) => {
    if (rate > 5) return { color: 'text-red-600', bg: 'bg-red-100', status: 'critical' };
    if (rate > 3) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'warning' };
    return { color: 'text-green-600', bg: 'bg-green-100', status: 'good' };
  };

  const getChargebackStatus = (rate: number) => {
    if (rate > 1) return { color: 'text-red-600', bg: 'bg-red-100', status: 'critical' };
    if (rate > 0.5) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'warning' };
    return { color: 'text-green-600', bg: 'bg-green-100', status: 'good' };
  };

  const getRecoveryStatus = (rate: number) => {
    if (rate >= 30) return { color: 'text-green-600', bg: 'bg-green-100', status: 'excellent' };
    if (rate >= 15) return { color: 'text-blue-600', bg: 'bg-blue-100', status: 'good' };
    if (rate >= 5) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'attention' };
    return { color: 'text-muted-foreground', bg: 'bg-muted', status: 'low' };
  };

  const refundStatus = getRefundStatus(healthData.taxaReembolso);
  const chargebackStatus = getChargebackStatus(healthData.taxaChargeback);
  const recoveryStatus = getRecoveryStatus(healthData.taxaRecuperacao);

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-4 text-xs">
          {hasAbandonmentData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-orange-500" />
                  <span>{healthData.totalAbandonos}</span>
                  <span className={cn("font-medium", recoveryStatus.color)}>
                    ({formatPercent(healthData.taxaRecuperacao)} rec)
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{healthData.totalAbandonos} abandonos, {healthData.abandonosRecuperados} recuperados</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {healthData.totalReembolsos > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                  <span>{healthData.totalReembolsos}</span>
                  <span className={cn("font-medium", refundStatus.color)}>
                    ({formatPercent(healthData.taxaReembolso)})
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{healthData.totalReembolsos} reembolsos ({formatCurrency(healthData.valorReembolsado)})</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {healthData.totalChargebacks > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-red-500" />
                  <span>{healthData.totalChargebacks}</span>
                  <span className={cn("font-medium", chargebackStatus.color)}>
                    ({formatPercent(healthData.taxaChargeback)})
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{healthData.totalChargebacks} chargebacks ({formatCurrency(healthData.valorChargeback)})</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          Saúde do Funil
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3.5 h-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Métricas de abandono, recuperação, reembolso e chargeback para este funil.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Abandonos são atribuídos via produto quando o produto pertence a um único funil.
              </p>
            </TooltipContent>
          </Tooltip>
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Abandono */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-orange-600">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-medium">Abandonos</span>
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold">{healthData.totalAbandonos}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(healthData.valorAbandonos)}
              </p>
            </div>
          </Card>

          {/* Recuperados */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs font-medium">Recuperados</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold">{healthData.abandonosRecuperados}</p>
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5", recoveryStatus.bg, recoveryStatus.color)}
                >
                  {formatPercent(healthData.taxaRecuperacao)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(healthData.valorRecuperados)}
              </p>
            </div>
          </Card>

          {/* Reembolsos */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs font-medium">Reembolsos</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold">{healthData.totalReembolsos}</p>
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5", refundStatus.bg, refundStatus.color)}
                >
                  {formatPercent(healthData.taxaReembolso)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(healthData.valorReembolsado)}
              </p>
            </div>
            {refundStatus.status === 'critical' && (
              <div className="flex items-center gap-1 text-[10px] text-red-600">
                <AlertTriangle className="w-3 h-3" />
                Taxa acima de 5%
              </div>
            )}
          </Card>

          {/* Chargebacks */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-medium">Chargebacks</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold">{healthData.totalChargebacks}</p>
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5", chargebackStatus.bg, chargebackStatus.color)}
                >
                  {formatPercent(healthData.taxaChargeback)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(healthData.valorChargeback)}
              </p>
            </div>
            {chargebackStatus.status === 'critical' && (
              <div className="flex items-center gap-1 text-[10px] text-red-600">
                <AlertTriangle className="w-3 h-3" />
                Taxa acima de 1%
              </div>
            )}
          </Card>
        </div>

        {/* Cancelamentos (se houver) */}
        {healthData.totalCancelamentos > 0 && (
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ban className="w-4 h-4" />
                <span className="text-xs font-medium">Cancelamentos</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold">{healthData.totalCancelamentos}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(healthData.valorCancelado)}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {formatPercent(healthData.taxaCancelamento)}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Resumo de referência */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Vendas aprovadas no período: {healthData.vendasAprovadas}</span>
          {!healthData.abandonoAtribuivel && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Abandono parcial
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Alguns abandonos não puderam ser atribuídos pois o produto está em múltiplos funis.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Summary component for showing all funnels health overview
interface FunnelHealthSummaryProps {
  healthMetrics: FunnelHealthData[];
  unattributedCount: number;
}

export function FunnelHealthSummary({ healthMetrics, unattributedCount }: FunnelHealthSummaryProps) {
  const totals = healthMetrics.reduce((acc, m) => ({
    abandonos: acc.abandonos + m.totalAbandonos,
    recuperados: acc.recuperados + m.abandonosRecuperados,
    reembolsos: acc.reembolsos + m.totalReembolsos,
    chargebacks: acc.chargebacks + m.totalChargebacks,
    valorReembolsos: acc.valorReembolsos + m.valorReembolsado,
    valorChargebacks: acc.valorChargebacks + m.valorChargeback,
  }), {
    abandonos: 0,
    recuperados: 0,
    reembolsos: 0,
    chargebacks: 0,
    valorReembolsos: 0,
    valorChargebacks: 0,
  });

  const taxaRecuperacaoGlobal = totals.abandonos > 0 
    ? (totals.recuperados / totals.abandonos) * 100 
    : 0;

  return (
    <TooltipProvider>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          Resumo de Saúde - Todos os Funis
          {unattributedCount > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-[10px] gap-1 text-yellow-600">
                  <AlertTriangle className="w-3 h-3" />
                  {unattributedCount} não atribuídos
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{unattributedCount} abandonos não puderam ser atribuídos a um funil específico</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Isso acontece quando o produto está em múltiplos funis como FRONT.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-orange-600 mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs">Abandonos</span>
            </div>
            <p className="text-2xl font-bold">{totals.abandonos}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-green-600 mb-1">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Recuperados</span>
            </div>
            <p className="text-2xl font-bold">{totals.recuperados}</p>
            <p className="text-xs text-muted-foreground">{formatPercent(taxaRecuperacaoGlobal)}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1">
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs">Reembolsos</span>
            </div>
            <p className="text-2xl font-bold">{totals.reembolsos}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.valorReembolsos)}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-red-600 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Chargebacks</span>
            </div>
            <p className="text-2xl font-bold">{totals.chargebacks}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.valorChargebacks)}</p>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
