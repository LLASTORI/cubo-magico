import { useQuery } from '@tanstack/react-query';
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

export function useLaunchEditionData(
  projectId: string,
  funnelId: string,
  edition: LaunchEdition | null | undefined,
) {
  const enabled = !!edition && !!projectId && !!funnelId;

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['edition-kpis', projectId, funnelId, edition?.id],
    enabled,
    queryFn: async (): Promise<EditionKPIs> => {
      const startDate = edition!.start_date;
      const endDate = edition!.end_date;

      // Faturamento total via funnel_orders_view (customer_paid é a coluna canônica)
      let revenueQuery = supabase
        .from('funnel_orders_view')
        .select('customer_paid')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId);

      if (startDate) revenueQuery = revenueQuery.gte('economic_day', startDate);
      if (endDate) revenueQuery = revenueQuery.lte('economic_day', endDate);

      const { data: orders } = await revenueQuery;
      const faturamentoTotal = (orders || []).reduce(
        (sum, o) => sum + (Number(o.customer_paid) || 0), 0
      );

      // Ingressos (FRONT) na fase 1 — start_date → event_date
      // main_offer_code não-nulo = pedido com item 'main'
      const fase1End = edition!.event_date || endDate;
      let ingressosQuery = supabase
        .from('funnel_orders_view')
        .select('order_id')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId)
        .not('main_offer_code', 'is', null);

      if (startDate) ingressosQuery = ingressosQuery.gte('economic_day', startDate);
      if (fase1End) ingressosQuery = ingressosQuery.lte('economic_day', fase1End);

      const { data: ingressosRows } = await ingressosQuery;
      const totalIngressos = ingressosRows?.length || 0;

      // Investimento Meta no período
      let spendQuery = supabase
        .from('meta_insights')
        .select('spend')
        .eq('project_id', projectId);

      if (startDate) spendQuery = spendQuery.gte('date_start', startDate);
      if (endDate) spendQuery = spendQuery.lte('date_start', endDate);

      const { data: spendRows } = await spendQuery;
      const totalSpend = (spendRows || []).reduce(
        (sum, r) => sum + (parseFloat(String(r.spend)) || 0), 0
      );

      const roas = totalSpend > 0 ? faturamentoTotal / totalSpend : 0;

      return { totalIngressos, faturamentoTotal, totalSpend, roas };
    },
  });

  // Passing diário — agrupa por economic_day na fase 1 (start_date → event_date)
  const { data: passingDiario, isLoading: passingLoading } = useQuery({
    queryKey: ['edition-passing', projectId, funnelId, edition?.id],
    enabled,
    queryFn: async (): Promise<PassingDiarioItem[]> => {
      const startDate = edition!.start_date;
      const endDate = edition!.event_date || edition!.end_date;
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
      const cur = new Date(startDate);
      const end = new Date(endDate);
      let totalDias = 0;
      const tempCur = new Date(startDate);
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
