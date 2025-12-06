import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface SaleData {
  offer_code?: string | null;
  total_price_brl?: number | null;
  buyer_email?: string | null;
  sale_date?: string | null;
}

interface PeriodComparisonProps {
  salesData: SaleData[];
  funnelOfferCodes: string[];
  startDate: Date;
  endDate: Date;
}

interface PeriodMetrics {
  totalSales: number;
  totalRevenue: number;
  uniqueCustomers: number;
  avgTicket: number;
}

const PeriodComparison = ({ salesData, funnelOfferCodes, startDate, endDate }: PeriodComparisonProps) => {
  // Calculate periods based on the date range
  const periodDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) / 2));
  
  // Period A (first half) and Period B (second half)
  const [periodAStart, setPeriodAStart] = useState<Date>(startDate);
  const [periodAEnd, setPeriodAEnd] = useState<Date>(subDays(startDate, -periodDays));
  const [periodBStart, setPeriodBStart] = useState<Date>(subDays(endDate, periodDays));
  const [periodBEnd, setPeriodBEnd] = useState<Date>(endDate);

  // Filter sales by funnel offer codes
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => 
      funnelOfferCodes.includes(sale.offer_code || '')
    );
  }, [salesData, funnelOfferCodes]);

  // Split sales into periods
  const periodASales = useMemo(() => {
    return filteredSales.filter(sale => {
      if (!sale.sale_date) return false;
      const saleDate = new Date(sale.sale_date);
      return saleDate >= periodAStart && saleDate <= periodAEnd;
    });
  }, [filteredSales, periodAStart, periodAEnd]);

  const periodBSales = useMemo(() => {
    return filteredSales.filter(sale => {
      if (!sale.sale_date) return false;
      const saleDate = new Date(sale.sale_date);
      return saleDate >= periodBStart && saleDate <= periodBEnd;
    });
  }, [filteredSales, periodBStart, periodBEnd]);

  const calculateMetrics = (sales: UnifiedSaleData[]): PeriodMetrics => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    const uniqueCustomers = new Set(sales.map(s => s.buyer_email).filter(Boolean)).size;
    const avgTicket = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    return { totalSales, totalRevenue, uniqueCustomers, avgTicket };
  };

  const periodAMetrics = useMemo(() => calculateMetrics(periodASales), [periodASales]);
  const periodBMetrics = useMemo(() => calculateMetrics(periodBSales), [periodBSales]);

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

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Comparação de Períodos</h3>
        <p className="text-sm text-muted-foreground">Compare métricas entre dois períodos</p>
      </div>

      {/* Date Selectors */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
          <h4 className="text-sm font-medium mb-3">Período A (Referência)</h4>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[120px] justify-start">
                    <Calendar className="mr-2 h-3 w-3" />
                    {format(periodAStart, "dd/MM/yy", { locale: ptBR })}
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
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[120px] justify-start">
                    <Calendar className="mr-2 h-3 w-3" />
                    {format(periodAEnd, "dd/MM/yy", { locale: ptBR })}
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
        </div>

        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="text-sm font-medium mb-3">Período B (Comparação)</h4>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[120px] justify-start">
                    <Calendar className="mr-2 h-3 w-3" />
                    {format(periodBStart, "dd/MM/yy", { locale: ptBR })}
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
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[120px] justify-start">
                    <Calendar className="mr-2 h-3 w-3" />
                    {format(periodBEnd, "dd/MM/yy", { locale: ptBR })}
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
      </div>

      {/* Metrics Comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricComparisonCard
          label="Produtos Vendidos"
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
          label="Clientes Únicos"
          valueA={periodAMetrics.uniqueCustomers}
          valueB={periodBMetrics.uniqueCustomers}
        />
        <MetricComparisonCard
          label="Ticket Médio"
          valueA={periodAMetrics.avgTicket}
          valueB={periodBMetrics.avgTicket}
          format={formatCurrency}
        />
      </div>
    </Card>
  );
};

export default PeriodComparison;
