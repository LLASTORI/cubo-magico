import { useMemo, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingDown, 
  Clock, 
  Package,
  AlertTriangle,
  RotateCcw,
  XCircle,
  DollarSign,
  Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { CubeLoader } from '@/components/CubeLoader';

interface RecoveryAnalyticsProps {
  startDate: string;
  endDate: string;
}

const STATUS_CONFIG = {
  REFUNDED: { label: 'Reembolsado', color: '#eab308', icon: RotateCcw },
  CANCELLED: { label: 'Cancelado', color: '#f97316', icon: XCircle },
  CHARGEBACK: { label: 'Chargeback', color: '#ef4444', icon: AlertTriangle },
} as const;

type NegativeStatus = keyof typeof STATUS_CONFIG;
type StatusFilter = NegativeStatus | 'ALL';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function RecoveryAnalytics({ startDate, endDate }: RecoveryAnalyticsProps) {
  const { currentProject } = useProject();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Fetch all negative transactions with product info
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['recovery-analytics', currentProject?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const startDateTime = new Date(startDate).toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();
      
      let allTransactions: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_transactions')
          .select('id, product_name, product_code, offer_code, offer_name, status, transaction_date, confirmation_date, total_price, total_price_brl')
          .eq('project_id', currentProject.id)
          .in('status', ['REFUNDED', 'CANCELLED', 'CHARGEBACK'])
          .gte('transaction_date', startDateTime)
          .lte('transaction_date', endDateTime)
          .order('transaction_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allTransactions = [...allTransactions, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allTransactions;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch all approved transactions for calculating rates
  const { data: approvedTransactions = [] } = useQuery({
    queryKey: ['recovery-analytics-approved', currentProject?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const startDateTime = new Date(startDate).toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();
      
      let allTransactions: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_transactions')
          .select('id, product_name, product_code, status, transaction_date')
          .eq('project_id', currentProject.id)
          .in('status', ['APPROVED', 'COMPLETE'])
          .gte('transaction_date', startDateTime)
          .lte('transaction_date', endDateTime)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allTransactions = [...allTransactions, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allTransactions;
    },
    enabled: !!currentProject?.id,
  });

  // Calculate product ranking with all metrics
  const productRanking = useMemo(() => {
    const productMap = new Map<string, {
      name: string;
      code: string;
      refunds: number;
      cancellations: number;
      chargebacks: number;
      totalNegative: number;
      totalLost: number;
      totalApproved: number;
      avgDaysToRefund: number[];
    }>();

    // Count negative transactions per product
    transactions.forEach(tx => {
      const key = tx.product_code || tx.product_name;
      const existing = productMap.get(key) || {
        name: tx.product_name,
        code: tx.product_code || '',
        refunds: 0,
        cancellations: 0,
        chargebacks: 0,
        totalNegative: 0,
        totalLost: 0,
        totalApproved: 0,
        avgDaysToRefund: [],
      };

      const value = tx.total_price_brl || tx.total_price || 0;

      if (tx.status === 'REFUNDED') {
        existing.refunds++;
        // Calculate days to refund if we have confirmation_date
        if (tx.confirmation_date && tx.transaction_date) {
          const days = differenceInDays(
            new Date(tx.confirmation_date),
            new Date(tx.transaction_date)
          );
          if (days >= 0) existing.avgDaysToRefund.push(days);
        }
      } else if (tx.status === 'CANCELLED') {
        existing.cancellations++;
      } else if (tx.status === 'CHARGEBACK') {
        existing.chargebacks++;
      }

      existing.totalNegative++;
      existing.totalLost += value;
      productMap.set(key, existing);
    });

    // Count approved transactions per product
    approvedTransactions.forEach(tx => {
      const key = tx.product_code || tx.product_name;
      const existing = productMap.get(key);
      if (existing) {
        existing.totalApproved++;
      }
    });

    // Convert to array and calculate rates
    return Array.from(productMap.values())
      .map(p => ({
        ...p,
        rate: p.totalApproved > 0 ? ((p.totalNegative / (p.totalApproved + p.totalNegative)) * 100) : 0,
        avgDays: p.avgDaysToRefund.length > 0 
          ? Math.round(p.avgDaysToRefund.reduce((a, b) => a + b, 0) / p.avgDaysToRefund.length)
          : null,
      }))
      .sort((a, b) => b.totalLost - a.totalLost);
  }, [transactions, approvedTransactions]);

  // Calculate overall stats by status
  const statusStats = useMemo(() => {
    const stats = {
      REFUNDED: { count: 0, value: 0, avgDays: [] as number[] },
      CANCELLED: { count: 0, value: 0 },
      CHARGEBACK: { count: 0, value: 0 },
    };

    transactions.forEach(tx => {
      const status = tx.status as NegativeStatus;
      const value = tx.total_price_brl || tx.total_price || 0;
      
      if (stats[status]) {
        stats[status].count++;
        stats[status].value += value;
        
        if (status === 'REFUNDED' && tx.confirmation_date && tx.transaction_date) {
          const days = differenceInDays(
            new Date(tx.confirmation_date),
            new Date(tx.transaction_date)
          );
          if (days >= 0) (stats.REFUNDED as any).avgDays.push(days);
        }
      }
    });

    const refundAvgDays = stats.REFUNDED.avgDays.length > 0
      ? Math.round(stats.REFUNDED.avgDays.reduce((a, b) => a + b, 0) / stats.REFUNDED.avgDays.length)
      : null;

    return { ...stats, refundAvgDays };
  }, [transactions]);

  // Calculate temporal evolution (last 6 months)
  const temporalData = useMemo(() => {
    const end = new Date(endDate);
    const start = subMonths(startOfMonth(end), 5);
    const months = eachMonthOfInterval({ start, end: startOfMonth(end) });

    return months.map(month => {
      const monthStart = month;
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthTx = transactions.filter(tx => {
        const txDate = new Date(tx.transaction_date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const refunds = monthTx.filter(tx => tx.status === 'REFUNDED').length;
      const cancellations = monthTx.filter(tx => tx.status === 'CANCELLED').length;
      const chargebacks = monthTx.filter(tx => tx.status === 'CHARGEBACK').length;
      const totalValue = monthTx.reduce((sum, tx) => sum + (tx.total_price_brl || tx.total_price || 0), 0);

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        refunds,
        cancellations,
        chargebacks,
        total: refunds + cancellations + chargebacks,
        value: totalValue,
      };
    });
  }, [transactions, endDate]);

  // Total stats
  const totals = useMemo(() => {
    const totalLost = transactions.reduce((sum, tx) => sum + (tx.total_price_brl || tx.total_price || 0), 0);
    const totalNegative = transactions.length;
    const totalApproved = approvedTransactions.length;
    const overallRate = totalApproved > 0 
      ? ((totalNegative / (totalApproved + totalNegative)) * 100).toFixed(1)
      : '0';

    return { totalLost, totalNegative, totalApproved, overallRate };
  }, [transactions, approvedTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CubeLoader size="md" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <DollarSign className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(totals.totalLost)}</p>
                      <p className="text-sm text-muted-foreground">Valor total perdido</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Soma de todos os valores de reembolsos, cancelamentos e chargebacks no período</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totals.overallRate}%</p>
                      <p className="text-sm text-muted-foreground">Taxa geral de perda</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentual de transações negativas em relação ao total de transações</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {statusStats.refundAvgDays !== null ? `${statusStats.refundAvgDays} dias` : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Tempo médio até reembolso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Média de dias entre a compra e o reembolso</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{productRanking.length}</p>
                      <p className="text-sm text-muted-foreground">Produtos com perdas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quantidade de produtos distintos que tiveram transações negativas</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Status Breakdown - Clickable */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* All statuses option */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                  statusFilter === 'ALL' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setStatusFilter('ALL')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <TrendingDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Todos</p>
                        <p className="text-2xl font-bold">{totals.totalNegative}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-semibold">{formatCurrency(totals.totalLost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clique para ver todos os status na tabela</p>
            </TooltipContent>
          </Tooltip>

          {(Object.keys(STATUS_CONFIG) as NegativeStatus[]).map(status => {
            const config = STATUS_CONFIG[status];
            const stats = statusStats[status];
            const Icon = config.icon;
            const tooltipTexts: Record<NegativeStatus, string> = {
              REFUNDED: 'Clique para filtrar apenas reembolsos na tabela',
              CANCELLED: 'Clique para filtrar apenas cancelamentos na tabela',
              CHARGEBACK: 'Clique para filtrar apenas chargebacks na tabela',
            };
            
            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <Card 
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                      statusFilter === status ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setStatusFilter(status)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg" 
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: config.color }} />
                          </div>
                          <div>
                            <p className="font-medium">{config.label}</p>
                            <p className="text-2xl font-bold">{stats.count}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Valor</p>
                          <p className="font-semibold">{formatCurrency(stats.value)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipTexts[status]}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

      {/* Temporal Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução Temporal
          </CardTitle>
          <CardDescription>
            Quantidade de ocorrências por mês nos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      refunds: 'Reembolsos',
                      cancellations: 'Cancelamentos',
                      chargebacks: 'Chargebacks',
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      refunds: 'Reembolsos',
                      cancellations: 'Cancelamentos',
                      chargebacks: 'Chargebacks',
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar dataKey="refunds" fill="#eab308" stackId="a" />
                <Bar dataKey="cancellations" fill="#f97316" stackId="a" />
                <Bar dataKey="chargebacks" fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Ranking Table - Filtered */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Ranking de Produtos com Maior Prejuízo
            {statusFilter !== 'ALL' && (
              <Badge variant="secondary" className="ml-2">
                {STATUS_CONFIG[statusFilter].label}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Produtos ordenados pelo valor total perdido
            {statusFilter !== 'ALL' && ' (filtrado por status)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            // Filter and recalculate based on selected status
            const filteredRanking = statusFilter === 'ALL' 
              ? productRanking 
              : productRanking
                  .map(p => {
                    let count = 0;
                    let value = 0;
                    
                    // Recalculate based on filter
                    if (statusFilter === 'REFUNDED') {
                      count = p.refunds;
                    } else if (statusFilter === 'CANCELLED') {
                      count = p.cancellations;
                    } else if (statusFilter === 'CHARGEBACK') {
                      count = p.chargebacks;
                    }
                    
                    // Calculate proportional value based on count ratio
                    const ratio = p.totalNegative > 0 ? count / p.totalNegative : 0;
                    value = p.totalLost * ratio;
                    
                    return {
                      ...p,
                      filteredCount: count,
                      filteredValue: value,
                    };
                  })
                  .filter(p => p.filteredCount > 0)
                  .sort((a, b) => b.filteredValue - a.filteredValue);

            if (filteredRanking.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de perda encontrado no período selecionado.
                </div>
              );
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto</TableHead>
                    {statusFilter === 'ALL' ? (
                      <>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center justify-center gap-1 cursor-help">
                                <RotateCcw className="h-3 w-3 text-yellow-500" />
                                Reemb.
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Quantidade de reembolsos solicitados pelo cliente</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center justify-center gap-1 cursor-help">
                                <XCircle className="h-3 w-3 text-orange-500" />
                                Cancel.
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Quantidade de cancelamentos de compra</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center justify-center gap-1 cursor-help">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                Chargebacks
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Contestações de cobrança junto ao cartão de crédito</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">Total Negativo</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Soma de todos os status negativos (reembolsos + cancelamentos + chargebacks)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      </>
                    ) : (
                      <TableHead className="text-center">Quantidade</TableHead>
                    )}
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">Taxa de Perda</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Taxa de Perda do Produto</p>
                          <p className="text-xs text-muted-foreground">
                            Fórmula: (Cancelamentos + Reembolsos + Chargebacks) ÷ Total de Vendas deste produto × 100
                          </p>
                          <p className="text-xs mt-1">
                            Exemplo: Se um produto teve 10 vendas aprovadas e 2 cancelamentos, a taxa é 16,7% (2÷12×100)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    {(statusFilter === 'ALL' || statusFilter === 'REFUNDED') && (
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Tempo Médio</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Média de dias entre a compra e o reembolso</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">Valor Perdido</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Soma total dos valores das transações negativas</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRanking.slice(0, 20).map((product, index) => (
                    <TableRow key={product.code || product.name}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                          {product.code && (
                            <p className="text-xs text-muted-foreground">{product.code}</p>
                          )}
                        </div>
                      </TableCell>
                      {statusFilter === 'ALL' ? (
                        <>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              {product.refunds}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                              {product.cancellations}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                              {product.chargebacks}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {product.totalNegative}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            style={{ 
                              backgroundColor: `${STATUS_CONFIG[statusFilter].color}15`,
                              color: STATUS_CONFIG[statusFilter].color,
                              borderColor: `${STATUS_CONFIG[statusFilter].color}30`
                            }}
                          >
                            {'filteredCount' in product ? (product as any).filteredCount : 0}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={
                            product.rate > 10 
                              ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                              : product.rate > 5 
                                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                : 'bg-green-500/10 text-green-600 border-green-500/20'
                          }
                        >
                          {product.rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      {(statusFilter === 'ALL' || statusFilter === 'REFUNDED') && (
                        <TableCell className="text-center text-muted-foreground">
                          {product.avgDays !== null ? `${product.avgDays}d` : '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(statusFilter === 'ALL' ? product.totalLost : ('filteredValue' in product ? (product as any).filteredValue as number : 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}
