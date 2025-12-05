import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CalendarIcon, RefreshCw, TrendingUp, TrendingDown, Target, 
  DollarSign, ShoppingCart, Users, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CuboMagicoDashboardProps {
  projectId: string;
}

interface FunnelWithConfig {
  id: string;
  name: string;
  roas_target: number | null;
  campaign_name_pattern: string | null;
}

interface FunnelMetrics {
  funnel: FunnelWithConfig;
  investimento: number;
  faturamento: number;
  vendasFront: number;
  totalProdutos: number;
  ticketMedio: number;
  cpaMaximo: number;
  cpaReal: number;
  roas: number;
  status: 'excellent' | 'good' | 'warning' | 'danger';
  productsByPosition: Record<string, number>;
}

export function CuboMagicoDashboard({ projectId }: CuboMagicoDashboardProps) {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch funnels with config
  const { data: funnels, isLoading: loadingFunnels } = useQuery({
    queryKey: ['funnels-cubo-magico', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name, roas_target, campaign_name_pattern')
        .eq('project_id', projectId)
        .not('campaign_name_pattern', 'is', null);
      
      if (error) throw error;
      return (data as FunnelWithConfig[]) || [];
    },
    enabled: !!projectId,
  });

  // Fetch offer mappings
  const { data: offerMappings } = useQuery({
    queryKey: ['offer-mappings-cubo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id_funil, funnel_id, codigo_oferta, tipo_posicao, nome_posicao, valor')
        .eq('project_id', projectId)
        .eq('status', 'Ativo');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch hotmart sales
  const { data: salesData } = useQuery({
    queryKey: ['hotmart-sales-cubo', projectId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('offer_code, total_price_brl, buyer_email, sale_date')
        .eq('project_id', projectId)
        .eq('status', 'COMPLETE')
        .gte('sale_date', format(startDate, 'yyyy-MM-dd'))
        .lte('sale_date', format(endDate, 'yyyy-MM-dd') + 'T23:59:59');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch Meta campaigns and insights
  const { data: campaignsData } = useQuery({
    queryKey: ['meta-campaigns-cubo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: insightsData, refetch: refetchInsights, isRefetching } = useQuery({
    queryKey: ['meta-insights-cubo', projectId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_insights')
        .select('campaign_id, spend, date_start')
        .eq('project_id', projectId)
        .gte('date_start', format(startDate, 'yyyy-MM-dd'))
        .lte('date_start', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Calculate metrics for each funnel
  const funnelMetrics = useMemo((): FunnelMetrics[] => {
    if (!funnels || !offerMappings || !salesData || !campaignsData || !insightsData) {
      return [];
    }

    return funnels.map(funnel => {
      const pattern = funnel.campaign_name_pattern?.toLowerCase() || '';
      const roasTarget = funnel.roas_target || 2;

      // Find campaigns matching the pattern
      const matchingCampaigns = campaignsData.filter(c => 
        c.campaign_name?.toLowerCase().includes(pattern)
      );
      const matchingCampaignIds = new Set(matchingCampaigns.map(c => c.campaign_id));

      // Calculate total spend for matching campaigns
      const investimento = insightsData
        .filter(i => matchingCampaignIds.has(i.campaign_id || ''))
        .reduce((sum, i) => sum + (i.spend || 0), 0);

      // Get offer codes for this funnel - check both funnel_id (FK) and id_funil (legacy name)
      const funnelOffers = offerMappings.filter(o => 
        o.funnel_id === funnel.id || o.id_funil === funnel.name
      );
      const offerCodes = new Set(funnelOffers.map(o => o.codigo_oferta));

      // Calculate sales metrics
      const funnelSales = salesData.filter(s => offerCodes.has(s.offer_code));
      const faturamento = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
      
      // Count unique customers
      const uniqueCustomers = new Set(funnelSales.map(s => s.buyer_email)).size;
      
      // Count products by position
      const productsByPosition: Record<string, number> = {};
      funnelOffers.forEach(offer => {
        const pos = offer.tipo_posicao || 'OTHER';
        const salesCount = funnelSales.filter(s => s.offer_code === offer.codigo_oferta).length;
        productsByPosition[pos] = (productsByPosition[pos] || 0) + salesCount;
      });

      // FRONT sales count
      const vendasFront = productsByPosition['FRONT'] || productsByPosition['FE'] || 0;
      const totalProdutos = Object.values(productsByPosition).reduce((sum, v) => sum + v, 0);

      // Calculate ticket médio (per customer)
      const ticketMedio = uniqueCustomers > 0 ? faturamento / uniqueCustomers : 0;

      // CPA máximo aceitável = Ticket médio / ROAS alvo
      const cpaMaximo = ticketMedio / roasTarget;

      // CPA real = Investimento / Vendas FRONT
      const cpaReal = vendasFront > 0 ? investimento / vendasFront : 0;

      // ROAS real
      const roas = investimento > 0 ? faturamento / investimento : 0;

      // Status based on CPA comparison
      let status: 'excellent' | 'good' | 'warning' | 'danger' = 'good';
      if (cpaReal === 0 || investimento === 0) {
        status = 'good';
      } else if (cpaReal <= cpaMaximo * 0.8) {
        status = 'excellent';
      } else if (cpaReal <= cpaMaximo) {
        status = 'good';
      } else if (cpaReal <= cpaMaximo * 1.2) {
        status = 'warning';
      } else {
        status = 'danger';
      }

      return {
        funnel,
        investimento,
        faturamento,
        vendasFront,
        totalProdutos,
        ticketMedio,
        cpaMaximo,
        cpaReal,
        roas,
        status,
        productsByPosition,
      };
    });
  }, [funnels, offerMappings, salesData, campaignsData, insightsData]);

  // Totals
  const totals = useMemo(() => {
    return funnelMetrics.reduce((acc, m) => ({
      investimento: acc.investimento + m.investimento,
      faturamento: acc.faturamento + m.faturamento,
      vendasFront: acc.vendasFront + m.vendasFront,
      totalProdutos: acc.totalProdutos + m.totalProdutos,
    }), { investimento: 0, faturamento: 0, vendasFront: 0, totalProdutos: 0 });
  }, [funnelMetrics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'good': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Excelente</Badge>;
      case 'good': return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Bom</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Atenção</Badge>;
      case 'danger': return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Crítico</Badge>;
      default: return null;
    }
  };

  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  const setThisMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
  };

  if (loadingFunnels) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando...</span>
        </div>
      </Card>
    );
  }

  if (!funnels || funnels.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <Target className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Nenhum funil configurado</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Para usar o dashboard Cubo Mágico, configure o <strong>padrão de nome da campanha</strong> e o <strong>ROAS alvo</strong> em cada funil no menu Configurações → Funis.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Dashboard Cubo Mágico</h2>
            <p className="text-sm text-muted-foreground">
              Análise de ROI por funil • {funnels.length} funis configurados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick date buttons */}
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setQuickDate(0)}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate(7)}>7 dias</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>30 dias</Button>
              <Button variant="outline" size="sm" onClick={setThisMonth}>Este mês</Button>
              <Button variant="outline" size="sm" onClick={setLastMonth}>Mês passado</Button>
            </div>

            {/* Date pickers */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchInsights()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Investimento</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.investimento)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.faturamento)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas FRONT</p>
              <p className="text-xl font-bold text-foreground">{totals.vendasFront}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Produtos</p>
              <p className="text-xl font-bold text-foreground">{totals.totalProdutos}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Funnel Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funil</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">FRONT</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
              <TableHead className="text-right">CPA Máximo</TableHead>
              <TableHead className="text-right">CPA Real</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funnelMetrics.map(metrics => (
              <TableRow key={metrics.funnel.id}>
                <TableCell className="font-medium">{metrics.funnel.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {metrics.funnel.campaign_name_pattern}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(metrics.investimento)}
                </TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(metrics.faturamento)}
                </TableCell>
                <TableCell className="text-right">{metrics.vendasFront}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(metrics.ticketMedio)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatCurrency(metrics.cpaMaximo)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono font-bold",
                  metrics.status === 'excellent' && "text-green-600",
                  metrics.status === 'good' && "text-blue-600",
                  metrics.status === 'warning' && "text-yellow-600",
                  metrics.status === 'danger' && "text-red-600"
                )}>
                  {formatCurrency(metrics.cpaReal)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {metrics.roas.toFixed(2)}x
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metrics.status)}
                    {getStatusBadge(metrics.status)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3">Legenda de Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span><strong>Excelente:</strong> CPA ≤ 80% do máximo</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span><strong>Bom:</strong> CPA ≤ 100% do máximo</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span><strong>Atenção:</strong> CPA até 120% do máximo</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span><strong>Crítico:</strong> CPA &gt; 120% do máximo</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <strong>Fórmula:</strong> CPA Máximo = Ticket Médio ÷ ROAS Alvo | CPA Real = Investimento ÷ Vendas FRONT
        </p>
      </Card>
    </div>
  );
}
