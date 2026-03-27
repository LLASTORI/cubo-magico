import { useMemo } from 'react';
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
import { useFunnelHealthMetrics } from '@/hooks/useFunnelHealthMetrics';
import { useMetaHierarchy } from '@/hooks/useMetaHierarchy';
import { PassingDiarioChart } from '@/components/launch/PassingDiarioChart';
import { LaunchProductsSalesBreakdown } from '@/components/launch/LaunchProductsSalesBreakdown';
import { LaunchConversionAnalysis } from '@/components/launch/LaunchConversionAnalysis';
import { LaunchPagoConversaoBlock } from '@/components/launch/LaunchPagoConversaoBlock';
import PaymentMethodAnalysis from '@/components/funnel/PaymentMethodAnalysis';
import UTMAnalysis from '@/components/funnel/UTMAnalysis';
import { FunnelHealthMetrics } from '@/components/funnel/FunnelHealthMetrics';
import { MetaHierarchyAnalysis } from '@/components/meta/MetaHierarchyAnalysis';
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
        .select('id, name, launch_tag, funnel_model')
        .eq('id', funnelId!)
        .single();
      return data;
    },
  });

  const { kpis, kpisLoading, passingDiario, passingLoading } = useLaunchEditionData(
    projectId, funnelId!, editionData
  );

  // Datas da edição (usadas por múltiplos hooks abaixo)
  const editionEndDate = editionData?.end_date || editionData?.event_date || editionData?.start_date;
  const startDate = editionData?.start_date ? new Date(editionData.start_date) : new Date();
  const endDate = editionEndDate ? new Date(editionEndDate) : new Date();

  // Sales data completo para blocos reutilizáveis
  const { data: editionSalesData = [] } = useQuery({
    queryKey: ['edition-sales', projectId, funnelId, editionData?.id, editionData?.start_date, editionEndDate],
    enabled: !!editionData?.start_date && !!projectId && !!funnelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_orders_view')
        .select('order_id, customer_paid, producer_net, main_offer_code, all_offer_codes, buyer_email, economic_day, payment_method, meta_campaign_id, meta_adset_id, meta_ad_id, utm_source, utm_medium, utm_campaign, utm_content, utm_adset, utm_placement, checkout_origin, main_revenue, status')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId!)
        .in('status', ['approved', 'completed', 'partial_refund'])
        .gte('economic_day', editionData!.start_date!)
        .lte('economic_day', editionEndDate!);
      if (error) throw error;
      return (data || []).map(r => ({
        offer_code: r.main_offer_code,
        gross_amount: Number(r.customer_paid) || 0,
        net_amount: Number(r.producer_net) || 0,
        buyer_email: r.buyer_email,
        payment_method: r.payment_method,
        economic_day: r.economic_day,
        meta_campaign_id: r.meta_campaign_id,
        meta_adset_id: r.meta_adset_id,
        meta_ad_id: r.meta_ad_id,
        utm_source: r.utm_source,
        utm_medium: r.utm_medium,
        utm_campaign: r.utm_campaign,
        utm_content: r.utm_content,
        utm_adset: r.utm_adset,
        utm_placement: r.utm_placement,
        checkout_origin: r.checkout_origin,
        main_revenue: Number(r.main_revenue) || 0,
        all_offer_codes: r.all_offer_codes,
      }));
    },
  });

  const funnelOfferCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const s of editionSalesData) {
      if (s.offer_code) codes.add(s.offer_code);
      if (s.all_offer_codes) s.all_offer_codes.forEach((c: string) => codes.add(c));
    }
    return Array.from(codes);
  }, [editionSalesData]);

  // Campaign IDs presentes nas vendas da edição — escopa Meta insights
  const editionCampaignIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of editionSalesData) {
      if (s.meta_campaign_id) ids.add(s.meta_campaign_id);
    }
    return Array.from(ids);
  }, [editionSalesData]);

  // Meta insights filtrados pelo período da edição E pelas campanhas da edição
  const { data: editionMetaInsights = [] } = useQuery({
    queryKey: ['edition-meta-insights', projectId, editionData?.id, editionData?.start_date, editionEndDate, editionCampaignIds],
    enabled: !!editionData?.start_date && !!projectId && editionCampaignIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from('meta_insights')
        .select('*')
        .eq('project_id', projectId)
        .in('campaign_id', editionCampaignIds);
      if (editionData!.start_date) q = q.gte('date_start', editionData!.start_date);
      if (editionEndDate) q = q.lte('date_start', editionEndDate);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Meta hierarchy (campaigns, adsets, ads)
  const { campaigns, adsets, ads, isLoading: metaHierarchyLoading } = useMetaHierarchy({
    projectId: projectId || undefined,
    insights: editionMetaInsights,
    enabled: editionMetaInsights.length > 0,
  });

  // Saúde do funil (abandonos, reembolsos, chargebacks via crm_transactions)
  const { healthMetrics, isLoading: healthLoading } = useFunnelHealthMetrics({
    projectId: projectId || undefined,
    funnelId,
    startDate,
    endDate,
  });

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
          <Button variant="outline" onClick={() => navigateTo('/launch-dashboard')}>
            Voltar para Lançamentos
          </Button>
        </main>
      </div>
    );
  }

  const status = STATUS_MAP[editionData.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.planned;
  const fmtDate = (d: string | null) =>
    d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

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
              onClick={() => navigateTo('/launch-dashboard')}
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
              value="—"
              subtitle="Requer dados de presença"
              muted
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

          {/* Análise de conversão — bloco depende do modelo do funil */}
          {funnelId && editionData.start_date && (
            funnel?.funnel_model === 'lancamento_pago' ? (
              <LaunchPagoConversaoBlock
                funnelId={funnelId}
                projectId={projectId}
                edition={editionData}
              />
            ) : (
              <LaunchConversionAnalysis
                funnelId={funnelId}
                projectId={projectId}
                launchTag={funnel?.launch_tag ?? null}
                startDate={startDate}
                endDate={endDate}
              />
            )
          )}

          {/* Formas de Pagamento */}
          {editionSalesData.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">Formas de Pagamento</h2>
              <PaymentMethodAnalysis
                salesData={editionSalesData}
              />
            </Card>
          )}

          {/* Saúde do Funil */}
          {!healthLoading && healthMetrics && healthMetrics.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">Saúde do Funil</h2>
              <FunnelHealthMetrics healthData={healthMetrics[0]} />
            </Card>
          )}

          {/* UTM / Criativos */}
          {editionSalesData.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">UTM / Criativos</h2>
              <UTMAnalysis
                salesData={editionSalesData}
                funnelOfferCodes={funnelOfferCodes}
                metaInsights={editionMetaInsights}
                metaCampaigns={campaigns}
                metaAdsets={adsets}
                metaAds={ads}
              />
            </Card>
          )}

          {/* Meta Ads — Campanhas */}
          {editionMetaInsights.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">Meta Ads — Campanhas</h2>
              <MetaHierarchyAnalysis
                insights={editionMetaInsights}
                campaigns={campaigns}
                adsets={adsets}
                ads={ads}
                loading={metaHierarchyLoading}
              />
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  label, value, subtitle, muted,
}: { label: string; value: string; subtitle?: string; muted?: boolean }) {
  return (
    <Card className="p-4 hover:border-cyan-500/40 transition-colors">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${muted ? 'text-muted-foreground' : 'text-cyan-400'}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </Card>
  );
}
