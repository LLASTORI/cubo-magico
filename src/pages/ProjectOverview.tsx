import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DollarSign, 
  TrendingUp, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Calendar,
  FolderOpen,
  ShoppingCart,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/AppHeader";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { CubeLoader } from "@/components/CubeLoader";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickSyncButton } from "@/components/QuickSyncButton";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  Line,
  Legend,
  Tooltip,
  ReferenceLine
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

const getRoasBadgeClass = (roas: number) => {
  if (roas >= 2) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (roas >= 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
};

const CATEGORY_COLORS: Record<string, string> = {
  'funnel_ads': '#3b82f6',           // Blue - Funil + Ads
  'funnel_no_ads': '#f97316',        // Orange - Funil sem Ads
  'unidentified_origin': '#64748b',  // Slate - Origem não identificada
  'other_origin': '#a855f7',         // Purple - Outras origens
  'affiliate': '#22c55e',            // Green - Afiliado
  'organic': '#06b6d4',              // Cyan - Orgânico
  'direct': '#eab308',               // Yellow - Direto
  'social': '#ec4899',               // Pink - Redes Sociais
  'email': '#14b8a6',                // Teal - Email Marketing
  'referral': '#8b5cf6',             // Violet - Indicação
  'paid_search': '#ef4444',          // Red - Busca Paga
  'default': '#6b7280',              // Gray - Padrão
};

const ProjectOverview = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // Date range state
  const [dateRange, setDateRange] = useState('30d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Update dates when range changes
  useEffect(() => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '30d':
        setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '90d':
        setStartDate(format(subDays(now, 90), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '180d':
        setStartDate(format(subDays(now, 180), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '365d':
        setStartDate(format(subDays(now, 365), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'all':
        setStartDate('2020-01-01');
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
    }
  }, [dateRange]);

  const { 
    categoryMetrics, 
    funnelROAS, 
    generalROAS,
    monthlyBalance,
    summaryMetrics,
    isLoading 
  } = useProjectOverview({
    projectId: currentProject?.id,
    startDate,
    endDate,
  });

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Selecione um projeto para visualizar a visão geral</p>
          <Button onClick={() => navigate('/projects')}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Ir para Projetos
          </Button>
        </div>
      </div>
    );
  }

  // Pie chart data
  const pieData = categoryMetrics.map(cat => ({
    name: cat.label,
    value: cat.revenue,
    fill: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.default,
  }));

  // Balance chart data
  const balanceChartData = monthlyBalance.map(item => ({
    month: format(new Date(item.month + '-01'), 'MMM/yy', { locale: ptBR }),
    receita: item.revenue,
    investimento: item.spend,
    lucro: item.profit,
    acumulado: item.accumulatedProfit,
    roas: item.spend > 0 ? item.revenue / item.spend : 0,
  }));

  const chartConfig = {
    investimento: { label: "Investimento", color: "hsl(210, 100%, 60%)" },
    receita: { label: "Receita", color: "hsl(30, 100%, 60%)" },
    lucro: { label: "Lucro", color: "hsl(142, 76%, 45%)" },
    roas: { label: "ROAS", color: "hsl(280, 100%, 70%)" },
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Hero Section */}
        <HeroSection startDate={startDate} endDate={endDate} />

        {/* Date Range Selector */}
        <div className="flex items-center justify-end gap-3">
          <QuickSyncButton />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-52 border-border/50 bg-card/50">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="180d">Últimos 6 meses</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="lastMonth">Mês anterior</SelectItem>
              <SelectItem value="year">Ano atual</SelectItem>
              <SelectItem value="all">Todo o histórico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <CubeLoader size="lg" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">Investimento</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-blue-400">
                    {formatCompactCurrency(summaryMetrics.totalSpend)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Faturamento</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-orange-400">
                    {formatCompactCurrency(summaryMetrics.totalRevenue)}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-${summaryMetrics.profit >= 0 ? 'green' : 'red'}-500/30 bg-gradient-to-br from-${summaryMetrics.profit >= 0 ? 'green' : 'red'}-500/10 to-transparent`}>
                <CardContent className="p-4">
                  <div className={`flex items-center gap-2 ${summaryMetrics.profit >= 0 ? 'text-green-400' : 'text-red-400'} mb-2`}>
                    {summaryMetrics.profit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium">Lucro</span>
                  </div>
                  <p className={`text-xl md:text-2xl font-bold ${summaryMetrics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCompactCurrency(summaryMetrics.profit)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-medium">ROAS</span>
                  </div>
                  <p className={`text-xl md:text-2xl font-bold ${summaryMetrics.roas >= 2 ? 'text-green-400' : summaryMetrics.roas >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {summaryMetrics.roas.toFixed(2)}x
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-xs font-medium">Vendas</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-purple-400">
                    {summaryMetrics.totalSales}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category Analysis & Funnel ROAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Category */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Faturamento por Categoria
                  </CardTitle>
                  <CardDescription>
                    Distribuição do faturamento por origem das vendas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-64 relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-orange-500/5 rounded-xl" />
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <defs>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                            </filter>
                          </defs>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            strokeWidth={2}
                            stroke="hsl(var(--background))"
                            style={{ filter: 'url(#shadow)' }}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                    <p className="font-medium text-foreground">{payload[0].name}</p>
                                    <p className="text-sm text-orange-400 font-semibold">
                                      {formatCurrency(payload[0].value as number)}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                      {/* Center text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold text-orange-400">{formatCompactCurrency(summaryMetrics.totalRevenue)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {categoryMetrics.map((cat) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                              />
                              <span className="font-medium text-foreground">{cat.label}</span>
                            </div>
                            <span className="text-muted-foreground">{cat.count} vendas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={cat.percentage} className="h-2 flex-1" />
                            <span className="text-sm font-medium w-24 text-right text-orange-400">
                              {formatCompactCurrency(cat.revenue)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            {cat.percentage.toFixed(1)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Funnel ROAS Comparison */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    ROAS por Funil
                  </CardTitle>
                  <CardDescription>
                    Comparativo de retorno sobre investimento por funil
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Funil</TableHead>
                          <TableHead className="text-right font-semibold">Investimento</TableHead>
                          <TableHead className="text-right font-semibold">Receita</TableHead>
                          <TableHead className="text-right font-semibold">ROAS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funnelROAS.length > 0 ? (
                          <>
                            {funnelROAS.map((funnel) => (
                              <TableRow key={funnel.funnelId} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium">{funnel.funnelName}</TableCell>
                                <TableCell className="text-right text-blue-400">{formatCompactCurrency(funnel.spend)}</TableCell>
                                <TableCell className="text-right text-orange-400">{formatCompactCurrency(funnel.revenue)}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoasBadgeClass(funnel.roas)}`}>
                                    {funnel.roas.toFixed(2)}x
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-primary/10 border-t-2 border-primary/30 font-bold">
                              <TableCell className="font-bold text-primary">GERAL</TableCell>
                              <TableCell className="text-right text-blue-400 font-bold">{formatCompactCurrency(generalROAS.spend)}</TableCell>
                              <TableCell className="text-right text-orange-400 font-bold">{formatCompactCurrency(generalROAS.revenue)}</TableCell>
                              <TableCell className="text-right">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getRoasBadgeClass(generalROAS.roas)}`}>
                                  {generalROAS.roas.toFixed(2)}x
                                </span>
                              </TableCell>
                            </TableRow>
                          </>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhum dado de funil disponível para o período
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Balance Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Evolução Mensal
                </CardTitle>
                <CardDescription>
                  Evolução mensal de receita, investimento e ROAS
                </CardDescription>
              </CardHeader>
              <CardContent>
                {balanceChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-80 w-full">
                    <ComposedChart data={balanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(value) => formatCompactCurrency(value)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(value) => `${value.toFixed(1)}x`}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-medium text-foreground mb-2">{data.month}</p>
                                <div className="space-y-1 text-sm">
                                  <p className="text-blue-400">Investimento: {formatCurrency(data.investimento)}</p>
                                  <p className="text-orange-400">Receita: {formatCurrency(data.receita)}</p>
                                  <p className={data.lucro >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    Lucro: {formatCurrency(data.lucro)}
                                  </p>
                                  <p className="text-purple-400">ROAS: {data.roas.toFixed(2)}x</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                      />
                      <ReferenceLine yAxisId="right" y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Break-even', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Bar yAxisId="left" dataKey="investimento" name="Investimento" fill="hsl(210, 100%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="receita" name="Receita" fill="hsl(30, 100%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="lucro" name="Lucro" fill="hsl(142, 76%, 45%)" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="hsl(280, 100%, 70%)" strokeWidth={3} dot={{ fill: 'hsl(280, 100%, 70%)', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ChartContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Details Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Detalhamento por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Categoria</TableHead>
                        <TableHead className="text-right font-semibold">Vendas</TableHead>
                        <TableHead className="text-right font-semibold">Faturamento</TableHead>
                        <TableHead className="text-right font-semibold">% do Total</TableHead>
                        <TableHead className="text-right font-semibold">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryMetrics.map((cat) => (
                        <TableRow key={cat.category} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                              />
                              <span className="font-medium">{cat.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-purple-400 font-medium">{cat.count}</TableCell>
                          <TableCell className="text-right text-orange-400 font-medium">{formatCompactCurrency(cat.revenue)}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-green-400 font-medium">
                            {formatCurrency(cat.count > 0 ? cat.revenue / cat.count : 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/10 border-t-2 border-primary/30 font-bold">
                        <TableCell className="font-bold text-primary">TOTAL</TableCell>
                        <TableCell className="text-right text-purple-400 font-bold">{summaryMetrics.totalSales}</TableCell>
                        <TableCell className="text-right text-orange-400 font-bold">{formatCompactCurrency(summaryMetrics.totalRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary">
                            100%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-green-400 font-bold">
                          {formatCurrency(summaryMetrics.totalSales > 0 ? summaryMetrics.totalRevenue / summaryMetrics.totalSales : 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default ProjectOverview;
