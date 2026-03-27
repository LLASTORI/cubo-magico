import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { LaunchEdition } from '@/types/launch-editions';

interface LaunchPagoConversaoBlockProps {
  projectId: string;
  funnelId: string;
  edition: LaunchEdition;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const formatPercent = (v: number) => `${v.toFixed(1)}%`;

// ──────────────────────────────────────────────────────────────────────────────
// Data hooks
// ──────────────────────────────────────────────────────────────────────────────

/** Extract YYYY-MM-DD from an ISO datetime string */
function toDateStr(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function useConversaoData(projectId: string, funnelId: string, edition: LaunchEdition) {
  const startDate = toDateStr(edition.start_datetime);
  const endDate = toDateStr(edition.end_datetime);
  const eventDate = toDateStr(edition.event_datetime);

  // Phases for this edition (by phase_type)
  const { data: phases = [], isLoading: phasesLoading } = useQuery({
    queryKey: ['pago-phases-conv', funnelId, edition.id],
    queryFn: async () => {
      let q = supabase
        .from('launch_phases')
        .select('id, phase_order, phase_type')
        .eq('funnel_id', funnelId)
        .order('phase_order');
      if (edition.id) q = q.eq('edition_id', edition.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!funnelId,
    staleTime: 5 * 60 * 1000,
  });

  // Offer mappings with phase_id
  const { data: offerMappings = [] } = useQuery({
    queryKey: ['offer-mappings-conv', funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id, codigo_oferta, phase_id')
        .eq('funnel_id', funnelId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!funnelId,
    staleTime: 5 * 60 * 1000,
  });

  const INGRESSO_TYPES = ['captacao_ingresso', 'captacao'];
  const PRODUTO_TYPES = ['vendas', 'pitch', 'single_shot'];

  const phaseIngresso = phases.find(p => INGRESSO_TYPES.includes(p.phase_type));
  const phaseProduto = phases.find(p => PRODUTO_TYPES.includes(p.phase_type));

  const ingressoOfferCodes = useMemo(
    () => phaseIngresso
      ? offerMappings.filter(m => m.phase_id === phaseIngresso.id).map(m => m.codigo_oferta).filter(Boolean)
      : [],
    [phaseIngresso, offerMappings],
  );
  const produtoOfferCodes = useMemo(
    () => phaseProduto
      ? offerMappings.filter(m => m.phase_id === phaseProduto.id).map(m => m.codigo_oferta).filter(Boolean)
      : [],
    [phaseProduto, offerMappings],
  );

  const hasProdutoPhase = !!phaseProduto;

  const useMainFallbackIngresso = ingressoOfferCodes.length === 0;
  const useMainFallbackProduto  = produtoOfferCodes.length === 0;

  // Compradores de ingresso
  // With mapping: offer codes from Fase 1, full edition period
  // Fallback: main_offer_code IS NOT NULL, start_datetime → event_datetime
  const fase1End = eventDate || endDate;
  const fase4Start = eventDate || startDate;

  const { data: ingressoOrders = [], isLoading: ingressoLoading } = useQuery({
    queryKey: ['pago-ingressos', projectId, funnelId, edition.id],
    queryFn: async () => {
      let q = supabase
        .from('funnel_orders_view')
        .select('order_id, customer_paid')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId);
      if (startDate) q = q.gte('economic_day', startDate);
      if (useMainFallbackIngresso) {
        if (fase1End) q = q.lte('economic_day', fase1End);
        q = q.not('main_offer_code', 'is', null);
      } else {
        if (endDate) q = q.lte('economic_day', endDate);
        q = q.in('main_offer_code', ingressoOfferCodes as string[]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!funnelId && !!startDate && !phasesLoading,
    staleTime: 2 * 60 * 1000,
  });

  // Compradores do produto principal
  const { data: produtoOrders = [], isLoading: produtoLoading } = useQuery({
    queryKey: ['pago-produto', projectId, funnelId, edition.id],
    queryFn: async () => {
      let q = supabase
        .from('funnel_orders_view')
        .select('order_id, customer_paid')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId);
      if (useMainFallbackProduto) {
        if (fase4Start) q = q.gte('economic_day', fase4Start);
        if (endDate) q = q.lte('economic_day', endDate);
        q = q.not('main_offer_code', 'is', null);
      } else {
        if (startDate) q = q.gte('economic_day', startDate);
        if (endDate) q = q.lte('economic_day', endDate);
        q = q.in('main_offer_code', produtoOfferCodes as string[]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!funnelId && !!startDate && !phasesLoading,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = phasesLoading || ingressoLoading || produtoLoading;

  const compradores = ingressoOrders.length;
  const compradoresProduto = produtoOrders.length;
  const receitaProduto = produtoOrders.reduce((sum, o) => sum + (Number(o.customer_paid) || 0), 0);
  const txConversao = compradores > 0 ? (compradoresProduto / compradores) * 100 : 0;
  const ticketMedio = compradoresProduto > 0 ? receitaProduto / compradoresProduto : 0;

  return { compradores, compradoresProduto, txConversao, receitaProduto, ticketMedio, isLoading, hasProdutoPhase };
}

// UTM data for orders in the edition period (for produto principal)
function useUTMData(projectId: string, funnelId: string, edition: LaunchEdition) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pago-utm', projectId, funnelId, edition.id],
    queryFn: async () => {
      let q = supabase
        .from('funnel_orders_view')
        .select('order_id, customer_paid, utm_campaign, utm_source, utm_medium, utm_content, utm_adset')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId)
        .not('main_offer_code', 'is', null);
      const sd = toDateStr(edition.start_datetime);
      const ed = toDateStr(edition.end_datetime);
      if (sd) q = q.gte('economic_day', sd);
      if (ed) q = q.lte('economic_day', ed);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!funnelId && !!edition.start_datetime,
    staleTime: 2 * 60 * 1000,
  });

  const groupBy = (field: keyof typeof orders[0]) => {
    const map: Record<string, { value: string; count: number; revenue: number }> = {};
    for (const o of orders) {
      const key = (o[field] as string) || '(sem dados)';
      if (!map[key]) map[key] = { value: key, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += Number(o.customer_paid) || 0;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  };

  return {
    isLoading,
    campaigns: groupBy('utm_campaign'),
    adsets: groupBy('utm_adset'),
    sources: groupBy('utm_source'),
    contents: groupBy('utm_content'),
    mediums: groupBy('utm_medium'),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function UTMTable({ rows, label }: { rows: { value: string; count: number; revenue: number }[]; label: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sem dados de {label.toLowerCase()}.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{label}</TableHead>
          <TableHead className="text-right">Vendas</TableHead>
          <TableHead className="text-right">Receita</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(r => (
          <TableRow key={r.value}>
            <TableCell className="font-mono text-xs max-w-xs truncate">{r.value}</TableCell>
            <TableCell className="text-right">{r.count}</TableCell>
            <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export function LaunchPagoConversaoBlock({
  projectId,
  funnelId,
  edition,
}: LaunchPagoConversaoBlockProps) {
  const {
    compradores,
    compradoresProduto,
    txConversao,
    receitaProduto,
    ticketMedio,
    isLoading,
    hasProdutoPhase,
  } = useConversaoData(projectId, funnelId, edition);

  const utm = useUTMData(projectId, funnelId, edition);

  const noProduto = !hasProdutoPhase || (compradoresProduto === 0 && !isLoading);
  const rows = [
    { label: 'Compradores de ingresso', value: isLoading ? null : compradores },
    { label: 'Compradores do produto principal', value: isLoading ? null : (noProduto && !hasProdutoPhase ? '—' : compradoresProduto) },
    { label: 'TX ingresso→produto', value: isLoading ? null : (noProduto && !hasProdutoPhase ? '—' : formatPercent(txConversao)), isPercent: true },
    { label: 'Receita produto principal', value: isLoading ? null : (noProduto && !hasProdutoPhase ? '—' : formatCurrency(receitaProduto)), isCurrency: true },
    { label: 'Ticket médio', value: isLoading ? null : (noProduto && !hasProdutoPhase ? '—' : formatCurrency(ticketMedio)), isCurrency: true },
  ];

  return (
    <Card className="p-4 space-y-4">
      <h2 className="font-semibold">Funil de Conversão</h2>

      {/* Metrics table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Métrica</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {row.value === null ? (
                  <Skeleton className="h-4 w-16 ml-auto" />
                ) : (
                  String(row.value)
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!isLoading && !hasProdutoPhase && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
          Esta edição não possui fase de Vendas configurada. Métricas de produto principal ficam indisponíveis até que uma fase do tipo "Vendas" seja criada e tenha ofertas vinculadas.
        </p>
      )}

      {/* UTM tabs */}
      <Tabs defaultValue="fontes" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fontes">Fontes</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="conjuntos">Conjuntos</TabsTrigger>
          <TabsTrigger value="conteudos">Criativos</TabsTrigger>
          <TabsTrigger value="midias">Mídias</TabsTrigger>
        </TabsList>
        <TabsContent value="fontes">
          {utm.isLoading ? <Skeleton className="h-32 w-full mt-2" /> : <UTMTable rows={utm.sources} label="Fonte" />}
        </TabsContent>
        <TabsContent value="campanhas">
          {utm.isLoading ? <Skeleton className="h-32 w-full mt-2" /> : <UTMTable rows={utm.campaigns} label="Campanha" />}
        </TabsContent>
        <TabsContent value="conjuntos">
          {utm.isLoading ? <Skeleton className="h-32 w-full mt-2" /> : <UTMTable rows={utm.adsets} label="Conjunto" />}
        </TabsContent>
        <TabsContent value="conteudos">
          {utm.isLoading ? <Skeleton className="h-32 w-full mt-2" /> : <UTMTable rows={utm.contents} label="Conteúdo" />}
        </TabsContent>
        <TabsContent value="midias">
          {utm.isLoading ? <Skeleton className="h-32 w-full mt-2" /> : <UTMTable rows={utm.mediums} label="Mídia" />}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
