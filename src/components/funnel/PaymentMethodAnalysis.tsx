import { useMemo } from "react";
import { CreditCard, Banknote, QrCode, Wallet, ShoppingBag, Users, DollarSign, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import MetricCard from "@/components/MetricCard";

interface SaleData {
  offer_code?: string | null;
  total_price_brl?: number | null;
  buyer_email?: string | null;
  payment_method?: string | null;
  installment_number?: number | null;
}

interface PaymentMethodAnalysisProps {
  salesData: SaleData[];
  funnelOfferCodes: string[];
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

const PaymentMethodAnalysis = ({ salesData, funnelOfferCodes }: PaymentMethodAnalysisProps) => {
  // Filter sales by funnel offer codes
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => 
      funnelOfferCodes.includes(sale.offer_code || '')
    );
  }, [salesData, funnelOfferCodes]);

  const paymentMetrics = useMemo(() => {
    if (filteredSales.length === 0) {
      return { metrics: [], totalSales: 0, totalRevenue: 0, uniqueCustomers: 0, avgTicket: 0 };
    }

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    
    // Calculate unique customers
    const uniqueEmails = new Set(filteredSales.map(sale => sale.buyer_email).filter(Boolean));
    const uniqueCustomers = uniqueEmails.size;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const groups: Record<string, { 
      sales: number; 
      revenue: number;
      customers: Set<string>;
      installments: Record<number, { count: number; revenue: number }>;
    }> = {};
    
    filteredSales.forEach(sale => {
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
  }, [filteredSales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const { metrics, totalSales, totalRevenue, uniqueCustomers, avgTicket } = paymentMetrics;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Análise por Método de Pagamento</h3>
        <p className="text-sm text-muted-foreground">Distribuição de vendas por PIX, cartão, boleto, etc</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Produtos Vendidos"
          value={totalSales}
          icon={ShoppingBag}
        />
        <MetricCard
          title="Clientes Únicos"
          value={uniqueCustomers}
          icon={Users}
        />
        <MetricCard
          title="Receita Total"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(avgTicket)}
          icon={TrendingUp}
        />
      </div>

      {metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <CreditCard className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma venda encontrada no período</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="p-4">
            <h4 className="font-medium mb-4">Distribuição por Método</h4>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={metrics}
                  dataKey="sales"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ method, percentage }) => `${PAYMENT_LABELS[method] || method}: ${percentage.toFixed(1)}%`}
                >
                  {metrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.method] || PAYMENT_COLORS['OTHER']} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </Card>

          {/* Table */}
          <Card className="p-4">
            <h4 className="font-medium mb-4">Detalhamento</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <TableRow key={metric.method}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: PAYMENT_COLORS[metric.method] }} />
                          <span>{PAYMENT_LABELS[metric.method] || metric.method}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{metric.sales}</TableCell>
                      <TableCell className="text-right">{formatCurrency(metric.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{metric.percentage.toFixed(1)}%</span>
                          <Progress value={metric.percentage} className="w-16 h-2" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Installment breakdown for credit card */}
      {metrics.find(m => m.method === 'CREDIT_CARD')?.installmentBreakdown && (
        <Card className="p-4 mt-6">
          <h4 className="font-medium mb-4">Parcelamento - Cartão de Crédito</h4>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={metrics.find(m => m.method === 'CREDIT_CARD')?.installmentBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="installments" 
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}x`}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="count" name="Vendas" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>
      )}
    </Card>
  );
};

export default PaymentMethodAnalysis;
