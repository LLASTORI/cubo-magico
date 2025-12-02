import { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, RefreshCw, CreditCard, Banknote, QrCode, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface PaymentMethodAnalysisProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
}

interface HotmartSale {
  purchase: {
    offer: { code: string };
    price: { value: number };
    status: string;
    payment: { 
      type: string;
      installments_number?: number;
    };
  };
  buyer: { email: string };
}

interface PaymentMetrics {
  method: string;
  icon: any;
  sales: number;
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

const PaymentMethodAnalysis = ({ selectedFunnel, funnelOfferCodes }: PaymentMethodAnalysisProps) => {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(today);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<HotmartSale[]>([]);

  const fetchDataFromAPI = async (): Promise<HotmartSale[]> => {
    const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    let allItems: HotmartSale[] = [];
    let nextPageToken: string | null = null;
    
    do {
      const params: any = { start_date: startUTC, end_date: endUTC, max_results: 500 };
      if (nextPageToken) params.page_token = nextPageToken;

      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: { endpoint: '/sales/history', params },
      });

      if (error) throw error;
      if (data?.items) allItems = [...allItems, ...data.items];
      nextPageToken = data?.page_info?.next_page_token || null;
    } while (nextPageToken);

    return allItems;
  };

  const paymentMetrics = useMemo(() => {
    const filtered = salesData.filter(sale => {
      const offerCode = sale.purchase?.offer?.code;
      const status = sale.purchase?.status;
      return funnelOfferCodes.includes(offerCode) && status === 'COMPLETE';
    });

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.purchase?.price?.value || 0), 0);

    const groups: Record<string, { 
      sales: number; 
      revenue: number;
      installments: Record<number, { count: number; revenue: number }>;
    }> = {};
    
    filtered.forEach(sale => {
      const method = sale.purchase?.payment?.type || 'OTHER';
      const installments = sale.purchase?.payment?.installments_number || 1;
      
      if (!groups[method]) {
        groups[method] = { sales: 0, revenue: 0, installments: {} };
      }
      groups[method].sales += 1;
      groups[method].revenue += sale.purchase?.price?.value || 0;

      if (!groups[method].installments[installments]) {
        groups[method].installments[installments] = { count: 0, revenue: 0 };
      }
      groups[method].installments[installments].count += 1;
      groups[method].installments[installments].revenue += sale.purchase?.price?.value || 0;
    });

    const metrics: PaymentMetrics[] = Object.entries(groups)
      .map(([method, data]) => ({
        method,
        icon: PAYMENT_ICONS[method] || Wallet,
        sales: data.sales,
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

    return { metrics, totalSales, totalRevenue };
  }, [salesData, funnelOfferCodes]);

  const loadData = async () => {
    if (funnelOfferCodes.length === 0) {
      toast.error('Nenhuma oferta configurada para este funil');
      return;
    }

    setLoading(true);
    try {
      const sales = await fetchDataFromAPI();
      setSalesData(sales);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFunnel && funnelOfferCodes.length > 0) {
      loadData();
    }
  }, [selectedFunnel, funnelOfferCodes.join(',')]);

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
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table */}
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {paymentMetrics.metrics
                    .find(m => m.method === 'CREDIT_CARD')
                    ?.installmentBreakdown?.map(({ installments, count, revenue }) => (
                      <div 
                        key={installments} 
                        className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center"
                      >
                        <p className="text-xs text-muted-foreground">{installments}x</p>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(revenue)}</p>
                      </div>
                    ))}
                </div>
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
      )}
    </Card>
  );
};

export default PaymentMethodAnalysis;
