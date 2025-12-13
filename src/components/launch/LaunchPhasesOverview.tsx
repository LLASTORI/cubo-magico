import { useLaunchPhaseMetrics } from "@/hooks/useLaunchPhaseMetrics";
import { LaunchPhaseMetricsCard } from "./LaunchPhaseMetricsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface LaunchPhasesOverviewProps {
  projectId: string;
  funnelId: string;
  startDate: Date;
  endDate: Date;
}

export const LaunchPhasesOverview = ({
  projectId,
  funnelId,
  startDate,
  endDate,
}: LaunchPhasesOverviewProps) => {
  const { phaseMetrics, totalPhaseSpend, isLoading } = useLaunchPhaseMetrics({
    projectId,
    funnelId,
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  if (phaseMetrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Layers className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">
          Nenhuma fase configurada para este lançamento.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Configure as fases nas configurações do lançamento para ver as métricas aqui.
        </p>
      </div>
    );
  }

  // Sort by phase order
  const sortedPhases = [...phaseMetrics].sort((a, b) => a.phaseOrder - b.phaseOrder);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            Métricas por Fase
          </h4>
          <Badge variant="outline" className="text-xs">
            {phaseMetrics.length} fase(s)
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedPhases.map((metrics) => (
          <LaunchPhaseMetricsCard
            key={metrics.phaseId}
            metrics={metrics}
            totalSpend={totalPhaseSpend}
          />
        ))}
      </div>
    </div>
  );
};