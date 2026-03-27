import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEditions } from '@/hooks/useLaunchEditions';
import { LaunchEdition } from '@/types/launch-editions';

export interface EditionComparativoRow {
  edition: LaunchEdition;
  totalIngressos: number;
  faturamentoTotal: number;
  totalSpend: number;
  roas: number;
  isLoading: boolean;
}

async function fetchEditionKPIs(
  projectId: string,
  funnelId: string,
  edition: LaunchEdition,
) {
  const startDay = edition.start_datetime?.slice(0, 10) ?? null;
  const endDay = edition.end_datetime?.slice(0, 10) ?? null;
  const eventDay = edition.event_datetime?.slice(0, 10) ?? null;

  // Faturamento total no período da edição
  let revQ = supabase
    .from('funnel_orders_view')
    .select('customer_paid')
    .eq('project_id', projectId)
    .eq('funnel_id', funnelId);
  if (startDay) revQ = revQ.gte('economic_day', startDay);
  if (endDay) revQ = revQ.lte('economic_day', endDay);
  const { data: revRows } = await revQ;
  const faturamentoTotal = (revRows || []).reduce(
    (s, r) => s + (Number(r.customer_paid) || 0), 0
  );

  // Ingressos (FRONT) start_datetime → event_datetime
  const fase1End = eventDay || endDay;
  let ingQ = supabase
    .from('funnel_orders_view')
    .select('order_id')
    .eq('project_id', projectId)
    .eq('funnel_id', funnelId)
    .not('main_offer_code', 'is', null);
  if (startDay) ingQ = ingQ.gte('economic_day', startDay);
  if (fase1End) ingQ = ingQ.lte('economic_day', fase1End);
  const { data: ingRows } = await ingQ;
  const totalIngressos = ingRows?.length || 0;

  // Investimento Meta
  let spendQ = supabase
    .from('meta_insights')
    .select('spend')
    .eq('project_id', projectId);
  if (startDay) spendQ = spendQ.gte('date_start', startDay);
  if (endDay) spendQ = spendQ.lte('date_start', endDay);
  const { data: spendRows } = await spendQ;
  const totalSpend = (spendRows || []).reduce(
    (s, r) => s + (parseFloat(String(r.spend)) || 0), 0
  );

  const roas = totalSpend > 0 ? faturamentoTotal / totalSpend : 0;
  return { totalIngressos, faturamentoTotal, totalSpend, roas };
}

export function useEditionsComparativo(
  projectId: string,
  funnelId: string,
): { rows: EditionComparativoRow[]; isLoading: boolean } {
  const { editions, isLoading: editionsLoading } = useEditions(projectId, funnelId);

  const results = useQueries({
    queries: editions.map((edition) => ({
      queryKey: ['edition-kpis', projectId, funnelId, edition.id],
      queryFn: () => fetchEditionKPIs(projectId, funnelId, edition),
      enabled: !!projectId && !!funnelId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rows: EditionComparativoRow[] = editions.map((edition, i) => ({
    edition,
    totalIngressos: results[i]?.data?.totalIngressos ?? 0,
    faturamentoTotal: results[i]?.data?.faturamentoTotal ?? 0,
    totalSpend: results[i]?.data?.totalSpend ?? 0,
    roas: results[i]?.data?.roas ?? 0,
    isLoading: results[i]?.isLoading ?? true,
  }));

  const isLoading = editionsLoading || results.some((r) => r.isLoading);

  return { rows, isLoading };
}
