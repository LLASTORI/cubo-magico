# Onda 2A — Lançamento Pago: Fases Automáticas + Tela de Análise de Edição

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar fases automáticas ao criar edição, identificação visual de lançamentos pagos no dashboard, e tela de análise detalhada por edição com KPIs, passing diário e funil de conversão.

**Architecture:** Reaproveita componentes existentes (`LaunchProductsSalesBreakdown`, `LaunchConversionAnalysis`). Nova rota `/app/:projectCode/lancamentos/:funnelId/edicoes/:editionId`. Hook `useLaunchEditionData` encapsula toda lógica de queries da tela de edição. `LaunchDashboard` ganha branch condicional para `funnel_model === 'lancamento_pago'`.

**Tech Stack:** React 18, TypeScript strict, TanStack React Query 5, Recharts (já usado no projeto), Supabase, shadcn-ui, Tailwind, `useTenantNavigation` para rotas multi-tenant.

---

## Mapa de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modify | `src/hooks/useLaunchEditions.ts` | Criar 4 fases padrão na 1ª edição do funil |
| Modify | `src/pages/LaunchDashboard.tsx` | Badge diferenciado + edições colapsáveis para `lancamento_pago` |
| Modify | `src/App.tsx` | Adicionar rota `lancamentos/:funnelId/edicoes/:editionId` |
| Create | `src/hooks/useLaunchEditionData.ts` | KPIs, passing diário, fases e funil da edição |
| Create | `src/components/launch/PassingDiarioChart.tsx` | Gráfico barras coloridas + linha meta |
| Create | `src/pages/LaunchEditionAnalysis.tsx` | Tela completa de análise da edição |

---

## Task 1: Fases Automáticas na Primeira Edição

**Files:**
- Modify: `src/hooks/useLaunchEditions.ts`

**Contexto:** `createEdition` já copia fases da edição anterior se existir. Quando for a primeira edição (`editions.length === 0`), deve criar 4 fases padrão via `launch_phases` com `edition_id` setado.

As fases padrão e datas automáticas (todas nullable se `event_date` ou `start_date` forem null):
- Fase 1 Ingressos: `start_date = edition.start_date`, `end_date = event_date - 1 dia`
- Fase 2 Comparecimento: `start_date = event_date - 7 dias`, `end_date = event_date`
- Fase 3 Evento: `start_date = event_date`, `end_date = event_date + 1 dia`
- Fase 4 Vendas: `start_date = event_date + 1 dia`, `end_date = edition.end_date`

- [ ] **Ler o arquivo atual**
  ```
  Ler: src/hooks/useLaunchEditions.ts
  ```

- [ ] **Adicionar constante FASES_LANCAMENTO_PAGO e função helper de datas**

  Adicionar logo após os imports em `useLaunchEditions.ts`:

  ```typescript
  const FASES_LANCAMENTO_PAGO = [
    {
      phase_type: 'captacao',
      name: 'Ingressos',
      primary_metric: 'cpa',
      phase_order: 1,
      notes: 'Venda de ingressos por lotes. Acompanhar passing diário vs meta.',
    },
    {
      phase_type: 'aquecimento',
      name: 'Comparecimento',
      primary_metric: 'show_rate',
      phase_order: 2,
      notes: 'Garantir presença no evento. Meta: 70%+ de show rate.',
    },
    {
      phase_type: 'vendas',
      name: 'Evento',
      primary_metric: 'conversao',
      phase_order: 3,
      notes: 'Evento ao vivo com pitch. Dias 1 e 2.',
    },
    {
      phase_type: 'vendas',
      name: 'Vendas',
      primary_metric: 'roas',
      phase_order: 4,
      notes: 'Carrinho aberto pós-evento. OBs, upsell, downsell.',
    },
  ] as const;

  function calcPhaseDate(base: string | null, offsetDays: number): string | null {
    if (!base) return null;
    const d = new Date(base);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }
  ```

