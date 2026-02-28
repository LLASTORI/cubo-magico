import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format } from "date-fns";
import { PHASE_TYPES } from "./useLaunchPhases";

interface UseLaunchPhaseMetricsProps {
  projectId: string | undefined;
  funnelId: string | undefined;
  startDate: Date;
  endDate: Date;
}

export interface PhaseMetrics {
  phaseId: string;
  phaseName: string;
  phaseType: string;
  phaseOrder: number;
  primaryMetric: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  campaignPattern: string | null;
  // Meta metrics
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  // Actions (from Meta)
  leads: number;
  purchases: number;
  videoViews: number;
  linkClicks: number;
  // Calculated
  cpl: number;
  cpa: number;
  campaignCount: number;
}


const shouldRetryQuery = (_failureCount: number, error: any) => {
  if (!error) return false;
  if (error?.code?.startsWith?.('PGRST') || error?.status === 400 || error?.status === 404) {
    return false;
  }
  return _failureCount < 2;
};

export const useLaunchPhaseMetrics = ({
  projectId,
  funnelId,
  startDate,
  endDate,
}: UseLaunchPhaseMetricsProps) => {
  // Fetch phases for this funnel
  const { data: phases = [], isLoading: loadingPhases } = useQuery({
    queryKey: ["launch-phases", projectId, funnelId],
    queryFn: async () => {
      if (!projectId || !funnelId) return [];
      const { data, error } = await supabase
        .from("launch_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order");
      if (error) throw error;
      return (data || []).filter((phase) => phase.funnel_id === funnelId);
    },
    enabled: !!projectId && !!funnelId,
    staleTime: 5 * 60 * 1000,
    retry: shouldRetryQuery,
  });

  // Fetch phase_campaigns (manual links)
  const { data: phaseCampaigns = [] } = useQuery({
    queryKey: ["phase-campaigns", projectId, funnelId],
    queryFn: async () => {
      if (!projectId || phases.length === 0) return [];
      const phaseIds = phases.map((p) => p.id);
      const { data, error } = await supabase
        .from("phase_campaigns")
        .select("*")
        .in("phase_id", phaseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && phases.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: shouldRetryQuery,
  });

  // Fetch all campaigns for pattern matching
  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["meta-campaigns", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("meta_campaigns")
        .select("campaign_id, campaign_name")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: shouldRetryQuery,
  });

  // Fetch Meta insights
  const { data: metaInsights = [], isLoading: loadingInsights } = useQuery({
    queryKey: [
      "meta-insights-phases",
      projectId,
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      if (!projectId) return [];
      const dateStart = format(startDate, "yyyy-MM-dd");
      const dateStop = format(endDate, "yyyy-MM-dd");

      let allInsights: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("meta_insights")
          .select("*")
          .eq("project_id", projectId)
          .gte("date_start", dateStart)
          .lte("date_start", dateStop)
          .not("campaign_id", "is", null)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allInsights = allInsights.concat(data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allInsights;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    retry: shouldRetryQuery,
  });

  // Calculate metrics per phase
  const phaseMetrics = useMemo<PhaseMetrics[]>(() => {
    if (phases.length === 0) return [];

    return phases.map((phase) => {
      // Get campaigns for this phase (pattern + manual)
      const campaignIdsFromPattern: string[] = [];
      if (phase.campaign_name_pattern?.trim()) {
        // Normalize to handle special characters like Ç, Ã, etc.
        const patternNormalized = phase.campaign_name_pattern
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        allCampaigns.forEach((c) => {
          const campaignNormalized = c.campaign_name
            ?.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          if (campaignNormalized?.includes(patternNormalized)) {
            campaignIdsFromPattern.push(c.campaign_id);
          }
        });
      }

      const manualCampaignIds = phaseCampaigns
        .filter((pc) => pc.phase_id === phase.id)
        .map((pc) => pc.campaign_id);

      const allCampaignIds = [
        ...new Set([...campaignIdsFromPattern, ...manualCampaignIds]),
      ];

      // Filter insights for these campaigns
      const phaseInsights = metaInsights.filter((i) =>
        allCampaignIds.includes(i.campaign_id)
      );

      // Aggregate metrics
      let spend = 0;
      let impressions = 0;
      let clicks = 0;
      let reach = 0;
      let leads = 0;
      let purchases = 0;
      let videoViews = 0;
      let linkClicks = 0;

      phaseInsights.forEach((insight) => {
        spend += insight.spend || 0;
        impressions += insight.impressions || 0;
        clicks += insight.clicks || 0;
        reach += insight.reach || 0;

        // Parse actions
        const actions = insight.actions || [];
        if (Array.isArray(actions)) {
          actions.forEach((action: { action_type: string; value: string }) => {
            const value = parseFloat(action.value) || 0;
            switch (action.action_type) {
              case "lead":
                leads += value;
                break;
              case "purchase":
              case "omni_purchase":
                purchases += value;
                break;
              case "video_view":
              case "video_view_p25":
              case "video_view_p50":
              case "video_view_p75":
              case "video_view_p95":
              case "video_view_p100":
                if (action.action_type === "video_view") videoViews += value;
                break;
              case "link_click":
                linkClicks += value;
                break;
            }
          });
        }
      });

      // Calculate derived metrics
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const frequency = reach > 0 ? impressions / reach : 0;
      const cpl = leads > 0 ? spend / leads : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        phaseType: phase.phase_type,
        phaseOrder: phase.phase_order,
        primaryMetric: phase.primary_metric,
        isActive: phase.is_active,
        startDate: phase.start_date,
        endDate: phase.end_date,
        campaignPattern: phase.campaign_name_pattern,
        spend,
        impressions,
        clicks,
        reach,
        frequency,
        ctr,
        cpc,
        cpm,
        leads,
        purchases,
        videoViews,
        linkClicks,
        cpl,
        cpa,
        campaignCount: allCampaignIds.length,
      };
    });
  }, [phases, phaseCampaigns, allCampaigns, metaInsights]);

  // Get total spend from all phases
  const totalPhaseSpend = useMemo(
    () => phaseMetrics.reduce((sum, p) => sum + p.spend, 0),
    [phaseMetrics]
  );

  return {
    phases,
    phaseMetrics,
    totalPhaseSpend,
    isLoading: loadingPhases || loadingInsights,
  };
};

// Helper to get display info for phase type
export const getPhaseTypeInfo = (phaseType: string) => {
  const typeInfo = PHASE_TYPES.find((t) => t.value === phaseType);
  return {
    label: typeInfo?.label || phaseType,
    metric: typeInfo?.metric || "spend",
    description: typeInfo?.description || "",
  };
};

// Helper to format the primary metric value
export const formatPrimaryMetricValue = (
  phaseType: string,
  metrics: PhaseMetrics
): { value: string; label: string } => {
  switch (phaseType) {
    case "distribuicao":
      return {
        value: new Intl.NumberFormat("pt-BR").format(metrics.reach),
        label: "Alcance",
      };
    case "captacao":
      return {
        value: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(metrics.cpl),
        label: "CPL",
      };
    case "aquecimento":
      return {
        value: new Intl.NumberFormat("pt-BR").format(metrics.videoViews),
        label: "Views",
      };
    case "lembrete":
      return {
        value: metrics.frequency.toFixed(2) + "x",
        label: "Frequência",
      };
    case "remarketing":
      return {
        value: new Intl.NumberFormat("pt-BR").format(metrics.videoViews),
        label: "Views",
      };
    case "vendas":
    case "ultima_oportunidade":
    case "flash_open":
    case "downsell":
      return {
        value: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(metrics.cpa),
        label: "CPA",
      };
    default:
      return {
        value: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(metrics.spend),
        label: "Investimento",
      };
  }
};