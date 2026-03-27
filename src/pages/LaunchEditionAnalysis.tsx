import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppHeader } from '@/components/AppHeader';
import { CubeLoader } from '@/components/CubeLoader';
import { useTenantNavigation } from '@/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { useEdition } from '@/hooks/useLaunchEditions';
import { useLaunchEditionData } from '@/hooks/useLaunchEditionData';
import { useFunnelHealthMetrics } from '@/hooks/useFunnelHealthMetrics';
import { useMetaHierarchy } from '@/hooks/useMetaHierarchy';
import { useLaunchLotsAnalysis } from '@/hooks/useLaunchLotsAnalysis';
import { PassingDiarioChart } from '@/components/launch/PassingDiarioChart';
import { LaunchProductsSalesBreakdown } from '@/components/launch/LaunchProductsSalesBreakdown';
import { LaunchConversionAnalysis } from '@/components/launch/LaunchConversionAnalysis';
import { LaunchPagoConversaoBlock } from '@/components/launch/LaunchPagoConversaoBlock';
import PaymentMethodAnalysis from '@/components/funnel/PaymentMethodAnalysis';
import UTMAnalysis from '@/components/funnel/UTMAnalysis';
import { FunnelHealthMetrics } from '@/components/funnel/FunnelHealthMetrics';
import { MetaHierarchyAnalysis } from '@/components/meta/MetaHierarchyAnalysis';
import TemporalChart from '@/components/funnel/TemporalChart';
import { DailyBreakdownTable } from '@/components/launch/DailyBreakdownTable';
import { CampaignPerformanceTable } from '@/components/launch/CampaignPerformanceTable';
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
  const editionEndDate = editionData?.end_datetime || editionData?.event_datetime || editionData?.start_datetime;
  // fase1End = event_datetime (se existe) senão end_datetime — mesmo range do KPI "Ingressos"
  const fase1End = editionData?.event_datetime || editionEndDate;
  const startDate = editionData?.start_datetime ? parseISO(editionData.start_datetime) : new Date();
  const endDate = editionEndDate ? parseISO(editionEndDate) : new Date();
  const fase1EndDate = fase1End ? parseISO(fase1End) : endDate;

  // Sales data completo para blocos reutilizáveis
  const { data: editionSalesData = [] } = useQuery({
    queryKey: ['edition-sales', projectId, funnelId, editionData?.id, editionData?.start_datetime, editionEndDate],
    enabled: !!editionData?.start_datetime && !!projectId && !!funnelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_orders_view')
        .select('order_id, customer_paid, producer_net, main_offer_code, all_offer_codes, buyer_email, economic_day, payment_method, meta_campaign_id, meta_adset_id, meta_ad_id, utm_source, utm_medium, utm_campaign, utm_content, utm_adset, utm_placement, checkout_origin, main_revenue, status')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId!)
        .not('main_offer_code', 'is', null)
        .gte('economic_day', editionData!.start_datetime!.slice(0, 10))
        .lte('economic_day', editionEndDate!.slice(0, 10));
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
    queryKey: ['edition-meta-insights', projectId, editionData?.id, editionData?.start_datetime, editionEndDate, editionCampaignIds],
    enabled: !!editionData?.start_datetime && !!projectId && editionCampaignIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from('meta_insights')
        .select('*')
        .eq('project_id', projectId)
        .in('campaign_id', editionCampaignIds);
      if (editionData!.start_datetime) q = q.gte('date_start', editionData!.start_datetime.slice(0, 10));
      if (editionEndDate) q = q.lte('date_start', editionEndDate.slice(0, 10));
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Análise por lote — agrupa vendas e spend por lote configurado
  const {
    lotsAnalysis,
    editionTotals,
    unassigned: unassignedSales,
  } = useLaunchLotsAnalysis(editionData?.id, editionSalesData, editionMetaInsights);

  // Seletor de lote — filtra blocos abaixo
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const selectedLot = useMemo(
    () => lotsAnalysis.find(la => la.lot.id === selectedLotId) ?? null,
    [lotsAnalysis, selectedLotId]
  );

  // Dados filtrados pelo lote selecionado (ou edição inteira se "all")
  const filteredSalesData = useMemo(() => {
    if (!selectedLot) return editionSalesData;
    const lotStart = selectedLot.lot.start_datetime?.slice(0, 10);
    const lotEnd = selectedLot.lot.end_datetime?.slice(0, 10);
    const lotOfferCodes = selectedLot.lot.offers
      .map(o => o.codigo_oferta).filter(Boolean) as string[];
    return editionSalesData.filter(s => {
      const day = s.economic_day;
      if (!day || !lotStart) return false;
      if (day < lotStart) return false;
      if (lotEnd && day > lotEnd) return false;
      if (s.offer_code && lotOfferCodes.includes(s.offer_code)) return true;
      if (s.all_offer_codes?.some(c => lotOfferCodes.includes(c))) return true;
      return false;
    });
  }, [selectedLot, editionSalesData]);

  const filteredMetaInsights = useMemo(() => {
    if (!selectedLot) return editionMetaInsights;
    const lotStart = selectedLot.lot.start_datetime?.slice(0, 10);
    const lotEnd = selectedLot.lot.end_datetime?.slice(0, 10);
    return editionMetaInsights.filter(m => {
      const d = m.date_start?.slice(0, 10);
      if (!d || !lotStart) return false;
      if (d < lotStart) return false;
      if (lotEnd && d > lotEnd) return false;
      return true;
    });
  }, [selectedLot, editionMetaInsights]);

  const filteredOfferCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const s of filteredSalesData) {
      if (s.offer_code) codes.add(s.offer_code);
      if (s.all_offer_codes) s.all_offer_codes.forEach((c: string) => codes.add(c));
    }
    return Array.from(codes);
  }, [filteredSalesData]);

  // Datas efetivas (lote selecionado ou edição)
  const effectiveStartDate = selectedLot?.lot.start_datetime
    ? parseISO(selectedLot.lot.start_datetime) : startDate;
  const effectiveEndDate = selectedLot?.lot.end_datetime
    ? parseISO(selectedLot.lot.end_datetime) : endDate;

  // Passing diário reativo ao lote (computa do filteredSalesData em memória)
  const lotPassingDiario = useMemo(() => {
    if (!selectedLot) return null; // usa passingDiario do hook
    const lotStart = selectedLot.lot.start_datetime?.slice(0, 10);
    const lotEnd = selectedLot.lot.end_datetime?.slice(0, 10);
    if (!lotStart) return null;
    const endStr = lotEnd || lotStart;

    // Contar vendas FRONT por dia no range do lote
    const frontCodes = selectedLot.lot.offers
      .filter(o => o.role === 'front')
      .map(o => o.codigo_oferta)
      .filter(Boolean) as string[];

    const frontSales = filteredSalesData.filter(
      s => s.offer_code && frontCodes.includes(s.offer_code)
    );

    const byDay: Record<string, number> = {};
    for (const s of frontSales) {
      if (s.economic_day) {
        byDay[s.economic_day] = (byDay[s.economic_day] || 0) + 1;
      }
    }

    // Gerar range de dias
    const cur = parseISO(lotStart);
    const end = parseISO(endStr);
    let totalDias = 0;
    const tmp = parseISO(lotStart);
    while (tmp <= end) { totalDias++; tmp.setDate(tmp.getDate() + 1); }

    const totalIngressos = frontSales.length;
    const metaDiaria = totalDias > 0 ? totalIngressos / totalDias : 0;

    const result: import('@/hooks/useLaunchEditionData').PassingDiarioItem[] = [];
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const ingressos = byDay[dateStr] || 0;
      const pct = metaDiaria > 0 ? ingressos / metaDiaria : 0;
      result.push({
        date: dateStr,
        ingressos,
        meta: Math.round(metaDiaria),
        status: pct >= 1 ? 'above' : pct >= 0.7 ? 'near' : 'below',
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [selectedLot, filteredSalesData]);

  // Passing efetivo: do lote se selecionado, senão da edição
  const effectivePassingDiario = lotPassingDiario ?? passingDiario;

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
    d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

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
                {editionData.start_datetime && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Início: {fmtDate(editionData.start_datetime)}
                  </span>
                )}
                {editionData.event_datetime && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Evento: {fmtDate(editionData.event_datetime)}
                  </span>
                )}
                {editionData.end_datetime && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Encerramento: {fmtDate(editionData.end_datetime)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          {(() => {
            const inv = kpis?.totalSpend ?? 0;
            const fat = kpis?.faturamentoTotal ?? 0;
            const vendas = kpis?.totalIngressos ?? 0;
            const lucro = fat - inv;
            const cpa = vendas > 0 ? inv / vendas : 0;
            const ticket = vendas > 0 ? fat / vendas : 0;
            const roas = kpis?.roas ?? 0;
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                <KpiCard
                  label="Investimento"
                  value={kpisLoading ? '—' : formatCurrency(inv)}
                  variant="spend"
                />
                <KpiCard
                  label="Faturamento"
                  value={kpisLoading ? '—' : formatCurrency(fat)}
                  variant="revenue"
                />
                <KpiCard
                  label="Lucro"
                  value={kpisLoading ? '—' : formatCurrency(lucro)}
                  variant={lucro >= 0 ? 'revenue' : 'danger'}
                />
                <KpiCard
                  label="ROAS"
                  value={kpisLoading ? '—' : `${roas.toFixed(2)}x`}
                  variant={roas >= 1 ? 'default' : 'danger'}
                />
                <KpiCard
                  label="Vendas FRONT"
                  value={kpisLoading ? '—' : String(vendas)}
                />
                <KpiCard
                  label="CPA"
                  value={kpisLoading ? '—' : formatCurrency(cpa)}
                  variant="spend"
                />
                <KpiCard
                  label="Ticket Médio"
                  value={kpisLoading ? '—' : formatCurrency(ticket)}
                />
                <KpiCard
                  label="Show rate"
                  value="—"
                  subtitle="Sem dados"
                  muted
                />
              </div>
            );
          })()}

          {/* Seletor de lote */}
          {lotsAnalysis.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtrar por lote:</span>
              <Tabs
                value={selectedLotId || 'all'}
                onValueChange={(v) => setSelectedLotId(v === 'all' ? null : v)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-3 h-7">
                    Todos
                  </TabsTrigger>
                  {lotsAnalysis.map((la) => (
                    <TabsTrigger
                      key={la.lot.id}
                      value={la.lot.id}
                      className="text-xs px-3 h-7"
                    >
                      {la.lot.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Passing diário */}
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="font-semibold">
                Passing Diário — Ingressos
                {selectedLot && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedLot.lot.name})
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                Vendas diárias vs meta. Verde ≥ meta · Âmbar 70–99% · Vermelho &lt; 70%
              </p>
            </div>
            {passingLoading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : (
              <PassingDiarioChart data={effectivePassingDiario} />
            )}
          </Card>

          {/* Evolução diária */}
          {filteredSalesData.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">
                Evolução Diária
                {selectedLot && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedLot.lot.name})
                  </span>
                )}
              </h2>
              <TemporalChart
                salesData={filteredSalesData}
                funnelOfferCodes={filteredOfferCodes}
                startDate={effectiveStartDate}
                endDate={effectiveEndDate}
              />
            </Card>
          )}

          {/* Acompanhamento Diário */}
          {filteredSalesData.length > 0 && editionData.start_datetime && (
            <DailyBreakdownTable
              salesData={filteredSalesData}
              metaInsights={filteredMetaInsights}
              lotsAnalysis={lotsAnalysis}
              startDate={selectedLot?.lot.start_datetime || editionData.start_datetime}
              endDate={selectedLot?.lot.end_datetime || editionEndDate || editionData.start_datetime}
            />
          )}

          {/* Performance de Campanhas */}
          {filteredMetaInsights.length > 0 && (
            <CampaignPerformanceTable
              salesData={filteredSalesData}
              metaInsights={filteredMetaInsights}
            />
          )}

          {/* Detalhamento por Lote */}
          {funnelId && editionData.start_datetime && (
            <Card className="p-4 space-y-3">
              <LaunchProductsSalesBreakdown
                lotsAnalysis={lotsAnalysis}
                editionTotals={editionTotals}
                unassignedSales={unassignedSales}
              />
            </Card>
          )}

          {/* Análise de conversão — bloco depende do modelo do funil */}
          {funnelId && editionData.start_datetime && (
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
          {filteredSalesData.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">Formas de Pagamento</h2>
              <PaymentMethodAnalysis
                salesData={filteredSalesData}
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
          {filteredSalesData.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">
                UTM / Criativos
                {selectedLot && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedLot.lot.name})
                  </span>
                )}
              </h2>
              <UTMAnalysis
                salesData={filteredSalesData}
                funnelOfferCodes={filteredOfferCodes}
                metaInsights={filteredMetaInsights}
                metaCampaigns={campaigns}
                metaAdsets={adsets}
                metaAds={ads}
              />
            </Card>
          )}

          {/* Meta Ads — Campanhas */}
          {filteredMetaInsights.length > 0 && (
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">
                Meta Ads — Campanhas
                {selectedLot && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedLot.lot.name})
                  </span>
                )}
              </h2>
              <MetaHierarchyAnalysis
                insights={filteredMetaInsights}
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
  label, value, subtitle, muted, variant = 'default',
}: {
  label: string;
  value: string;
  subtitle?: string;
  muted?: boolean;
  variant?: 'default' | 'revenue' | 'spend' | 'danger';
}) {
  const colorMap = {
    default: 'text-cyan-400',
    revenue: 'text-green-400',
    spend: 'text-red-400',
    danger: 'text-red-500',
  };
  const color = muted ? 'text-muted-foreground' : colorMap[variant];
  return (
    <Card className="p-3 hover:border-cyan-500/40 transition-colors">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-0.5 ${color}`}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </Card>
  );
}
