import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/AppHeader';
import { CubeLoader } from '@/components/CubeLoader';
import { useTenantNavigation } from '@/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { useEdition } from '@/hooks/useLaunchEditions';
import { useLaunchEditionData } from '@/hooks/useLaunchEditionData';
import { PassingDiarioChart } from '@/components/launch/PassingDiarioChart';
import { LaunchProductsSalesBreakdown } from '@/components/launch/LaunchProductsSalesBreakdown';
import { LaunchConversionAnalysis } from '@/components/launch/LaunchConversionAnalysis';
import { supabase } from '@/integrations/supabase/client';

const STATUS_MAP = {
  planned: { label: 'Planejada', className: 'bg-slate-100 text-slate-700' },
  active: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
  finished: { label: 'Encerrada', className: 'bg-amber-100 text-amber-700' },
} as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export default function LaunchEditionAnalysis() {
  const { funnelId, editionId } = useParams<{ funnelId: string; editionId: string }>();
  const { navigateTo } = useTenantNavigation();
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';

  const edition = useEdition(editionId);
  const editionData = edition.data;
  const editionLoading = edition.isLoading;

  // Fetch funnel's launch_tag for conversion analysis
  const { data: funnel } = useQuery({
    queryKey: ['funnel-tag', funnelId],
    enabled: !!funnelId && !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('funnels')
        .select('id, name, launch_tag')
        .eq('id', funnelId!)
        .single();
      return data;
    },
  });

  const { kpis, kpisLoading, passingDiario, passingLoading } = useLaunchEditionData(
    projectId, funnelId!, editionData
  );

  if (editionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-6 py-8 flex justify-center">
          <CubeLoader message="Carregando edição..." size="lg" />
        </main>
      </div>
    );
  }

  if (!editionData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-6 py-8 flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Edição não encontrada.</p>
          <Button variant="outline" onClick={() => navigateTo('/lancamentos')}>
            Voltar para Lançamentos
          </Button>
        </main>
      </div>
    );
  }

  const status = STATUS_MAP[editionData.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.planned;
  const fmtDate = (d: string | null) =>
    d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

  const startDate = editionData.start_date ? new Date(editionData.start_date) : new Date();
  const endDate = editionData.end_date ? new Date(editionData.end_date) : new Date();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 shrink-0"
              onClick={() => navigateTo('/lancamentos')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {funnel?.name && (
                  <span className="text-sm text-muted-foreground">{funnel.name} —</span>
                )}
                <h1 className="text-xl font-semibold truncate">{editionData.name}</h1>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                {editionData.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Início: {fmtDate(editionData.start_date)}
                  </span>
                )}
                {editionData.event_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Evento: {fmtDate(editionData.event_date)}
                  </span>
                )}
                {editionData.end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Encerramento: {fmtDate(editionData.end_date)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Ingressos vendidos"
              value={kpisLoading ? '—' : String(kpis?.totalIngressos ?? 0)}
            />
            <KpiCard
              label="Faturamento total"
              value={kpisLoading ? '—' : formatCurrency(kpis?.faturamentoTotal ?? 0)}
            />
            <KpiCard
              label="ROAS da edição"
              value={kpisLoading ? '—' : `${(kpis?.roas ?? 0).toFixed(2)}x`}
            />
            <KpiCard
              label="Show rate"
              value="N/A"
              subtitle="Disponível em breve"
            />
          </div>

          {/* Passing diário */}
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="font-semibold">Passing Diário — Ingressos</h2>
              <p className="text-sm text-muted-foreground">
                Vendas diárias vs meta. Verde ≥ meta · Âmbar 70–99% · Vermelho &lt; 70%
              </p>
            </div>
            {passingLoading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : (
              <PassingDiarioChart data={passingDiario} />
            )}
          </Card>

          {/* Funil de conversão */}
          {funnelId && editionData.start_date && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">Funil de Conversão</h2>
              <LaunchProductsSalesBreakdown
                funnelId={funnelId}
                projectId={projectId}
                startDate={startDate}
                endDate={endDate}
              />
            </Card>
          )}

          {/* Análise de conversão lead→comprador */}
          {funnelId && editionData.start_date && (
            <LaunchConversionAnalysis
              funnelId={funnelId}
              projectId={projectId}
              launchTag={funnel?.launch_tag ?? null}
              startDate={startDate}
              endDate={endDate}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  label, value, subtitle,
}: { label: string; value: string; subtitle?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </Card>
  );
}
