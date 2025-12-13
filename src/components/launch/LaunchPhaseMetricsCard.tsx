import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Target, Users, Eye, Clock, TrendingUp, DollarSign, 
  MousePointer, Megaphone, Wand2 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  PhaseMetrics, 
  getPhaseTypeInfo, 
  formatPrimaryMetricValue 
} from "@/hooks/useLaunchPhaseMetrics";

interface LaunchPhaseMetricsCardProps {
  metrics: PhaseMetrics;
  totalSpend: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatNumber = (value: number, decimals = 0) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const getPhaseColor = (phaseType: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    distribuicao: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/30" },
    captacao: { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/30" },
    aquecimento: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/30" },
    lembrete: { bg: "bg-cyan-500/10", text: "text-cyan-600", border: "border-cyan-500/30" },
    remarketing: { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/30" },
    vendas: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" },
    ultima_oportunidade: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/30" },
    flash_open: { bg: "bg-yellow-500/10", text: "text-yellow-600", border: "border-yellow-500/30" },
    downsell: { bg: "bg-pink-500/10", text: "text-pink-600", border: "border-pink-500/30" },
  };
  return colors[phaseType] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
};

export const LaunchPhaseMetricsCard = ({ 
  metrics, 
  totalSpend 
}: LaunchPhaseMetricsCardProps) => {
  const typeInfo = getPhaseTypeInfo(metrics.phaseType);
  const colors = getPhaseColor(metrics.phaseType);
  const primaryValue = formatPrimaryMetricValue(metrics.phaseType, metrics);
  const spendPercentage = totalSpend > 0 ? (metrics.spend / totalSpend) * 100 : 0;

  return (
    <Card
      className={cn(
        "p-4 transition-all border",
        colors.border,
        !metrics.isActive && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge className={cn("border", colors.bg, colors.text, colors.border)}>
            {typeInfo.label}
          </Badge>
          <span className="font-medium text-sm">{metrics.phaseName}</span>
        </div>
        <div className="flex items-center gap-2">
          {metrics.campaignPattern && (
            <Badge variant="outline" className="text-xs gap-1">
              <Wand2 className="w-3 h-3" />
              {metrics.campaignCount}
            </Badge>
          )}
          {!metrics.isActive && (
            <Badge variant="secondary" className="text-xs">Inativo</Badge>
          )}
        </div>
      </div>

      {/* Primary Metric */}
      <div className={cn("p-3 rounded-lg mb-4", colors.bg)}>
        <div className="flex items-center justify-between">
          <span className={cn("text-sm font-medium", colors.text)}>
            {primaryValue.label}
          </span>
          <span className={cn("text-xl font-bold", colors.text)}>
            {primaryValue.value}
          </span>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Investimento</p>
            <p className="font-semibold">{formatCurrency(metrics.spend)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Alcance</p>
            <p className="font-semibold">{formatNumber(metrics.reach)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Impressões</p>
            <p className="font-semibold">{formatNumber(metrics.impressions)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <MousePointer className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cliques</p>
            <p className="font-semibold">{formatNumber(metrics.clicks)}</p>
          </div>
        </div>

        {/* Conditional metrics based on phase type */}
        {(metrics.phaseType === "captacao") && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-muted">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads</p>
              <p className="font-semibold">{formatNumber(metrics.leads)}</p>
            </div>
          </div>
        )}

        {(metrics.phaseType === "vendas" || 
          metrics.phaseType === "ultima_oportunidade" || 
          metrics.phaseType === "flash_open" ||
          metrics.phaseType === "downsell") && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-muted">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compras (Meta)</p>
              <p className="font-semibold">{formatNumber(metrics.purchases)}</p>
            </div>
          </div>
        )}

        {(metrics.phaseType === "lembrete") && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-muted">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Frequência</p>
              <p className="font-semibold">{metrics.frequency.toFixed(2)}x</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Campanhas</p>
            <p className="font-semibold">{metrics.campaignCount}</p>
          </div>
        </div>
      </div>

      {/* Spend Distribution */}
      <div className="mt-4 pt-3 border-t">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">% do investimento total</span>
          <span className="font-medium">{formatNumber(spendPercentage, 1)}%</span>
        </div>
        <Progress value={spendPercentage} className="h-1.5" />
      </div>

      {/* Dates if available */}
      {(metrics.startDate || metrics.endDate) && (
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          {metrics.startDate && metrics.endDate ? (
            <>
              {format(new Date(metrics.startDate), "dd/MM", { locale: ptBR })} -{" "}
              {format(new Date(metrics.endDate), "dd/MM", { locale: ptBR })}
            </>
          ) : metrics.startDate ? (
            <>A partir de {format(new Date(metrics.startDate), "dd/MM", { locale: ptBR })}</>
          ) : null}
        </div>
      )}
    </Card>
  );
};