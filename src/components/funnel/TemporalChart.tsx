import { useState, useMemo } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, RefreshCw, TrendingUp, DollarSign, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TemporalChartProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
  initialStartDate?: Date;
  initialEndDate?: Date;
}

interface DailyData {
  date: string;
  dateLabel: string;
  sales: number;
  revenue: number;
  customers: number;
}

const chartConfig = {
  sales: {
    label: "Produtos Vendidos",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Receita",
    color: "hsl(142, 76%, 36%)",
  },
  customers: {
    label: "Clientes",
    color: "hsl(262, 83%, 58%)",
  },
};

const TemporalChart = ({ selectedFunnel, funnelOfferCodes, initialStartDate, initialEndDate }: TemporalChartProps) => {
  const { currentProject } = useProject();
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(initialStartDate || subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(initialEndDate || today);

  // Fetch sales data from database
  const { data: salesData, isLoading: loading, refetch } = useQuery({
    queryKey: ['temporal-chart-sales', currentProject?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), funnelOfferCodes],
    queryFn: async () => {
      if (!currentProject?.id || funnelOfferCodes.length === 0) return [];
      
      const startStr = `${format(startDate, 'yyyy-MM-dd')}T00:00:00`;
      const endStr = `${format(endDate, 'yyyy-MM-dd')}T23:59:59`;
      
      // Fetch with pagination to handle large date ranges
      const allSales: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('sale_date, buyer_email, total_price_brl, offer_code')
          .eq('project_id', currentProject.id)
          .in('status', ['APPROVED', 'COMPLETE'])
          .in('offer_code', funnelOfferCodes)
          .gte('sale_date', startStr)
          .lte('sale_date', endStr)
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('sale_date', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allSales.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allSales;
    },
    enabled: !!currentProject?.id && funnelOfferCodes.length > 0,
  });

  const dailyData = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      // Return empty days in range
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        dateLabel: format(day, 'dd/MM', { locale: ptBR }),
        sales: 0,
        revenue: 0,
        customers: 0,
      }));
    }

    // Create a map of dates in the range
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dataMap: Record<string, DailyData> = {};
    
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      dataMap[dateKey] = {
        date: dateKey,
        dateLabel: format(day, 'dd/MM', { locale: ptBR }),
        sales: 0,
        revenue: 0,
        customers: 0,
      };
    });

    // Group sales by date
    const customersByDate: Record<string, Set<string>> = {};
    
    salesData.forEach(sale => {
      if (!sale.sale_date) return;
      
      const date = new Date(sale.sale_date);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (dataMap[dateKey]) {
        dataMap[dateKey].sales += 1;
        dataMap[dateKey].revenue += sale.total_price_brl || 0;
        
        if (!customersByDate[dateKey]) {
          customersByDate[dateKey] = new Set();
        }
        customersByDate[dateKey].add(sale.buyer_email || '');
      }
    });

    // Update unique customers count
    Object.keys(customersByDate).forEach(dateKey => {
      if (dataMap[dateKey]) {
        dataMap[dateKey].customers = customersByDate[dateKey].size;
      }
    });

    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [salesData, startDate, endDate]);

  const totals = useMemo(() => {
    return dailyData.reduce((acc, d) => ({
      sales: acc.sales + d.sales,
      revenue: acc.revenue + d.revenue,
      customers: acc.customers + d.customers,
    }), { sales: 0, revenue: 0, customers: 0 });
  }, [dailyData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Evolução Temporal</h3>
          <p className="text-sm text-muted-foreground">Vendas e receita ao longo do tempo</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
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
        <div className="flex gap-1 ml-auto flex-wrap">
          {[
            { days: 7, label: '7d' },
            { days: 15, label: '15d' },
            { days: 30, label: '30d' },
            { days: 60, label: '60d' },
            { days: 90, label: '90d' },
            { days: 365, label: '1 ano' },
            { days: 730, label: '2 anos' },
          ].map(({ days, label }) => (
            <Button
              key={days}
              variant="ghost"
              size="sm"
              className="px-2 text-xs"
              onClick={() => {
                setStartDate(subDays(today, days));
                setEndDate(today);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                  <p className="text-3xl font-bold text-foreground">{totals.customers}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total de Produtos Vendidos</p>
                  <p className="text-3xl font-bold text-foreground">{totals.sales}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <BarChart3 className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                  <p className="text-3xl font-bold text-foreground">{formatCurrency(totals.revenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(totals.customers > 0 ? totals.revenue / totals.customers : 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sales">Produtos Vendidos</TabsTrigger>
              <TabsTrigger value="revenue">Receita</TabsTrigger>
              <TabsTrigger value="combined">Combinado</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#salesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="revenue">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} 
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(142, 76%, 36%)"
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="combined">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </>
      )}
    </Card>
  );
};

export default TemporalChart;
