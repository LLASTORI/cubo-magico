import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, RefreshCw, CreditCard, Banknote, QrCode, Wallet, ShoppingBag, Users, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import MetricCard from "@/components/MetricCard";

interface PaymentMethodAnalysisProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
  initialStartDate?: Date;
  initialEndDate?: Date;
}

interface PaymentMetrics {
  method: string;
  icon: any;
  sales: number;
  customers: number;
  revenue: number;
  avgTicket: number;
  percentage: number;
  installmentBreakdown?: { installments: number; count: number; revenue: number }[];
}

const PAYMENT_COLORS: Record<string, string> = {
  'CREDIT_CARD': 'hsl(262, 83%, 58%)',
  'PIX': 'hsl(142, 76%, 36%)',
  'BILLET': 'hsl(25, 95%, 53%)',
  'PAYPAL': 'hsl(197, 71%, 52%)',
  'GOOGLE_PAY': 'hsl(var(--primary))',
  'OTHER': 'hsl(220, 14%, 46%)',
};

const PAYMENT_LABELS: Record<string, string> = {
  'CREDIT_CARD': 'Cartão de Crédito',
  'PIX': 'PIX',
  'BILLET': 'Boleto',
  'PAYPAL': 'PayPal',
  'GOOGLE_PAY': 'Google Pay',
  'OTHER': 'Outros',
};

const PAYMENT_ICONS: Record<string, any> = {
  'CREDIT_CARD': CreditCard,
  'PIX': QrCode,
  'BILLET': Banknote,
  'PAYPAL': Wallet,
  'GOOGLE_PAY': Wallet,
  'OTHER': Wallet,
};

const chartConfig = {
  sales: { label: "Produtos Vendidos", color: "hsl(var(--primary))" },
  revenue: { label: "Receita", color: "hsl(142, 76%, 36%)" },
};

