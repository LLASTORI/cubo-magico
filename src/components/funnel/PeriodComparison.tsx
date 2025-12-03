import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, TrendingUp, TrendingDown, Minus, ArrowLeftRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PeriodComparisonProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
  initialStartDate?: Date;
  initialEndDate?: Date;
}

interface PeriodMetrics {
  totalSales: number;
  totalRevenue: number;
  uniqueCustomers: number;
  avgTicket: number;
}

interface HotmartSale {
  purchase: {
    offer: { code: string };
    price: { value: number };
    status: string;
  };
  buyer: { email: string };
}

const PeriodComparison = ({ selectedFunnel, funnelOfferCodes, initialStartDate, initialEndDate }: PeriodComparisonProps) => {
  const { currentProject } = useProject();
  const today = new Date();
  
  // Calculate periods based on dashboard dates or default
  const endRef = initialEndDate || today;
  const startRef = initialStartDate || subDays(today, 14);
  const periodDays = Math.floor((endRef.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24) / 2);
  
  // Period A (anterior - primeira metade)
  const [periodAStart, setPeriodAStart] = useState<Date>(startRef);
  const [periodAEnd, setPeriodAEnd] = useState<Date>(subDays(startRef, -periodDays));
  
  // Period B (atual/recente - segunda metade)
  const [periodBStart, setPeriodBStart] = useState<Date>(subDays(endRef, periodDays));
  const [periodBEnd, setPeriodBEnd] = useState<Date>(endRef);

  const [periodAMetrics, setPeriodAMetrics] = useState<PeriodMetrics>({ totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 });
  const [periodBMetrics, setPeriodBMetrics] = useState<PeriodMetrics>({ totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 });
  const [loading, setLoading] = useState(false);

  const fetchPeriodDataFromAPI = async (startDate: Date, endDate: Date): Promise<HotmartSale[]> => {
    // Convert dates to UTC timestamps
    const startUTC = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0, 0, 0, 0
    );
    
    const endUTC = Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23, 59, 59, 999
    );

    let allItems: HotmartSale[] = [];
    let nextPageToken: string | null = null;
    
    do {
      const params: any = {
        start_date: startUTC,
        end_date: endUTC,
        max_results: 500,
      };
      
      if (nextPageToken) {
        params.page_token = nextPageToken;
      }

      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/history',
          params,
          projectId: currentProject?.id,
        },
      });

      if (error) {
        console.error('Erro ao buscar dados da API:', error);
        throw error;
      }

      if (data?.items) {
        allItems = [...allItems, ...data.items];
      }
      
      nextPageToken = data?.page_info?.next_page_token || null;
    } while (nextPageToken);

    return allItems;
  };

  const calculateMetrics = (sales: HotmartSale[]): PeriodMetrics => {
    // Filter by funnel offer codes and approved status
    const filteredSales = sales.filter(sale => {
      const offerCode = sale.purchase?.offer?.code;
      const status = sale.purchase?.status;
      return funnelOfferCodes.includes(offerCode) && status === 'COMPLETE';
    });

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.purchase?.price?.value || 0), 0);
    const uniqueCustomers = new Set(filteredSales.map(s => s.buyer?.email)).size;
    const avgTicket = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    return { totalSales, totalRevenue, uniqueCustomers, avgTicket };
  };

  const loadData = async () => {
    if (funnelOfferCodes.length === 0) {
      toast.error('Nenhuma oferta configurada para este funil');
      return;
    }

    setLoading(true);
    
    try {
      const [salesA, salesB] = await Promise.all([
        fetchPeriodDataFromAPI(periodAStart, periodAEnd),
        fetchPeriodDataFromAPI(periodBStart, periodBEnd)
      ]);
      
      const metricsA = calculateMetrics(salesA);
      const metricsB = calculateMetrics(salesB);
      
      setPeriodAMetrics(metricsA);
      setPeriodBMetrics(metricsB);
      
      console.log('Período A:', format(periodAStart, 'dd/MM'), '-', format(periodAEnd, 'dd/MM'), '| Vendas:', metricsA.totalSales);
      console.log('Período B:', format(periodBStart, 'dd/MM'), '-', format(periodBEnd, 'dd/MM'), '| Vendas:', metricsB.totalSales);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da API');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or funnel changes
  useEffect(() => {
    if (selectedFunnel && funnelOfferCodes.length > 0) {
      loadData();
    }
  }, [selectedFunnel, funnelOfferCodes.join(',')]);

  const calculateVariation = (a: number, b: number): { value: number; type: 'up' | 'down' | 'neutral' } => {
    if (a === 0 && b === 0) return { value: 0, type: 'neutral' };
    if (a === 0) return { value: 100, type: 'up' };
    const variation = ((b - a) / a) * 100;
    return {
      value: Math.abs(variation),
      type: variation > 0 ? 'up' : variation < 0 ? 'down' : 'neutral'
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const VariationBadge = ({ variation }: { variation: { value: number; type: 'up' | 'down' | 'neutral' } }) => {
    const Icon = variation.type === 'up' ? TrendingUp : variation.type === 'down' ? TrendingDown : Minus;
    const colorClass = variation.type === 'up' 
      ? 'text-green-500 bg-green-500/10' 
      : variation.type === 'down' 
        ? 'text-red-500 bg-red-500/10' 
        : 'text-muted-foreground bg-muted';
    
    return (
      <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold", colorClass)}>
        <Icon className="w-3 h-3" />
        {variation.value.toFixed(1)}%
      </div>
    );
  };

  const MetricComparisonCard = ({ 
    label, 
    valueA, 
    valueB, 
    format: formatFn = (v: number) => v.toString()
  }: { 
    label: string; 
    valueA: number; 
    valueB: number;
    format?: (v: number) => string;
  }) => {
    const variation = calculateVariation(valueA, valueB);
    
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground mb-3">{label}</p>
        <div className="flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground mb-1">Período A</p>
            <p className="text-lg font-bold text-foreground">{formatFn(valueA)}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
            <VariationBadge variation={variation} />
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground mb-1">Período B</p>
            <p className="text-lg font-bold text-foreground">{formatFn(valueB)}</p>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Comparação de Períodos</h3>
          <p className="text-sm text-muted-foreground">Compare o desempenho entre dois períodos diferentes</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Comparar
        </Button>
      </div>

      {/* Period Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-muted/20 rounded-lg">
        {/* Period A */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Período A (Anterior)</Label>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[120px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-3 w-3" />
                  {format(periodAStart, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={periodAStart}
                  onSelect={(date) => date && setPeriodAStart(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[120px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-3 w-3" />
                  {format(periodAEnd, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={periodAEnd}
                  onSelect={(date) => date && setPeriodAEnd(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Period B */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Período B (Recente)</Label>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[120px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-3 w-3" />
                  {format(periodBStart, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={periodBStart}
                  onSelect={(date) => date && setPeriodBStart(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[120px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-3 w-3" />
                  {format(periodBEnd, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={periodBEnd}
                  onSelect={(date) => date && setPeriodBEnd(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Buscando dados da Hotmart...</p>
        </div>
      ) : (
        /* Metrics Comparison Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricComparisonCard
            label="Total de Clientes"
            valueA={periodAMetrics.uniqueCustomers}
            valueB={periodBMetrics.uniqueCustomers}
          />
          <MetricComparisonCard
            label="Total de Vendas"
            valueA={periodAMetrics.totalSales}
            valueB={periodBMetrics.totalSales}
          />
          <MetricComparisonCard
            label="Receita Total"
            valueA={periodAMetrics.totalRevenue}
            valueB={periodBMetrics.totalRevenue}
            format={formatCurrency}
          />
          <MetricComparisonCard
            label="Ticket Médio"
            valueA={periodAMetrics.avgTicket}
            valueB={periodBMetrics.avgTicket}
            format={formatCurrency}
          />
        </div>
      )}
    </Card>
  );
};

export default PeriodComparison;