- [ ] **Modificar a mutationFn do `createEdition`**

  Localizar o bloco `createEdition` em `useLaunchEditions.ts`. Após o insert da edição (obtendo `newEdition`), adicionar:

  ```typescript
  // Se primeira edição do funil → criar fases padrão de lançamento pago
  if (editions.length === 0) {
    const { event_date, start_date, end_date } = data as any;
    const phaseDates = [
      {
        start_date: start_date ?? null,
        end_date: calcPhaseDate(event_date, -1),
      },
      {
        start_date: calcPhaseDate(event_date, -7),
        end_date: event_date ?? null,
      },
      {
        start_date: event_date ?? null,
        end_date: calcPhaseDate(event_date, 1),
      },
      {
        start_date: calcPhaseDate(event_date, 1),
        end_date: end_date ?? null,
      },
    ];

    const phasesToInsert = FASES_LANCAMENTO_PAGO.map((fase, i) => ({
      ...fase,
      funnel_id: funnelId,
      project_id: projectId,
      edition_id: newEdition.id,
      is_active: true,
      campaign_name_pattern: null,
      ...phaseDates[i],
    }));

    const { error: phasesError } = await supabase
      .from('launch_phases')
      .insert(phasesToInsert);

    if (phasesError) {
      console.error('[useLaunchEditions] Erro ao criar fases padrão:', phasesError);
    }
  }
  ```

  **Atenção:** o `data` passado ao `createEdition` inclui `event_date`, `start_date`, `end_date`. Verificar que o insert da edição retorna `newEdition` com `.select().single()`.

- [ ] **Verificar build**
  ```bash
  npm run build
  ```
  Esperado: zero erros TypeScript.

- [ ] **Commit**
  ```bash
  git add src/hooks/useLaunchEditions.ts
  git commit -m "feat: criar 4 fases padrão ao criar primeira edição de lançamento pago"
  ```

---

## Task 2: Badge + Edições Colapsáveis no LaunchDashboard

**Files:**
- Modify: `src/pages/LaunchDashboard.tsx`

**Contexto:** `LaunchDashboard` renderiza uma lista de funis. Cada funil é uma linha expandível. Para `funnel_model === 'lancamento_pago'`, ao expandir deve mostrar edições (do hook `useEditions`) em vez das fases diretamente. Lançamentos clássicos não mudam.

A query de funis já retorna `funnel_model` (verificar — se não retornar, adicionar ao select). O hook `useEditions(projectId, funnelId)` já existe em `useLaunchEditions.ts`.

- [ ] **Ler o arquivo**
  ```
  Ler: src/pages/LaunchDashboard.tsx
  ```

- [ ] **Verificar se `funnel_model` está no select da query de funis**

  Localizar a query `supabase.from('funnels').select(...)`. Se não inclui `funnel_model`, adicionar.

- [ ] **Criar subcomponente `LaunchPagoEditionsRow`**

  Adicionar ao **final** de `LaunchDashboard.tsx` (antes do export), ou criar arquivo separado se o arquivo já for grande (> 400 linhas):

  ```typescript
  function LaunchPagoEditionsRow({ funnelId, projectId }: { funnelId: string; projectId: string }) {
    const { editions } = useEditions(projectId, funnelId);
    const { navigate } = useTenantNavigation();

    if (!editions.length) {
      return (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma edição cadastrada. Configure em{' '}
          <span className="font-medium">Configurar → Edições</span>.
        </div>
      );
    }

    return (
      <div className="space-y-2 py-2">
        {editions.map((edition) => (
          <button
            key={edition.id}
            onClick={() => navigate(`lancamentos/${funnelId}/edicoes/${edition.id}`)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{edition.name}</span>
              <EditionStatusBadge status={edition.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {edition.event_date && (
                <span>Evento: {format(new Date(edition.event_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
              )}
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  function EditionStatusBadge({ status }: { status: string }) {
    const map = {
      planned: { label: 'Planejada', className: 'bg-slate-100 text-slate-700' },
      active: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
      finished: { label: 'Encerrada', className: 'bg-amber-100 text-amber-700' },
    } as const;
    const s = map[status as keyof typeof map] ?? map.planned;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
        {s.label}
      </span>
    );
  }
  ```

  Imports necessários: `useEditions` de `useLaunchEditions`, `useTenantNavigation`, `format` de `date-fns`, `ptBR`, `ChevronRight` de `lucide-react`.