const PaymentMethodAnalysis = ({ selectedFunnel, funnelOfferCodes, initialStartDate, initialEndDate }: PaymentMethodAnalysisProps) => {
  const { currentProject } = useProject();
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(initialStartDate || subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(initialEndDate || today);

  const { data: salesData, isLoading: loading, refetch } = useQuery({
    queryKey: ['payment-analysis-sales', currentProject?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), funnelOfferCodes],
    queryFn: async () => {
      if (!currentProject?.id || funnelOfferCodes.length === 0) return [];
      
      const startStr = `${format(startDate, 'yyyy-MM-dd')}T00:00:00`;
      const endStr = `${format(endDate, 'yyyy-MM-dd')}T23:59:59`;
      
      // Fetch with pagination
      const allSales: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('buyer_email, payment_method, installment_number, total_price_brl, offer_code, status')
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

  const paymentMetrics = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return { metrics: [], totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 };
    }

    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    
    // Calculate unique customers
    const uniqueEmails = new Set(salesData.map(sale => sale.buyer_email).filter(Boolean));
    const uniqueCustomers = uniqueEmails.size;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const groups: Record<string, { 
      sales: number; 
      revenue: number;
      customers: Set<string>;
      installments: Record<number, { count: number; revenue: number }>;
    }> = {};
    
    salesData.forEach(sale => {
      const method = sale.payment_method || 'OTHER';
      const installments = sale.installment_number || 1;
      const email = sale.buyer_email || '';
      const valueInBRL = sale.total_price_brl || 0;
      
      if (!groups[method]) {
        groups[method] = { sales: 0, revenue: 0, customers: new Set(), installments: {} };
      }
      groups[method].sales += 1;
      groups[method].revenue += valueInBRL;
      if (email) groups[method].customers.add(email);

      if (!groups[method].installments[installments]) {
        groups[method].installments[installments] = { count: 0, revenue: 0 };
      }
      groups[method].installments[installments].count += 1;
      groups[method].installments[installments].revenue += valueInBRL;
    });

    const metrics: PaymentMetrics[] = Object.entries(groups)
      .map(([method, data]) => ({
        method,
        icon: PAYMENT_ICONS[method] || Wallet,
        sales: data.sales,
        customers: data.customers.size,
        revenue: data.revenue,
        avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
        percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        installmentBreakdown: Object.entries(data.installments)
          .map(([inst, d]) => ({
            installments: parseInt(inst),
            count: d.count,
            revenue: d.revenue,
          }))
          .sort((a, b) => a.installments - b.installments),
      }))
      .sort((a, b) => b.sales - a.sales);

    return { metrics, totalSales, totalRevenue, uniqueCustomers, avgTicket };
  }, [salesData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Análise por Método de Pagamento</h3>
          <p className="text-sm text-muted-foreground">Distribuição de vendas por PIX, cartão, boleto, etc</p>
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
        <div className="flex gap-2 ml-auto">
          {[7, 15, 30, 60].map(days => (
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
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Clientes"
              value={paymentMetrics.uniqueCustomers}
              icon={Users}
            />
            <MetricCard
              title="Total de Produtos Vendidos"
              value={paymentMetrics.totalSales}
              icon={ShoppingBag}
            />
            <MetricCard
              title="Receita Total"
              value={formatCurrency(paymentMetrics.totalRevenue)}
              icon={DollarSign}
            />
            <MetricCard
              title="Ticket Médio"
              value={formatCurrency(paymentMetrics.avgTicket)}
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table */}
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Produtos Vendidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="w-[100px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMetrics.metrics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TableRow key={item.method}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-1.5 rounded" 
                            style={{ backgroundColor: `${PAYMENT_COLORS[item.method] || PAYMENT_COLORS.OTHER}20` }}
                          >
                            <Icon 
                              className="w-4 h-4" 
                              style={{ color: PAYMENT_COLORS[item.method] || PAYMENT_COLORS.OTHER }} 
                            />
                          </div>
                          <span className="font-medium">
                            {PAYMENT_LABELS[item.method] || item.method}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.customers}</TableCell>
                      <TableCell className="text-right">{item.sales}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.avgTicket)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={item.percentage} 
                            className="h-2"
                            style={{
                              '--progress-background': PAYMENT_COLORS[item.method] || PAYMENT_COLORS.OTHER 
                            } as React.CSSProperties}
                          />
                          <span className="text-xs text-muted-foreground w-10">
                            {item.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Installments breakdown for Credit Card */}
            {paymentMetrics.metrics.find(m => m.method === 'CREDIT_CARD')?.installmentBreakdown && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Distribuição de Parcelas (Cartão)</h4>
                {(() => {
                  const breakdown = paymentMetrics.metrics.find(m => m.method === 'CREDIT_CARD')?.installmentBreakdown || [];
                  const totalCount = breakdown.reduce((sum, b) => sum + b.count, 0);
                  const totalRevenue = breakdown.reduce((sum, b) => sum + b.revenue, 0);
                  const maxCount = Math.max(...breakdown.map(b => b.count));
                  const maxRevenue = Math.max(...breakdown.map(b => b.revenue));
                  
                  return (
                    <div className="space-y-4">
                      {/* Summary highlight */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                          <p className="text-xs text-muted-foreground mb-1">Parcela mais escolhida</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-primary">
                              {breakdown.find(b => b.count === maxCount)?.installments}x
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({((maxCount / totalCount) * 100).toFixed(0)}% das vendas)
                            </span>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                          <p className="text-xs text-muted-foreground mb-1">Maior faturamento</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {breakdown.find(b => b.revenue === maxRevenue)?.installments}x
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({formatCurrency(maxRevenue)})
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Detailed breakdown */}
                      <div className="space-y-2">
                        {breakdown.map(({ installments, count, revenue }) => {
                          const countPercentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                          const isMaxCount = count === maxCount;
                          const isMaxRevenue = revenue === maxRevenue;
                          
                          return (
                            <div 
                              key={installments} 
                              className={cn(
                                "p-3 rounded-lg border transition-all",
                                isMaxCount 
                                  ? "bg-primary/10 border-primary/30" 
                                  : "bg-muted/20 border-border/50"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-lg font-bold",
                                    isMaxCount && "text-primary"
                                  )}>
                                    {installments}x
                                  </span>
                                  {isMaxCount && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                      Mais escolhida
                                    </span>
                                  )}
                                  {isMaxRevenue && !isMaxCount && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                                      Maior receita
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold">{count}</span>
                                  <span className="text-muted-foreground text-sm ml-1">vendas</span>
                                  <span className="text-muted-foreground mx-2">•</span>
                                  <span className={cn(
                                    "font-semibold",
                                    isMaxRevenue && "text-green-600 dark:text-green-400"
                                  )}>
                                    {formatCurrency(revenue)}
                                  </span>
                                </div>
                              </div>
                              <div className="relative">
                                <Progress 
                                  value={countPercentage} 
                                  className="h-2"
                                />
                                <span className="absolute right-0 -top-5 text-xs text-muted-foreground">
                                  {countPercentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <ChartContainer config={chartConfig} className="h-[400px]">
            <PieChart>
              <Pie
                data={paymentMetrics.metrics}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="sales"
                label={({ method, percentage }) => `${PAYMENT_LABELS[method] || method} (${percentage.toFixed(0)}%)`}
              >
                {paymentMetrics.metrics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.method] || PAYMENT_COLORS.OTHER} />
                ))}
              </Pie>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover p-3 rounded-lg border shadow-md">
                        <p className="font-semibold">{PAYMENT_LABELS[data.method] || data.method}</p>
                        <p className="text-sm text-muted-foreground">Produtos Vendidos: {data.sales}</p>
                        <p className="text-sm text-muted-foreground">Receita: {formatCurrency(data.revenue)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ChartContainer>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PaymentMethodAnalysis;
