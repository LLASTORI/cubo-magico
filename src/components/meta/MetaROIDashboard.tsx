import { useState, useMemo } from "react";
import { format, subDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  ShoppingCart, 
  Calculator,
  Calendar,
  RefreshCw,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  ComposedChart,
  Area
} from "recharts";

interface MetaROIDashboardProps {
  projectId: string;
  activeAccountIds: string[];
}

interface DailyROIData {
  date: string;
  dateFormatted: string;
  spend: number;
  revenue: number;
  sales: number;
  profit: number;
  roas: number;
  roi: number;
  cpa: number;
}

const chartConfig = {
  spend: { label: "Investimento", color: "hsl(var(--destructive))" },
  revenue: { label: "Receita", color: "hsl(142, 76%, 36%)" },
  profit: { label: "Lucro", color: "hsl(var(--primary))" },
  roas: { label: "ROAS", color: "hsl(262, 83%, 58%)" },
};

export const MetaROIDashboard = ({ projectId, activeAccountIds }: MetaROIDashboardProps) => {
  const { currentProject } = useProject();
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(today);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch Meta insights (spend data)
  const { data: metaInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['meta_roi_insights', projectId, startDateStr, endDateStr, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('meta_insights')
        .select('date_start, spend, clicks, impressions')
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .gte('date_start', startDateStr)
        .lte('date_start', endDateStr);
      
      if (error) throw error;
      return data || [];
    },
    enabled: activeAccountIds.length > 0,
  });

  // Fetch Hotmart sales (revenue data)
  const { data: hotmartSales, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['hotmart_roi_sales', projectId, startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('sale_date, total_price, net_revenue, status')
        .eq('project_id', projectId)
        .gte('sale_date', `${startDateStr}T00:00:00`)
        .lte('sale_date', `${endDateStr}T23:59:59`)
        .in('status', ['COMPLETE', 'APPROVED']);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Process and combine data
  const roiData = useMemo(() => {
    if (!metaInsights || !hotmartSales) return { daily: [], totals: null };

    // Group Meta spend by date
    const spendByDate: Record<string, number> = {};
    metaInsights.forEach(insight => {
      const date = insight.date_start;
      spendByDate[date] = (spendByDate[date] || 0) + (insight.spend || 0);
    });

    // Group Hotmart revenue by date
    const revenueByDate: Record<string, { revenue: number; sales: number }> = {};
    hotmartSales.forEach(sale => {
      if (!sale.sale_date) return;
      const date = sale.sale_date.split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = { revenue: 0, sales: 0 };
      }
      revenueByDate[date].revenue += sale.total_price || sale.net_revenue || 0;
      revenueByDate[date].sales += 1;
    });

    // Get all unique dates
    const allDates = new Set([...Object.keys(spendByDate), ...Object.keys(revenueByDate)]);
    const sortedDates = Array.from(allDates).sort();

    // Build daily data
    const daily: DailyROIData[] = sortedDates.map(date => {
      const spend = spendByDate[date] || 0;
      const revenueData = revenueByDate[date] || { revenue: 0, sales: 0 };
      const revenue = revenueData.revenue;
      const sales = revenueData.sales;
      const profit = revenue - spend;
      const roas = spend > 0 ? revenue / spend : 0;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
      const cpa = sales > 0 ? spend / sales : 0;

      return {
        date,
        dateFormatted: format(parseISO(date), 'dd/MM', { locale: ptBR }),
        spend,
        revenue,
        sales,
        profit,
        roas,
        roi,
        cpa,
      };
    });

    // Calculate totals
    const totalSpend = daily.reduce((sum, d) => sum + d.spend, 0);
    const totalRevenue = daily.reduce((sum, d) => sum + d.revenue, 0);
    const totalSales = daily.reduce((sum, d) => sum + d.sales, 0);
    const totalProfit = totalRevenue - totalSpend;
    const totalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
    const totalCPA = totalSales > 0 ? totalSpend / totalSales : 0;

    return {
      daily,
      totals: {
        spend: totalSpend,
        revenue: totalRevenue,
        sales: totalSales,
        profit: totalProfit,
        roas: totalROAS,
        roi: totalROI,
        cpa: totalCPA,
      },
    };
  }, [metaInsights, hotmartSales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const handleRefresh = () => {
    refetchInsights();
    refetchSales();
  };

  const loading = insightsLoading || salesLoading;
  const hasData = roiData.totals && (roiData.totals.spend > 0 || roiData.totals.revenue > 0);
  const isProfitable = roiData.totals && roiData.totals.profit > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Dashboard de ROI
          </h3>
          <p className="text-sm text-muted-foreground">Meta Ads + Hotmart - Análise de Retorno sobre Investimento</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Date Selectors */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <Calendar className="mr-2 h-3 w-3" />
                {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <Calendar className="mr-2 h-3 w-3" />
                {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2 ml-auto">
          {[7, 15, 30, 60, 90].map(days => (
            <Button
              key={days}
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(subDays(today, days));
                setEndDate(today);
              }}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados de ROI...</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Nenhum dado disponível</p>
            <p className="text-sm text-muted-foreground">
              Verifique se há dados de Meta Ads e vendas do Hotmart no período selecionado.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Investimento */}
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Investimento</span>
                </div>
                <p className="text-lg font-bold text-destructive">{formatCurrency(roiData.totals!.spend)}</p>
              </CardContent>
            </Card>

            {/* Receita */}
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Receita</span>
                </div>
                <p className="text-lg font-bold text-green-500">{formatCurrency(roiData.totals!.revenue)}</p>
              </CardContent>
            </Card>

            {/* Lucro/Prejuízo */}
            <Card className={cn(
              isProfitable ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {isProfitable ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-xs text-muted-foreground">{isProfitable ? 'Lucro' : 'Prejuízo'}</span>
                </div>
                <p className={cn("text-lg font-bold", isProfitable ? "text-green-500" : "text-destructive")}>
                  {formatCurrency(Math.abs(roiData.totals!.profit))}
                </p>
              </CardContent>
            </Card>

            {/* Vendas */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Vendas</span>
                </div>
                <p className="text-lg font-bold">{formatNumber(roiData.totals!.sales)}</p>
              </CardContent>
            </Card>

            {/* ROAS */}
            <Card className={cn(
              roiData.totals!.roas >= 1 ? "bg-green-500/5 border-green-500/20" : "bg-yellow-500/5 border-yellow-500/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">ROAS</span>
                </div>
                <p className={cn("text-lg font-bold", roiData.totals!.roas >= 1 ? "text-green-500" : "text-yellow-500")}>
                  {roiData.totals!.roas.toFixed(2)}x
                </p>
              </CardContent>
            </Card>

            {/* ROI % */}
            <Card className={cn(
              roiData.totals!.roi > 0 ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">ROI</span>
                </div>
                <p className={cn("text-lg font-bold", roiData.totals!.roi > 0 ? "text-green-500" : "text-destructive")}>
                  {roiData.totals!.roi.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            {/* CPA */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">CPA</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(roiData.totals!.cpa)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Investimento vs Receita */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Investimento vs Receita</CardTitle>
                <CardDescription>Comparativo diário de gastos e faturamento</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <ComposedChart data={roiData.daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dateFormatted" className="text-xs" />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} className="text-xs" />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [formatCurrency(Number(value)), name === 'spend' ? 'Investimento' : 'Receita']}
                      />} 
                    />
                    <Bar dataKey="spend" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Investimento" />
                    <Bar dataKey="revenue" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Receita" />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* ROAS por Dia */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ROAS Diário</CardTitle>
                <CardDescription>Retorno sobre investimento em anúncios</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <ComposedChart data={roiData.daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dateFormatted" className="text-xs" />
                    <YAxis tickFormatter={(v) => `${v.toFixed(1)}x`} className="text-xs" />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value) => [`${Number(value).toFixed(2)}x`, 'ROAS']}
                      />} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="roas" 
                      fill="hsl(262, 83%, 58%)" 
                      fillOpacity={0.2} 
                      stroke="hsl(262, 83%, 58%)" 
                      strokeWidth={2}
                    />
                    {/* Reference line at ROAS = 1 */}
                    <Line 
                      type="monotone" 
                      dataKey={() => 1} 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      dot={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lucro Acumulado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lucro/Prejuízo por Dia</CardTitle>
              <CardDescription>Resultado financeiro diário (Receita - Investimento)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={roiData.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dateFormatted" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} className="text-xs" />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => [formatCurrency(Number(value)), 'Lucro']}
                    />} 
                  />
                  <Bar 
                    dataKey="profit" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Daily Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalhamento Diário</CardTitle>
              <CardDescription>Métricas completas por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Investimento</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roiData.daily.slice().reverse().map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(day.spend)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(day.revenue)}
                        </TableCell>
                        <TableCell className="text-right">{day.sales}</TableCell>
                        <TableCell className={cn("text-right font-medium", day.profit >= 0 ? "text-green-600" : "text-destructive")}>
                          {formatCurrency(day.profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={day.roas >= 1 ? "default" : "secondary"}>
                            {day.roas.toFixed(2)}x
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right", day.roi >= 0 ? "text-green-600" : "text-destructive")}>
                          {day.roi.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {day.sales > 0 ? formatCurrency(day.cpa) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
};

export default MetaROIDashboard;
