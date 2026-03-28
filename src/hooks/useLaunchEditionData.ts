import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { LaunchEdition } from '@/types/launch-editions';

export interface EditionKPIs {
  totalIngressos: number;
  faturamentoTotal: number;
  totalSpend: number;
  roas: number;
}

export interface PassingDiarioItem {
  date: string;
  ingressos: number;
  meta: number;
  status: 'above' | 'near' | 'below';
}

/** Extract YYYY-MM-DD from an ISO datetime string */
function toDateStr(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export function useLaunchEditionData(
  projectId: string,
  funnelId: string,
  edition: LaunchEdition | null | undefined,
  campaignIds?: string[],
) {
  const enabled = !!edition && !!projectId && !!funnelId;

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: [
      'edition-kpis', projectId, funnelId,
      edition?.id, edition?.start_datetime,
      edition?.end_datetime, campaignIds,
    ],
    enabled,
    queryFn: async (): Promise<EditionKPIs> => {
      const startDate = toDateStr(edition!.start_datetime);
      const endDate = toDateStr(edition!.end_datetime);

      // Faturamento total via funnel_orders_view
      let revenueQuery = supabase
        .from('funnel_orders_view')
        .select('customer_paid')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId);

      if (startDate) {
        revenueQuery = revenueQuery.gte(
          'economic_day', startDate,
        );
      }
      if (endDate) {
        revenueQuery = revenueQuery.lte(
          'economic_day', endDate,
        );
      }

      const { data: orders } = await revenueQuery;
      const faturamentoTotal = (orders || []).reduce(
        (sum, o) => sum + (Number(o.customer_paid) || 0),
        0,
      );

      // Ingressos (FRONT) — start → event_datetime
      const fase1End =
        toDateStr(edition!.event_datetime) || endDate;
      let ingressosQuery = supabase
        .from('funnel_orders_view')
        .select('order_id')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId)
        .not('main_offer_code', 'is', null);

      if (startDate) {
        ingressosQuery = ingressosQuery.gte(
          'economic_day', startDate,
        );
      }
      if (fase1End) {
        ingressosQuery = ingressosQuery.lte(
          'economic_day', fase1End,
        );
      }

      const { data: ingressosRows } = await ingressosQuery;
      const totalIngressos = ingressosRows?.length || 0;

      // Investimento Meta — filtrado por campaign_ids da edição
      let totalSpend = 0;
      if (campaignIds && campaignIds.length > 0) {
        let spendQuery = supabase
          .from('meta_insights')
          .select('spend')
          .eq('project_id', projectId)
          .in('campaign_id', campaignIds);
        if (startDate) {
          spendQuery = spendQuery.gte(
            'date_start', startDate,
          );
        }
        if (endDate) {
          spendQuery = spendQuery.lte(
            'date_start', endDate,
          );
        }
        const { data: spendRows } = await spendQuery;
        totalSpend = (spendRows || []).reduce(
          (sum, r) =>
            sum + (parseFloat(String(r.spend)) || 0),
          0,
        );
      }

      const roas = totalSpend > 0
        ? faturamentoTotal / totalSpend : 0;

      return {
        totalIngressos, faturamentoTotal,
        totalSpend, roas,
      };
    },
  });

  // Passing diário — agrupa por economic_day na fase 1 (start_datetime → event_datetime)
  const { data: passingDiario, isLoading: passingLoading } = useQuery({
    queryKey: ['edition-passing', projectId, funnelId, edition?.id, edition?.start_datetime, edition?.end_datetime],
    enabled,
    queryFn: async (): Promise<PassingDiarioItem[]> => {
      const startDate = toDateStr(edition!.start_datetime);
      const endDate = toDateStr(edition!.event_datetime) || toDateStr(edition!.end_datetime);
      if (!startDate || !endDate) return [];

      const { data: orders } = await supabase
        .from('funnel_orders_view')
        .select('economic_day')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId)
        .not('main_offer_code', 'is', null)
        .gte('economic_day', startDate)
        .lte('economic_day', endDate)
        .order('economic_day');

      if (!orders?.length) return [];

      // Agrupa por dia
      const byDay: Record<string, number> = {};
      for (const o of orders) {
        const day = String(o.economic_day);
        byDay[day] = (byDay[day] || 0) + 1;
      }

      const totalIngressos = orders.length;
      const cur = parseISO(startDate);
      const end = parseISO(endDate);
      let totalDias = 0;
      const tempCur = parseISO(startDate);
      while (tempCur <= end) { totalDias++; tempCur.setDate(tempCur.getDate() + 1); }
      const metaDiaria = totalDias > 0 ? totalIngressos / totalDias : 0;

      const result: PassingDiarioItem[] = [];
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
    },
  });

  return {
    kpis,
    kpisLoading,
    passingDiario: passingDiario || [],
    passingLoading,
  };
}
