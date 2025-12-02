import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, TrendingUp, TrendingDown, Minus, ArrowLeftRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface PeriodComparisonProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
}

interface PeriodMetrics {
  totalSales: number;
  totalRevenue: number;
  uniqueCustomers: number;
  avgTicket: number;
}

const PeriodComparison = ({ selectedFunnel, funnelOfferCodes }: PeriodComparisonProps) => {
  const today = new Date();
  
  // Period A (anterior)
  const [periodAStart, setPeriodAStart] = useState<Date>(subDays(today, 14));
  const [periodAEnd, setPeriodAEnd] = useState<Date>(subDays(today, 8));
  
  // Period B (atual/recente)
  const [periodBStart, setPeriodBStart] = useState<Date>(subDays(today, 7));
  const [periodBEnd, setPeriodBEnd] = useState<Date>(today);

  const [periodAMetrics, setPeriodAMetrics] = useState<PeriodMetrics>({ totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 });
  const [periodBMetrics, setPeriodBMetrics] = useState<PeriodMetrics>({ totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 });
  const [loading, setLoading] = useState(false);

  const fetchPeriodData = async (startDate: Date, endDate: Date): Promise<PeriodMetrics> => {
    if (funnelOfferCodes.length === 0) {
      return { totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 };
    }

    const startStr = format(startOfDay(startDate), 'yyyy-MM-dd');
    const endStr = format(endOfDay(endDate), 'yyyy-MM-dd 23:59:59');

    const { data, error } = await supabase
      .from('hotmart_sales')
      .select('transaction_id, buyer_email, total_price, offer_code, sale_date')
      .in('offer_code', funnelOfferCodes)
      .gte('sale_date', startStr)
      .lte('sale_date', endStr)
      .eq('status', 'approved');

    if (error) {
      console.error('Erro ao buscar dados:', error);
      return { totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 };
    }

    const sales = data || [];
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const uniqueCustomers = new Set(sales.map(s => s.buyer_email)).size;
    const avgTicket = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    return { totalSales, totalRevenue, uniqueCustomers, avgTicket };
  };

  const loadData = async () => {
    setLoading(true);
    
    const [metricsA, metricsB] = await Promise.all([
      fetchPeriodData(periodAStart, periodAEnd),
      fetchPeriodData(periodBStart, periodBEnd)
    ]);
    
    setPeriodAMetrics(metricsA);
    setPeriodBMetrics(metricsB);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedFunnel && funnelOfferCodes.length > 0) {
      loadData();
    }
  }, [selectedFunnel, funnelOfferCodes, periodAStart, periodAEnd, periodBStart, periodBEnd]);

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
          Atualizar
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
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        /* Metrics Comparison Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricComparisonCard
            label="Total de Vendas"
            valueA={periodAMetrics.totalSales}
            valueB={periodBMetrics.totalSales}
          />
          <MetricComparisonCard
            label="Clientes Únicos"
            valueA={periodAMetrics.uniqueCustomers}
            valueB={periodBMetrics.uniqueCustomers}
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
