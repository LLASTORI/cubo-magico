import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  format, parseISO, isAfter, isBefore,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Calendar, TrendingUp, DollarSign,
  Target, ShoppingCart, CreditCard, BarChart3,
  Megaphone, Layers, Activity,
  Wallet, Tag, LayoutGrid, Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { CrossPhaseConversionCard } from '@/components/launch/CrossPhaseConversionCard';
import { useCrossPhaseConversion } from '@/hooks/useCrossPhaseConversion';
import { supabase } from '@/integrations/supabase/client';

/* ── helpers ─────────────────────────────────────────── */

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/** Status automático baseado em datas vs hoje */
function computeAutoStatus(
  startDatetime?: string | null,
  endDatetime?: string | null,
  eventDatetime?: string | null,
): 'planned' | 'active' | 'finished' {
  const now = new Date();
  const effectiveEnd = endDatetime || eventDatetime;
  if (!startDatetime) return 'planned';
  const start = parseISO(startDatetime);
  if (isBefore(now, start)) return 'planned';
  if (effectiveEnd && isAfter(now, parseISO(effectiveEnd))) {
    return 'finished';
  }
  return 'active';
}

const STATUS_CONFIG = {
  planned: {
    label: 'Planejada',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  },
  active: {
    label: 'Ativa',
    dot: 'bg-green-400 animate-pulse',
    badge: 'bg-green-500/15 text-green-400 border-green-500/25',
  },
  finished: {
    label: 'Encerrada',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  },
} as const;

/* ── main component ──────────────────────────────────── */

