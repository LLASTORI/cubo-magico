import { useMemo } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, DollarSign, BarChart3, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SaleData {
  offer_code?: string | null;
  total_price_brl?: number | null;
  buyer_email?: string | null;
  sale_date?: string | null;
}

interface TemporalChartProps {
  salesData: SaleData[];
  funnelOfferCodes: string[];
  startDate: Date;
  endDate: Date;
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

const TemporalChart = ({ salesData, funnelOfferCodes, startDate, endDate }: TemporalChartProps) => {
  // Filter sales by funnel offer codes
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => 
      funnelOfferCodes.includes(sale.offer_code || '')
    );
  }, [salesData, funnelOfferCodes]);

  const dailyData = useMemo(() => {
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

    if (filteredSales.length === 0) {
      return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Group sales by date
    const customersByDate: Record<string, Set<string>> = {};
    
    filteredSales.forEach(sale => {
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
  }, [filteredSales, startDate, endDate]);

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

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Evolução Temporal</h3>
        <p className="text-sm text-muted-foreground">Vendas e receita ao longo do tempo</p>
      </div>

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
    </Card>
  );
};

export default TemporalChart;