- [ ] **Modificar o badge de tipo na listagem**

  Localizar onde o badge "Lançamento" é exibido (provavelmente com texto fixo ou baseado em `funnel_model`). Adicionar branch para `lancamento_pago`:

  ```typescript
  {funnel.funnel_model === 'lancamento_pago' ? (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
      Lançamento Pago
    </Badge>
  ) : (
    <Badge variant="secondary">Lançamento</Badge>
  )}
  ```

- [ ] **Substituir conteúdo expandido para `lancamento_pago`**

  Localizar o bloco que renderiza o conteúdo ao expandir um funil (provavelmente um `{isExpanded && (...)}` ou similar). Adicionar branch:

  ```typescript
  {isExpanded && (
    funnel.funnel_model === 'lancamento_pago'
      ? <LaunchPagoEditionsRow funnelId={funnel.id} projectId={projectId} />
      : (
        <>
          {/* conteúdo existente — LaunchPhasesOverview, LaunchProductsSalesBreakdown, etc. */}
        </>
      )
  )}
  ```

- [ ] **Verificar build**
  ```bash
  npm run build
  ```

- [ ] **Commit**
  ```bash
  git add src/pages/LaunchDashboard.tsx
  git commit -m "feat: badge lancamento pago + edições colapsáveis no dashboard"
  ```

---

## Task 3: Hook `useLaunchEditionData`

**Files:**
- Create: `src/hooks/useLaunchEditionData.ts`

**Responsabilidade:** Encapsula todas as queries da tela de análise de edição — KPIs resumo, dados de passing diário, fases da edição. Usa `funnel_orders_view` como fonte canônica.

- [ ] **Criar o arquivo**

  ```typescript
  // src/hooks/useLaunchEditionData.ts
  import { useQuery } from '@tanstack/react-query';
  import { supabase } from '@/integrations/supabase/client';
  import { LaunchEdition } from '@/types/launch-editions';

  export interface EditionKPIs {
    totalIngressos: number;        // orders FRONT fase 1
    faturamentoTotal: number;      // soma customer_paid no período
    totalSpend: number;            // investimento Meta no período
    roas: number;                  // faturamentoTotal / totalSpend
    // show rate fica N/A por enquanto
  }

  export interface PassingDiarioItem {
    date: string;                  // YYYY-MM-DD
    ingressos: number;             // vendas do dia
    meta: number;                  // meta diária calculada
    status: 'above' | 'near' | 'below'; // ≥meta, 70-99%, <70%
  }

  export function useLaunchEditionData(
    projectId: string,
    funnelId: string,
    edition: LaunchEdition | undefined,
  ) {
    const enabled = !!edition && !!projectId && !!funnelId;

    // KPIs: faturamento total da edição
    const { data: kpis, isLoading: kpisLoading } = useQuery({
      queryKey: ['edition-kpis', projectId, funnelId, edition?.id],
      enabled,
      queryFn: async (): Promise<EditionKPIs> => {
        const startDate = edition!.start_date;
        const endDate = edition!.end_date;

        // Faturamento total da edição via funnel_orders_view
        let revenueQuery = supabase
          .from('funnel_orders_view')
          .select('gross_amount')
          .eq('project_id', projectId)
          .eq('funnel_id', funnelId);

        if (startDate) revenueQuery = revenueQuery.gte('economic_day', startDate);
        if (endDate) revenueQuery = revenueQuery.lte('economic_day', endDate);

        const { data: orders } = await revenueQuery;
        const faturamentoTotal = (orders || []).reduce(
          (sum, o) => sum + (o.gross_amount || 0), 0
        );

        // Ingressos (FRONT) na fase 1 — período start_date → event_date
        const fase1End = edition!.event_date || endDate;
        let ingressosQuery = supabase
          .from('funnel_orders_view')
          .select('gross_amount, main_offer_code')
          .eq('project_id', projectId)
          .eq('funnel_id', funnelId)
          .eq('main_item_type', 'main');

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
          (sum, r) => sum + (parseFloat(r.spend) || 0), 0
        );

        const roas = totalSpend > 0 ? faturamentoTotal / totalSpend : 0;

        return { totalIngressos, faturamentoTotal, totalSpend, roas };
      },
    });

    // Passing diário — agrupa funnel_orders_view por economic_day na fase 1
    const { data: passingDiario, isLoading: passingLoading } = useQuery({
      queryKey: ['edition-passing', projectId, funnelId, edition?.id],
      enabled,
      queryFn: async (): Promise<PassingDiarioItem[]> => {
        const startDate = edition!.start_date;
        const endDate = edition!.event_date || edition!.end_date;
        if (!startDate || !endDate) return [];

        const { data: orders } = await supabase
          .from('funnel_orders_view')
          .select('economic_day, gross_amount')
          .eq('project_id', projectId)
          .eq('funnel_id', funnelId)
          .eq('main_item_type', 'main')
          .gte('economic_day', startDate)
          .lte('economic_day', endDate)
          .order('economic_day');

        if (!orders?.length) return [];

        // Agrupa por dia
        const byDay: Record<string, number> = {};
        for (const o of orders) {
          const day = o.economic_day;
          byDay[day] = (byDay[day] || 0) + 1;
        }

        const totalDias = Object.keys(byDay).length || 1;
        const totalIngressos = orders.length;
        const metaDiaria = totalIngressos / totalDias;

        // Gera todos os dias no range
        const result: PassingDiarioItem[] = [];
        const cur = new Date(startDate);
        const end = new Date(endDate);
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
  ```

  **Nota:** `funnel_orders_view` pode não ter `main_item_type` diretamente — verificar as colunas disponíveis. Se não tiver, usar `main_offer_code` e fazer join com `launch_products` para identificar ingressos. Para MVP, contar todas as vendas FRONT no período é aceitável — adaptar conforme necessário.