export default function LaunchEditionAnalysis() {
  const { funnelId, editionId } = useParams<{
    funnelId: string;
    editionId: string;
  }>();
  const { navigateTo } = useTenantNavigation();
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';

  const edition = useEdition(editionId);
  const editionData = edition.data;
  const editionLoading = edition.isLoading;

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

  const {
    kpis, kpisLoading, passingDiario, passingLoading,
  } = useLaunchEditionData(projectId, funnelId!, editionData);

  const editionEndDate =
    editionData?.end_datetime ||
    editionData?.event_datetime ||
    editionData?.start_datetime;
  const startDate = editionData?.start_datetime
    ? parseISO(editionData.start_datetime) : new Date();
  const endDate = editionEndDate
    ? parseISO(editionEndDate) : new Date();

  const { data: editionSalesData = [] } = useQuery({
    queryKey: [
      'edition-sales', projectId, funnelId,
      editionData?.id, editionData?.start_datetime,
      editionEndDate,
    ],
    enabled: !!editionData?.start_datetime
      && !!projectId && !!funnelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_orders_view')
        .select(`
          order_id, customer_paid, producer_net,
          main_offer_code, all_offer_codes, buyer_email,
          economic_day, payment_method,
          meta_campaign_id, meta_adset_id, meta_ad_id,
          utm_source, utm_medium, utm_campaign,
          utm_content, utm_adset, utm_placement,
          checkout_origin, main_revenue, status
        `)
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId!)
        .not('main_offer_code', 'is', null)
        .gte(
          'economic_day',
          editionData!.start_datetime!.slice(0, 10),
        )
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
      if (s.all_offer_codes) {
        s.all_offer_codes.forEach((c: string) => codes.add(c));
      }
    }
    return Array.from(codes);
  }, [editionSalesData]);

  const editionCampaignIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of editionSalesData) {
      if (s.meta_campaign_id) ids.add(s.meta_campaign_id);
    }
    return Array.from(ids);
  }, [editionSalesData]);

  const { data: editionMetaInsights = [] } = useQuery({
    queryKey: [
      'edition-meta-insights', projectId, editionData?.id,
      editionData?.start_datetime, editionEndDate,
      editionCampaignIds,
    ],
    enabled: !!editionData?.start_datetime
      && !!projectId && editionCampaignIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from('meta_insights')
        .select('*')
        .eq('project_id', projectId)
        .in('campaign_id', editionCampaignIds);
      if (editionData!.start_datetime) {
        q = q.gte(
          'date_start',
          editionData!.start_datetime.slice(0, 10),
        );
      }
      if (editionEndDate) {
        q = q.lte('date_start', editionEndDate.slice(0, 10));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const {
    lotsAnalysis, editionTotals,
    unassigned: unassignedSales,
  } = useLaunchLotsAnalysis(
    editionData?.id, editionSalesData, editionMetaInsights,
  );

  const { data: produtoSalesData = [] } = useQuery({
    queryKey: [
      'edition-produto-sales', projectId, funnelId,
      editionData?.id,
    ],
    enabled: !!editionData && !!projectId && !!funnelId,
    queryFn: async () => {
      const { data: phases } = await supabase
        .from('launch_phases')
        .select('id')
        .eq('edition_id', editionData!.id)
        .in('phase_type', ['vendas', 'pitch', 'single_shot']);
      if (!phases?.length) return [];

      const phaseIds = phases.map(p => p.id);
      const { data: offers } = await supabase
        .from('offer_mappings')
        .select('codigo_oferta')
        .in('phase_id', phaseIds)
        .eq('is_active', true);
      if (!offers?.length) return [];

      const offerCodes = offers
        .map(o => o.codigo_oferta)
        .filter(Boolean) as string[];
      if (offerCodes.length === 0) return [];

      const sd = editionData!.start_datetime?.slice(0, 10);
      const ed = (
        editionData!.end_datetime ||
        editionData!.event_datetime
      )?.slice(0, 10);

      let q = supabase
        .from('funnel_orders_view')
        .select(`
          order_id, customer_paid, buyer_email,
          economic_day, main_offer_code
        `)
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId!)
        .in('main_offer_code', offerCodes);
      if (sd) q = q.gte('economic_day', sd);
      if (ed) q = q.lte('economic_day', ed);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(r => ({
        offer_code: r.main_offer_code,
        gross_amount: Number(r.customer_paid) || 0,
        buyer_email: r.buyer_email,
        economic_day: r.economic_day,
      }));
    },
  });

  const crossPhaseData = useCrossPhaseConversion(
    editionSalesData, produtoSalesData, lotsAnalysis,
  );

  const [selectedLotId, setSelectedLotId] = useState<
    string | null
  >(null);

  const selectedLot = useMemo(
    () =>
      lotsAnalysis.find(la => la.lot.id === selectedLotId)
      ?? null,
    [lotsAnalysis, selectedLotId],
  );

  const filteredSalesData = useMemo(() => {
    if (!selectedLot) return editionSalesData;
    const lotStart =
      selectedLot.lot.start_datetime?.slice(0, 10);
    const lotEnd =
      selectedLot.lot.end_datetime?.slice(0, 10);
    const lotOfferCodes = selectedLot.lot.offers
      .map(o => o.codigo_oferta)
      .filter(Boolean) as string[];
    return editionSalesData.filter(s => {
      const day = s.economic_day;
      if (!day || !lotStart) return false;
      if (day < lotStart) return false;
      if (lotEnd && day > lotEnd) return false;
      if (
        s.offer_code &&
        lotOfferCodes.includes(s.offer_code)
      ) return true;
      if (
        s.all_offer_codes?.some(
          (c: string) => lotOfferCodes.includes(c),
        )
      ) return true;
      return false;
    });
  }, [selectedLot, editionSalesData]);

  const filteredMetaInsights = useMemo(() => {
    if (!selectedLot) return editionMetaInsights;
    const lotStart =
      selectedLot.lot.start_datetime?.slice(0, 10);
    const lotEnd =
      selectedLot.lot.end_datetime?.slice(0, 10);
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
      if (s.all_offer_codes) {
        s.all_offer_codes.forEach(
          (c: string) => codes.add(c),
        );
      }
    }
    return Array.from(codes);
  }, [filteredSalesData]);

  const effectiveStartDate = selectedLot?.lot.start_datetime
    ? parseISO(selectedLot.lot.start_datetime) : startDate;
  const effectiveEndDate = selectedLot?.lot.end_datetime
    ? parseISO(selectedLot.lot.end_datetime) : endDate;

  const lotPassingDiario = useMemo(() => {
    if (!selectedLot) return null;
    const lotStart =
      selectedLot.lot.start_datetime?.slice(0, 10);
    const lotEnd =
      selectedLot.lot.end_datetime?.slice(0, 10);
    if (!lotStart) return null;
    const endStr = lotEnd || lotStart;

    const frontCodes = selectedLot.lot.offers
      .filter(o => o.role === 'front')
      .map(o => o.codigo_oferta)
      .filter(Boolean) as string[];
    const frontSales = filteredSalesData.filter(
      s => s.offer_code && frontCodes.includes(s.offer_code),
    );

    const byDay: Record<string, number> = {};
    for (const s of frontSales) {
      if (s.economic_day) {
        byDay[s.economic_day] =
          (byDay[s.economic_day] || 0) + 1;
      }
    }

    const cur = parseISO(lotStart);
    const end = parseISO(endStr);
    let totalDias = 0;
    const tmp = parseISO(lotStart);
    while (tmp <= end) {
      totalDias++;
      tmp.setDate(tmp.getDate() + 1);
    }

    const totalIngressos = frontSales.length;
    const metaDiaria =
      totalDias > 0 ? totalIngressos / totalDias : 0;

    const result: import(
      '@/hooks/useLaunchEditionData'
    ).PassingDiarioItem[] = [];
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const ingressos = byDay[dateStr] || 0;
      const pct =
        metaDiaria > 0 ? ingressos / metaDiaria : 0;
      result.push({
        date: dateStr,
        ingressos,
        meta: Math.round(metaDiaria),
        status:
          pct >= 1 ? 'above' : pct >= 0.7 ? 'near' : 'below',
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [selectedLot, filteredSalesData]);

  const effectivePassingDiario =
    lotPassingDiario ?? passingDiario;

  const {
    campaigns, adsets, ads,
    isLoading: metaHierarchyLoading,
  } = useMetaHierarchy({
    projectId: projectId || undefined,
    insights: editionMetaInsights,
    enabled: editionMetaInsights.length > 0,
  });

  const {
    healthMetrics, isLoading: healthLoading,
  } = useFunnelHealthMetrics({
    projectId: projectId || undefined,
    funnelId,
    startDate,
    endDate,
  });

  /* ── loading / error states ── */

  if (editionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-6 py-8 flex justify-center">
          <CubeLoader
            message="Carregando edição..."
            size="lg"
          />
        </main>
      </div>
    );
  }

  if (!editionData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-6 py-8 flex flex-col items-center gap-4">
          <p className="text-muted-foreground">
            Edição não encontrada.
          </p>
          <Button
            variant="outline"
            onClick={() => navigateTo('/launch-dashboard')}
          >
            Voltar para Lançamentos
          </Button>
        </main>
      </div>
    );
  }

  /* ── computed values for render ── */

  const autoStatus = computeAutoStatus(
    editionData.start_datetime,
    editionData.end_datetime,
    editionData.event_datetime,
  );
  const statusKey = (
    editionData.status === 'planned' ||
    editionData.status === 'active' ||
    editionData.status === 'finished'
  ) ? autoStatus : 'planned';
  const statusCfg = STATUS_CONFIG[statusKey];

  const fmtDate = (d: string | null) =>
    d
      ? format(parseISO(d), "dd 'de' MMM", { locale: ptBR })
      : '—';
  const inv = kpis?.totalSpend ?? 0;
  const fat = kpis?.faturamentoTotal ?? 0;
  const vendas = kpis?.totalIngressos ?? 0;
  const lucro = fat - inv;
  const cpa = vendas > 0 ? inv / vendas : 0;
  const ticket = vendas > 0 ? fat / vendas : 0;
  const roas = kpis?.roas ?? 0;

  const lotLabel = selectedLot
    ? ` — ${selectedLot.lot.name}` : '';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />

        {/* Inline styles for effects not possible in Tailwind */}
        <style>{`
          @keyframes glow-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .kpi-glow {
            text-shadow: 0 0 20px currentColor;
          }
          .hero-grid {
            background-image:
              linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .section-accent {
            background: linear-gradient(180deg, #22d3ee 0%, #2563eb 50%, transparent 100%);
          }
          .lot-active {
            background: linear-gradient(135deg, rgba(34,211,238,0.15), rgba(37,99,235,0.1));
            box-shadow: 0 0 20px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
          }
          .kpi-card-border {
            position: relative;
          }
          .kpi-card-border::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1px;
            background: linear-gradient(
              135deg,
              var(--kpi-accent, rgba(34,211,238,0.2)),
              transparent 60%
            );
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            opacity: 0;
            transition: opacity 200ms ease;
          }
          .kpi-card-border:hover::before {
            opacity: 1;
          }
        `}</style>

        <main className="container mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-5">

            {/* ═══════════ HERO HEADER ═══════════ */}
            <div className="relative overflow-hidden rounded-xl border border-[#2a3050]">
              {/* Deep layered background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0c1020] via-[#131b35] to-[#0f1525]" />
              {/* Grid pattern overlay */}
              <div className="absolute inset-0 hero-grid" />
              {/* Glow orbs */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none" />
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

              <div className="relative px-6 py-6 sm:px-8">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => navigateTo('/launch-dashboard')}
                    className="mt-1 shrink-0 w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Breadcrumb */}
                    {funnel?.name && (
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-cyan-500/60" />
                        <p className="text-[11px] text-cyan-500/60 tracking-[0.15em] uppercase font-medium">
                          {funnel.name}
                        </p>
                      </div>
                    )}

                    {/* Title + Status */}
                    <div className="flex flex-wrap items-baseline gap-4">
                      <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">
                        {editionData.name}
                      </h1>
                      <div className="flex items-center gap-3">
                        <span className={`
                          inline-flex items-center gap-2 px-3 py-1
                          rounded-md text-xs font-semibold uppercase tracking-wider
                          border backdrop-blur-sm
                          ${statusCfg.badge}
                        `}>
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                        {editionData.edition_number && (
                          <span className="text-sm text-slate-600 font-mono font-bold">
                            #{editionData.edition_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dates as tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      {editionData.start_datetime && (
                        <DateTag
                          icon={<Calendar className="w-3 h-3" />}
                          label="Início"
                          value={fmtDate(editionData.start_datetime)}
                          color="blue"
                        />
                      )}
                      {editionData.event_datetime && (
                        <DateTag
                          icon={<Target className="w-3 h-3" />}
                          label="Evento"
                          value={fmtDate(editionData.event_datetime)}
                          color="amber"
                        />
                      )}
                      {editionData.end_datetime && (
                        <DateTag
                          icon={<Calendar className="w-3 h-3" />}
                          label="Fim"
                          value={fmtDate(editionData.end_datetime)}
                          color="slate"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            </div>

            {/* ═══════════ KPIs ═══════════ */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              <KpiCard
                icon={<DollarSign className="w-3.5 h-3.5" />}
                label="Investimento"
                value={kpisLoading ? '—' : formatCurrency(inv)}
                tooltip="Total investido em Meta Ads"
                variant="spend"
              />
              <KpiCard
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Faturamento"
                value={kpisLoading ? '—' : formatCurrency(fat)}
                tooltip="Receita bruta (customer_paid)"
                variant="revenue"
              />
              <KpiCard
                icon={<Wallet className="w-3.5 h-3.5" />}
                label="Lucro"
                value={kpisLoading ? '—' : formatCurrency(lucro)}
                tooltip="Faturamento - Investimento"
                variant={lucro >= 0 ? 'profit' : 'danger'}
              />
              <KpiCard
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                label="ROAS"
                value={kpisLoading ? '—' : `${roas.toFixed(2)}x`}
                tooltip="Return on Ad Spend"
                variant={
                  roas >= 2 ? 'epic'
                    : roas >= 1 ? 'default'
                      : 'danger'
                }
              />
              <KpiCard
                icon={<Ticket className="w-3.5 h-3.5" />}
                label="Vendas FRONT"
                value={kpisLoading ? '—' : String(vendas)}
                tooltip="Total de vendas da oferta principal"
              />
              <KpiCard
                icon={<ShoppingCart className="w-3.5 h-3.5" />}
                label="CPA"
                value={kpisLoading ? '—' : formatCurrency(cpa)}
                tooltip="Custo por Aquisição"
                variant="spend"
              />
              <KpiCard
                icon={<CreditCard className="w-3.5 h-3.5" />}
                label="Ticket Médio"
                value={kpisLoading ? '—' : formatCurrency(ticket)}
                tooltip="Faturamento / Vendas"
              />
              <KpiCard
                icon={<Target className="w-3.5 h-3.5" />}
                label="Show Rate"
                value="—"
                subtitle="Em breve"
                muted
                tooltip="Requer dados de presença no evento"
              />
            </div>

            {/* ═══════════ LOT SELECTOR ═══════════ */}
            {lotsAnalysis.length > 0 && (
              <div className="flex items-center gap-3 py-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 uppercase tracking-wider font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  Lote
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex flex-wrap gap-1.5">
                  <LotPill
                    active={!selectedLotId}
                    onClick={() => setSelectedLotId(null)}
                  >
                    Todos
                  </LotPill>
                  {lotsAnalysis.map((la) => {
                    const lotStatus = computeAutoStatus(
                      la.lot.start_datetime,
                      la.lot.end_datetime,
                      null,
                    );
                    return (
                      <LotPill
                        key={la.lot.id}
                        active={selectedLotId === la.lot.id}
                        onClick={() => setSelectedLotId(la.lot.id)}
                        status={lotStatus}
                        count={la.totalTickets}
                      >
                        {la.lot.name}
                      </LotPill>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════ PASSING DIÁRIO ═══════════ */}
            <Section
              icon={<Activity className="w-4 h-4" />}
              title={`Passing Diário${lotLabel}`}
              description="Vendas diárias vs meta distribuída"
            >
              {passingLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando...
                </div>
              ) : (
                <PassingDiarioChart
                  data={effectivePassingDiario}
                />
              )}
            </Section>

            {/* ═══════════ EVOLUÇÃO DIÁRIA ═══════════ */}
            {filteredSalesData.length > 0 && (
              <Section
                icon={<TrendingUp className="w-4 h-4" />}
                title={`Evolução Diária${lotLabel}`}
                description="Faturamento e vendas ao longo do tempo"
              >
                <TemporalChart
                  salesData={filteredSalesData}
                  funnelOfferCodes={filteredOfferCodes}
                  startDate={effectiveStartDate}
                  endDate={effectiveEndDate}
                />
              </Section>
            )}

            {/* ═══════════ TABELA DIÁRIA ═══════════ */}
            {filteredSalesData.length > 0 &&
              editionData.start_datetime && (
                <DailyBreakdownTable
                  salesData={filteredSalesData}
                  metaInsights={filteredMetaInsights}
                  lotsAnalysis={lotsAnalysis}
                  startDate={
                    selectedLot?.lot.start_datetime ||
                    editionData.start_datetime
                  }
                  endDate={
                    selectedLot?.lot.end_datetime ||
                    editionEndDate ||
                    editionData.start_datetime
                  }
                />
              )}

            {/* ═══════════ CAMPANHAS ═══════════ */}
            {filteredMetaInsights.length > 0 && (
              <CampaignPerformanceTable
                salesData={filteredSalesData}
                metaInsights={filteredMetaInsights}
              />
            )}

            {/* ═══════════ DETALHAMENTO POR LOTE ═══════════ */}
            {funnelId && editionData.start_datetime && (
              <Section
                icon={<LayoutGrid className="w-4 h-4" />}
                title="Detalhamento por Lote"
                description="Receita, vendas e TX de OBs por lote"
              >
                <LaunchProductsSalesBreakdown
                  lotsAnalysis={lotsAnalysis}
                  editionTotals={editionTotals}
                  unassignedSales={unassignedSales}
                />
              </Section>
            )}

            {/* ═══════════ CONVERSÃO ═══════════ */}
            {funnelId && editionData.start_datetime && (
              funnel?.funnel_model === 'lancamento_pago'
                ? (
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

            {/* ═══════════ CROSS-PHASE ═══════════ */}
            {funnel?.funnel_model === 'lancamento_pago' && (
              <CrossPhaseConversionCard data={crossPhaseData} />
            )}

            {/* ═══════════ PAGAMENTOS ═══════════ */}
            {filteredSalesData.length > 0 && (
              <PaymentMethodAnalysis
                salesData={filteredSalesData}
              />
            )}

            {/* ═══════════ SAÚDE ═══════════ */}
            {!healthLoading &&
              healthMetrics &&
              healthMetrics.length > 0 && (
                <Section
                  icon={<Activity className="w-4 h-4" />}
                  title="Saúde do Funil"
                  description="Abandonos, reembolsos e chargebacks"
                >
                  <FunnelHealthMetrics
                    healthData={healthMetrics[0]}
                  />
                </Section>
              )}

            {/* ═══════════ UTM ═══════════ */}
            {filteredSalesData.length > 0 && (
              <Section
                icon={<Tag className="w-4 h-4" />}
                title={`Fontes e Criativos${lotLabel}`}
                description="Atribuição de vendas por UTM e criativos"
              >
                <UTMAnalysis
                  salesData={filteredSalesData}
                  funnelOfferCodes={filteredOfferCodes}
                  metaInsights={filteredMetaInsights}
                  metaCampaigns={campaigns}
                  metaAdsets={adsets}
                  metaAds={ads}
                />
              </Section>
            )}

            {/* ═══════════ META ADS ═══════════ */}
            {filteredMetaInsights.length > 0 && (
              <Section
                icon={<Megaphone className="w-4 h-4" />}
                title={`Meta Ads${lotLabel}`}
                description="Campanhas, conjuntos e criativos"
              >
                <MetaHierarchyAnalysis
                  insights={filteredMetaInsights}
                  campaigns={campaigns}
                  adsets={adsets}
                  ads={ads}
                  loading={metaHierarchyLoading}
                  salesData={filteredSalesData}
                />
              </Section>
            )}

          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

/* ── Date Tag (hero header) ──────────────────────────── */

function DateTag({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'amber' | 'slate';
}) {
  const colors = {
    blue: 'border-blue-500/20 text-blue-400/80 bg-blue-500/5',
    amber: 'border-amber-500/20 text-amber-400/80 bg-amber-500/5',
    slate: 'border-slate-500/20 text-slate-400/80 bg-slate-500/5',
  };
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1
      rounded-md text-xs border ${colors[color]}
    `}>
      {icon}
      <span className="opacity-60">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
    </span>
  );
}

/* ── Section wrapper ─────────────────────────────────── */

function Section({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Left accent gradient bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] section-accent opacity-60" />

      <div className="pl-5 pr-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-[13px] tracking-tight text-slate-200">
              {title}
            </h2>
            {description && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subtle separator */}
      <div className="mx-5 h-px bg-gradient-to-r from-border/50 via-border/30 to-transparent" />

      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────── */

type KpiVariant =
  | 'default'
  | 'revenue'
  | 'spend'
  | 'danger'
  | 'profit'
  | 'epic';

function KpiCard({
  icon, label, value, subtitle, muted, tooltip,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  muted?: boolean;
  tooltip?: string;
  variant?: KpiVariant;
}) {
  const themes: Record<KpiVariant, {
    value: string;
    icon: string;
    accent: string;
    glow: boolean;
  }> = {
    default: {
      value: 'text-cyan-400',
      icon: 'text-cyan-400 bg-cyan-500/10',
      accent: 'rgba(34,211,238,0.3)',
      glow: false,
    },
    revenue: {
      value: 'text-emerald-400',
      icon: 'text-emerald-400 bg-emerald-500/10',
      accent: 'rgba(52,211,153,0.3)',
      glow: false,
    },
    spend: {
      value: 'text-red-400',
      icon: 'text-red-400 bg-red-500/10',
      accent: 'rgba(248,113,113,0.3)',
      glow: false,
    },
    danger: {
      value: 'text-red-500',
      icon: 'text-red-500 bg-red-500/10',
      accent: 'rgba(239,68,68,0.3)',
      glow: false,
    },
    profit: {
      value: 'text-emerald-400',
      icon: 'text-emerald-400 bg-emerald-500/10',
      accent: 'rgba(52,211,153,0.3)',
      glow: false,
    },
    epic: {
      value: 'text-amber-400 kpi-glow',
      icon: 'text-amber-400 bg-amber-500/15',
      accent: 'rgba(251,191,36,0.4)',
      glow: true,
    },
  };

  const t = muted
    ? {
      value: 'text-muted-foreground',
      icon: 'text-muted-foreground/40 bg-muted/20',
      accent: 'transparent',
      glow: false,
    }
    : themes[variant];

  const card = (
    <div
      className="kpi-card-border rounded-xl border border-border/40 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 cursor-default group"
      style={{ '--kpi-accent': t.accent } as React.CSSProperties}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`
          w-5 h-5 rounded-md flex items-center justify-center
          transition-transform duration-200 group-hover:scale-110
          ${t.icon}
        `}>
          {icon}
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium leading-none">
          {label}
        </span>
      </div>

      {/* Value */}
      <p className={`
        text-xl font-extrabold tabular-nums leading-none
        ${t.value}
      `}>
        {value}
      </p>

      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {subtitle}
        </p>
      )}

      {/* Epic glow effect for outstanding metrics */}
      {t.glow && (
        <div className="absolute -inset-px rounded-xl bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
      )}
    </div>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="text-xs max-w-48 bg-[#1a1f2e] border-border"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Lot Pill ────────────────────────────────────────── */

function LotPill({
  active, onClick, status, count, children,
}: {
  active: boolean;
  onClick: () => void;
  status?: 'planned' | 'active' | 'finished';
  count?: number;
  children: React.ReactNode;
}) {
  const dotColor = status
    ? STATUS_CONFIG[status].dot : undefined;
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-lg text-xs font-semibold
        transition-all duration-200 cursor-pointer
        border
        ${active
          ? 'lot-active text-cyan-300 border-cyan-500/30'
          : 'bg-transparent text-slate-400 border-border/50 hover:border-cyan-500/20 hover:text-slate-300 hover:bg-white/[0.02]'
        }
      `}
    >
      {dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      {children}
      {count !== undefined && count > 0 && (
        <span className={`
          text-[10px] tabular-nums
          ${active ? 'text-cyan-400/60' : 'text-slate-600'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}
