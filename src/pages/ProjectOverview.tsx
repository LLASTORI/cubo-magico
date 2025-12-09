import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Calendar,
  LogOut,
  Settings,
  Lock,
  Facebook,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CuboBrand } from "@/components/CuboLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import ProjectSelector from "@/components/ProjectSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { CubeLoader } from "@/components/CubeLoader";
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const CATEGORY_COLORS: Record<string, string> = {
  'funnel_ads': 'hsl(var(--chart-1))',
  'funnel_no_ads': 'hsl(var(--chart-2))',
  'unidentified_origin': 'hsl(var(--chart-3))',
  'other_origin': 'hsl(var(--chart-4))',
};

const ProjectOverview = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentProject, credentials } = useProject();
  const { userRole } = useProjectMembers(currentProject?.id || '');
  
  const canAccessOfferMappings = userRole === 'owner' || userRole === 'manager';

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
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

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
    fill: CATEGORY_COLORS[cat.category] || 'hsl(var(--chart-5))',
  }));

  // Balance chart data
  const balanceChartData = monthlyBalance.map(item => ({
    month: format(new Date(item.month + '-01'), 'MMM/yy', { locale: ptBR }),
    receita: item.revenue,
    investimento: item.spend,
    lucro: item.profit,
    acumulado: item.accumulatedProfit,
  }));

  const chartConfig = {
    receita: { label: "Receita", color: "hsl(var(--chart-1))" },
    investimento: { label: "Investimento", color: "hsl(var(--chart-2))" },
    lucro: { label: "Lucro", color: "hsl(var(--chart-3))" },
    acumulado: { label: "Acumulado", color: "hsl(var(--chart-4))" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CuboBrand size="md" />
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {currentProject.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Visão Geral do Projeto
                </p>
              </div>
              <ProjectSelector />
            </div>
            <div className="flex gap-2 items-center">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Vendas
              </Button>
              <Button
                onClick={() => navigate('/funnel-analysis')}
                variant="outline"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Análise de Funil
              </Button>
              <Button
                onClick={() => navigate('/meta-ads')}
                variant="outline"
                className="gap-2"
              >
                <Facebook className="w-4 h-4" />
                Meta Ads
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={() => canAccessOfferMappings && navigate('/offer-mappings')}
                        variant="outline"
                        className="gap-2"
                        disabled={!canAccessOfferMappings}
                      >
                        {!canAccessOfferMappings && <Lock className="w-4 h-4" />}
                        {canAccessOfferMappings && <Settings className="w-4 h-4" />}
                        Ofertas
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canAccessOfferMappings && (
                    <TooltipContent>
                      <p>Apenas proprietários e gerentes podem acessar</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <NotificationsDropdown />
              <ThemeToggle />
              <UserAvatar />
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Date Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visão Geral do Projeto</h1>
            <p className="text-muted-foreground">
              Análise consolidada de {format(new Date(startDate), "dd 'de' MMMM", { locale: ptBR })} a {format(new Date(endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="lastMonth">Mês anterior</SelectItem>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Faturamento Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(summaryMetrics.totalRevenue)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Investimento Ads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(summaryMetrics.totalSpend)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {summaryMetrics.profit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    Lucro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${summaryMetrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summaryMetrics.profit)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    ROAS Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${summaryMetrics.roas >= 2 ? 'text-green-600' : summaryMetrics.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {summaryMetrics.roas.toFixed(2)}x
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Total de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {summaryMetrics.totalSales}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category Analysis & Funnel ROAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Faturamento por Categoria
                  </CardTitle>
                  <CardDescription>
                    Distribuição do faturamento por origem das vendas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                    <p className="font-medium">{payload[0].name}</p>
                                    <p className="text-sm text-muted-foreground">
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
                    </div>
                    <div className="space-y-3">
                      {categoryMetrics.map((cat, index) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                              />
                              <span className="font-medium">{cat.label}</span>
                            </div>
                            <span className="text-muted-foreground">{cat.count} vendas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={cat.percentage} className="h-2 flex-1" />
                            <span className="text-sm font-medium w-20 text-right">
                              {formatCurrency(cat.revenue)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            {formatPercentage(cat.percentage)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Funnel ROAS Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    ROAS por Funil
                  </CardTitle>
                  <CardDescription>
                    Comparativo de retorno sobre investimento por funil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funil</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Investimento</TableHead>
                        <TableHead className="text-right">ROAS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funnelROAS.length > 0 ? (
                        <>
                          {funnelROAS.map((funnel) => (
                            <TableRow key={funnel.funnelId}>
                              <TableCell className="font-medium">{funnel.funnelName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(funnel.revenue)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(funnel.spend)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={funnel.roas >= 2 ? "default" : funnel.roas >= 1 ? "secondary" : "destructive"}>
                                  {funnel.roas.toFixed(2)}x
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>GERAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(generalROAS.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(generalROAS.spend)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={generalROAS.roas >= 2 ? "default" : generalROAS.roas >= 1 ? "secondary" : "destructive"}>
                                {generalROAS.roas.toFixed(2)}x
                              </Badge>
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
                </CardContent>
              </Card>
            </div>

            {/* Monthly Balance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Saldo Mensal Acumulado
                </CardTitle>
                <CardDescription>
                  Evolução mensal de receita, investimento e lucro acumulado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {balanceChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-80 w-full">
                    <ComposedChart data={balanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs fill-muted-foreground"
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => [formatCurrency(value as number), name]}
                          />
                        }
                      />
                      <Legend />
                      <Bar dataKey="receita" fill="hsl(var(--chart-1))" name="Receita" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="investimento" fill="hsl(var(--chart-2))" name="Investimento" radius={[4, 4, 0, 0]} />
                      <Line 
                        type="monotone" 
                        dataKey="acumulado" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={3}
                        name="Lucro Acumulado"
                        dot={{ fill: 'hsl(var(--chart-4))' }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Categoria</CardTitle>
                <CardDescription>
                  Métricas detalhadas de cada categoria de venda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryMetrics.length > 0 ? (
                      categoryMetrics.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                              />
                              <span className="font-medium">{cat.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{cat.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cat.revenue)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cat.count > 0 ? cat.revenue / cat.count : 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{formatPercentage(cat.percentage)}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum dado disponível para o período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default ProjectOverview;