- [ ] **Verificar build**
  ```bash
  npm run build
  ```

- [ ] **Commit**
  ```bash
  git add src/hooks/useLaunchEditionData.ts
  git commit -m "feat: hook useLaunchEditionData para KPIs e passing diário da edição"
  ```

---

## Task 4: Componente `PassingDiarioChart`

**Files:**
- Create: `src/components/launch/PassingDiarioChart.tsx`

**Responsabilidade:** Gráfico de barras com linha de meta. Barras coloridas (verde/âmbar/vermelho). Usa Recharts (já instalado — verificar com `import { BarChart } from 'recharts'`).

- [ ] **Criar o componente**

  ```typescript
  // src/components/launch/PassingDiarioChart.tsx
  import { useMemo } from 'react';
  import {
    BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Cell, ComposedChart,
  } from 'recharts';
  import { format, parseISO } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { PassingDiarioItem } from '@/hooks/useLaunchEditionData';

  interface Props {
    data: PassingDiarioItem[];
  }

  const STATUS_COLORS = {
    above: '#22c55e',  // green-500
    near: '#f59e0b',   // amber-500
    below: '#ef4444',  // red-500
  } as const;

  export function PassingDiarioChart({ data }: Props) {
    const totalIngressos = data.reduce((s, d) => s + d.ingressos, 0);
    const metaTotal = data.length > 0 ? data[0].meta * data.length : 0;
    const pctAtingido = metaTotal > 0 ? (totalIngressos / metaTotal) * 100 : 0;
    const mediaReal = data.length > 0 ? totalIngressos / data.length : 0;
    const hoje = new Date().toISOString().split('T')[0];
    const diasRestantes = data.filter(d => d.date > hoje).length;

    const chartData = useMemo(
      () => data.map(d => ({ ...d, label: format(parseISO(d.date), 'dd/MM', { locale: ptBR }) })),
      [data]
    );

    if (!data.length) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados de vendas para o período de ingressos.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number, name: string) =>
                [value, name === 'ingressos' ? 'Ingressos' : 'Meta diária']
              }
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Bar dataKey="ingressos" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="meta"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="Meta diária"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Linha de totais */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-sm">
          <Stat label="Ingressos" value={totalIngressos} />
          <Stat label="Meta total" value={metaTotal} />
          <Stat label="% Atingido" value={`${pctAtingido.toFixed(0)}%`} />
          <Stat label="Média/dia" value={mediaReal.toFixed(1)} />
          <Stat label="Dias restantes" value={diasRestantes} />
        </div>
      </div>
    );
  }

  function Stat({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="rounded-lg border bg-card p-2 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold tabular-nums">{value}</p>
      </div>
    );
  }
  ```

