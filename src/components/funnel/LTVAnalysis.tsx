import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, ShoppingCart, Award, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DashboardSale {
  transaction: string;
  product: string;
  buyer: string;
  value: number;
  status: string;
  date: string;
  offerCode?: string;
}

interface LTVAnalysisProps {
  salesData: DashboardSale[];
  funnelOfferCodes: string[];
  selectedFunnel: string;
}

interface CustomerLTV {
  buyer: string;
  totalSpent: number;
  purchaseCount: number;
  firstPurchase: string;
  lastPurchase: string;
  avgOrderValue: number;
  products: string[];
  daysSinceFirst: number;
}

const LTVAnalysis = ({ salesData, funnelOfferCodes, selectedFunnel }: LTVAnalysisProps) => {
  // Filter sales by funnel offer codes
  const funnelSales = useMemo(() => {
    return salesData.filter(sale => 
      funnelOfferCodes.includes(sale.offerCode || '')
    );
  }, [salesData, funnelOfferCodes]);

  // Calculate LTV metrics per customer
  const customerLTVData = useMemo((): CustomerLTV[] => {
    const customerMap: Record<string, CustomerLTV> = {};

    funnelSales.forEach(sale => {
      const buyer = sale.buyer || 'Desconhecido';
      
      if (!customerMap[buyer]) {
        customerMap[buyer] = {
          buyer,
          totalSpent: 0,
          purchaseCount: 0,
          firstPurchase: sale.date,
          lastPurchase: sale.date,
          avgOrderValue: 0,
          products: [],
          daysSinceFirst: 0,
        };
      }

      customerMap[buyer].totalSpent += sale.value || 0;
      customerMap[buyer].purchaseCount += 1;
      
      if (new Date(sale.date) < new Date(customerMap[buyer].firstPurchase)) {
        customerMap[buyer].firstPurchase = sale.date;
      }
      if (new Date(sale.date) > new Date(customerMap[buyer].lastPurchase)) {
        customerMap[buyer].lastPurchase = sale.date;
      }
      
      if (!customerMap[buyer].products.includes(sale.product)) {
        customerMap[buyer].products.push(sale.product);
      }
    });

    // Calculate averages and days
    return Object.values(customerMap).map(customer => {
      const firstDate = new Date(customer.firstPurchase);
      const today = new Date();
      const daysSinceFirst = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...customer,
        avgOrderValue: customer.totalSpent / customer.purchaseCount,
        daysSinceFirst,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [funnelSales]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalCustomers = customerLTVData.length;
    const totalRevenue = customerLTVData.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    
    const repeatCustomers = customerLTVData.filter(c => c.purchaseCount > 1).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    const avgPurchasesPerCustomer = totalCustomers > 0 
      ? customerLTVData.reduce((sum, c) => sum + c.purchaseCount, 0) / totalCustomers 
      : 0;

    // Segment customers by LTV
    const sortedByLTV = [...customerLTVData].sort((a, b) => b.totalSpent - a.totalSpent);
    const top20Percent = Math.ceil(totalCustomers * 0.2);
    const top20Customers = sortedByLTV.slice(0, top20Percent);
    const top20Revenue = top20Customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const top20Contribution = totalRevenue > 0 ? (top20Revenue / totalRevenue) * 100 : 0;

    return {
      totalCustomers,
      avgLTV,
      repeatRate,
      avgPurchasesPerCustomer,
      top20Contribution,
      repeatCustomers,
    };
  }, [customerLTVData]);

  // LTV Segments
  const ltvSegments = useMemo(() => {
    if (customerLTVData.length === 0) return [];

    const sortedByLTV = [...customerLTVData].sort((a, b) => b.totalSpent - a.totalSpent);
    const totalCustomers = sortedByLTV.length;
    
    // Calculate segment boundaries based on LTV
    const maxLTV = sortedByLTV[0]?.totalSpent || 0;
    const avgLTV = summaryMetrics.avgLTV;

    const segments = [
      {
        name: 'VIP',
        description: 'Top 10% - Clientes mais valiosos',
        customers: sortedByLTV.slice(0, Math.ceil(totalCustomers * 0.1)),
        color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
        icon: Award,
      },
      {
        name: 'Premium',
        description: 'Top 10-30% - Alto valor',
        customers: sortedByLTV.slice(Math.ceil(totalCustomers * 0.1), Math.ceil(totalCustomers * 0.3)),
        color: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
        icon: TrendingUp,
      },
      {
        name: 'Regular',
        description: '30-70% - Valor médio',
        customers: sortedByLTV.slice(Math.ceil(totalCustomers * 0.3), Math.ceil(totalCustomers * 0.7)),
        color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        icon: Users,
      },
      {
        name: 'Básico',
        description: 'Bottom 30% - Baixo valor',
        customers: sortedByLTV.slice(Math.ceil(totalCustomers * 0.7)),
        color: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
        icon: ShoppingCart,
      },
    ];

    return segments.map(segment => ({
      ...segment,
      count: segment.customers.length,
      totalRevenue: segment.customers.reduce((sum, c) => sum + c.totalSpent, 0),
      avgLTV: segment.customers.length > 0 
        ? segment.customers.reduce((sum, c) => sum + c.totalSpent, 0) / segment.customers.length 
        : 0,
    }));
  }, [customerLTVData, summaryMetrics.avgLTV]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (funnelSales.length === 0) {
    return (
      <Card className="p-8 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Sem dados de LTV disponíveis
        </h3>
        <p className="text-muted-foreground">
          Não há vendas suficientes para calcular o LTV dos clientes neste funil.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">LTV Médio</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summaryMetrics.avgLTV)}</p>
              <p className="text-xs text-muted-foreground">por cliente</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Recompra</p>
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.repeatRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{summaryMetrics.repeatCustomers} clientes recorrentes</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Compras por Cliente</p>
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.avgPurchasesPerCustomer.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">média de produtos</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Top 20% Clientes</p>
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.top20Contribution.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">da receita total</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <Award className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* LTV Segments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Segmentação por LTV</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ltvSegments.map(segment => {
            const Icon = segment.icon;
            return (
              <div
                key={segment.name}
                className={`p-4 rounded-lg border ${segment.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{segment.name}</span>
                </div>
                <p className="text-xs opacity-80 mb-3">{segment.description}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Clientes:</span>
                    <span className="font-medium">{segment.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>LTV Médio:</span>
                    <span className="font-medium">{formatCurrency(segment.avgLTV)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Receita:</span>
                    <span className="font-medium">{formatCurrency(segment.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Customers Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Top 20 Clientes por LTV</h3>
          <Badge variant="secondary">{customerLTVData.length} clientes total</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">LTV Total</TableHead>
                <TableHead className="text-center">Compras</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead>Primeira Compra</TableHead>
                <TableHead>Última Compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerLTVData.slice(0, 20).map((customer, index) => (
                <TableRow key={customer.buyer}>
                  <TableCell className="font-medium">
                    {index < 3 ? (
                      <Badge 
                        className={
                          index === 0 ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' :
                          index === 1 ? 'bg-gray-300/30 text-gray-600 border-gray-400/30' :
                          'bg-amber-600/20 text-amber-700 border-amber-600/30'
                        }
                      >
                        {index + 1}º
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {customer.buyer}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(customer.totalSpent)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{customer.purchaseCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(customer.avgOrderValue)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{customer.products.length}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(customer.firstPurchase)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(customer.lastPurchase)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Insights Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Insights de LTV
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Concentração de Receita:</strong> Os top 20% dos clientes 
              representam {summaryMetrics.top20Contribution.toFixed(0)}% da receita total.
              {summaryMetrics.top20Contribution > 60 && (
                <span className="text-yellow-600 dark:text-yellow-400"> Alta dependência dos top clientes.</span>
              )}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Taxa de Recompra:</strong> {summaryMetrics.repeatRate.toFixed(1)}% 
              dos clientes compraram mais de uma vez.
              {summaryMetrics.repeatRate < 20 ? (
                <span className="text-red-600 dark:text-red-400"> Oportunidade de melhorar retenção.</span>
              ) : summaryMetrics.repeatRate > 40 ? (
                <span className="text-green-600 dark:text-green-400"> Excelente retenção!</span>
              ) : null}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Estratégia Sugerida:</strong>
              {summaryMetrics.avgPurchasesPerCustomer < 2 ? (
                <span> Foque em cross-sell e upsell para aumentar compras por cliente.</span>
              ) : (
                <span> Continue nutrindo clientes recorrentes e ative os de compra única.</span>
              )}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Potencial de Crescimento:</strong> Se aumentar o LTV médio 
              em 10%, a receita adicional seria de aproximadamente {formatCurrency(summaryMetrics.avgLTV * summaryMetrics.totalCustomers * 0.1)}.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LTVAnalysis;