- [ ] **Verificar build**
  ```bash
  npm run build
  ```

- [ ] **Commit**
  ```bash
  git add src/components/launch/PassingDiarioChart.tsx
  git commit -m "feat: componente PassingDiarioChart com barras coloridas e linha de meta"
  ```

---

## Task 5: Tela `LaunchEditionAnalysis`

**Files:**
- Create: `src/pages/LaunchEditionAnalysis.tsx`

**Responsabilidade:** Tela completa de análise de uma edição. Usa `useEdition(editionId)` para dados da edição, `useLaunchEditionData` para KPIs e passing, reutiliza `LaunchProductsSalesBreakdown` e `LaunchConversionAnalysis` existentes.

**Parâmetros de rota:** `:funnelId` e `:editionId` via `useParams`.

- [ ] **Verificar assinatura de `LaunchProductsSalesBreakdown` e `LaunchConversionAnalysis`**

  Ler rapidamente:
  - `src/components/launch/LaunchProductsSalesBreakdown.tsx`
  - `src/components/launch/LaunchConversionAnalysis.tsx`

  Entender quais props são necessárias (provavelmente `funnelId`, `projectId`, `dateRange`).

- [ ] **Criar a página**

  ```typescript
  // src/pages/LaunchEditionAnalysis.tsx
  import { useParams } from 'react-router-dom';
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { ArrowLeft, Calendar, Edit2 } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { Card } from '@/components/ui/card';
  import { Badge } from '@/components/ui/badge';
  import { useTenantNavigation } from '@/hooks/useTenantNavigation';
  import { useProject } from '@/hooks/useProject';
  import { useEdition } from '@/hooks/useLaunchEditions';
  import { useLaunchEditionData } from '@/hooks/useLaunchEditionData';
  import { PassingDiarioChart } from '@/components/launch/PassingDiarioChart';
  import { LaunchProductsSalesBreakdown } from '@/components/launch/LaunchProductsSalesBreakdown';
  import { LaunchConversionAnalysis } from '@/components/launch/LaunchConversionAnalysis';

  const STATUS_MAP = {
    planned: { label: 'Planejada', className: 'bg-slate-100 text-slate-700' },
    active: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
    finished: { label: 'Encerrada', className: 'bg-amber-100 text-amber-700' },
  } as const;

  export default function LaunchEditionAnalysis() {
    const { funnelId, editionId } = useParams<{ funnelId: string; editionId: string }>();
    const { navigate } = useTenantNavigation();
    const { project } = useProject();
    const projectId = project?.id || '';

    const { edition, isLoading: editionLoading } = useEdition(editionId!);
    const { kpis, kpisLoading, passingDiario, passingLoading } = useLaunchEditionData(
      projectId, funnelId!, edition
    );

    if (editionLoading) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Carregando...
        </div>
      );
    }

    if (!edition) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Edição não encontrada.</p>
          <Button variant="outline" onClick={() => navigate('launch-dashboard')}>
            Voltar
          </Button>
        </div>
      );
    }

    const status = STATUS_MAP[edition.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.planned;
    const fmtDate = (d: string | null) =>
      d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

    // dateRange para componentes existentes
    const dateRange = {
      from: edition.start_date ? new Date(edition.start_date) : undefined,
      to: edition.end_date ? new Date(edition.end_date) : undefined,
    };

    return (
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => navigate('launch-dashboard')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold truncate">{edition.name}</h1>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
              {edition.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Início: {fmtDate(edition.start_date)}
                </span>
              )}
              {edition.event_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Evento: {fmtDate(edition.event_date)}
                </span>
              )}
              {edition.end_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Encerramento: {fmtDate(edition.end_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPIs resumo */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Ingressos vendidos"
            value={kpisLoading ? '—' : (kpis?.totalIngressos ?? 0).toString()}
          />
          <KpiCard
            label="Faturamento total"
            value={kpisLoading ? '—' : formatCurrency(kpis?.faturamentoTotal ?? 0)}
          />
          <KpiCard
            label="ROAS da edição"
            value={kpisLoading ? '—' : (kpis?.roas ?? 0).toFixed(2) + 'x'}
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

        {/* Funil de conversão (componente existente) */}
        {funnelId && dateRange.from && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Funil de Conversão</h2>
            <LaunchProductsSalesBreakdown
              funnelId={funnelId}
              projectId={projectId}
              dateRange={dateRange}
            />
          </Card>
        )}

        {/* Análise de conversão lead→comprador (componente existente) */}
        {funnelId && (
          <LaunchConversionAnalysis
            funnelId={funnelId}
            projectId={projectId}
            dateRange={dateRange}
          />
        )}
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

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  ```

  **Ajuste de props:** Após ler `LaunchProductsSalesBreakdown` e `LaunchConversionAnalysis`, adaptar as props passadas conforme a assinatura real desses componentes. Se receberem `funnelId + startDate + endDate` em vez de `dateRange`, ajustar.

- [ ] **Verificar build**
  ```bash
  npm run build
  ```

- [ ] **Commit**
  ```bash
  git add src/pages/LaunchEditionAnalysis.tsx
  git commit -m "feat: tela de análise de edição com KPIs, passing diário e funil"
  ```

---

## Task 6: Rota + Navegação

**Files:**
- Modify: `src/App.tsx`

- [ ] **Ler App.tsx para entender a estrutura de rotas**

- [ ] **Adicionar import e rota**

  Localizar o bloco de rotas do `ProjectLayout`. Adicionar:

  ```typescript
  import LaunchEditionAnalysis from '@/pages/LaunchEditionAnalysis';

  // Dentro do bloco de rotas existente:
  <Route path="lancamentos/:funnelId/edicoes/:editionId" element={<LaunchEditionAnalysis />} />
  ```

  A rota deve ficar dentro do mesmo `<Route element={<ProjectLayout />}>` que contém `launch-dashboard`.

- [ ] **Verificar build**
  ```bash
  npm run build
  ```

- [ ] **Verificar navegação em desenvolvimento**
  ```bash
  npm run dev
  ```
  - Abrir um funil `lancamento_pago` no LaunchDashboard
  - Verificar que o badge "Lançamento Pago" aparece
  - Expandir → verificar que as edições aparecem (se houver)
  - Criar uma edição no `LaunchConfigDialog` → verificar que 4 fases foram criadas automaticamente
  - Clicar numa edição → verificar que a rota abre e os KPIs carregam

- [ ] **Commit final**
  ```bash
  git add src/App.tsx
  git commit -m "feat: rota lancamentos/:funnelId/edicoes/:editionId para análise de edição"
  ```

---

## Task 7: Atualizar arquivos de contexto

- [ ] **Atualizar `TASKS.md`**

  Mover as tarefas da Onda 2 para concluído conforme o que foi feito:
  - Fases automáticas ao criar edição ✅
  - Badge lançamento pago + edições colapsáveis ✅
  - Tela de análise de edição (KPIs + passing diário + funil) ✅

- [ ] **Atualizar `debug_log.md`**

  Adicionar entrada com o que foi implementado, datas, resultado do build.

- [ ] **Commit**
  ```bash
  git add TASKS.md debug_log.md
  git commit -m "docs: atualizar TASKS.md e debug_log.md — Onda 2A concluída"
  ```

---

## Checklist Final

- [ ] Fases criadas automaticamente ao criar primeira edição (4 fases padrão com datas)
- [ ] Badge "Lançamento Pago" amber diferenciado no dashboard
- [ ] Ao expandir lançamento pago → mostra edições (não fases)
- [ ] Clicar na edição → navega para `/lancamentos/:funnelId/edicoes/:editionId`
- [ ] Tela da edição: header com nome + status + datas + botão Voltar
- [ ] KPIs: ingressos, faturamento, ROAS, show rate N/A
- [ ] Gráfico passing diário: barras coloridas + linha meta tracejada + linha de totais
- [ ] Funil de conversão reutilizado
- [ ] Navegação com `useTenantNavigation` em todos os links
- [ ] Build: zero erros TypeScript
- [ ] Arquivos de contexto atualizados
- [ ] Todas as alterações commitadas
