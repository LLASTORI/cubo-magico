import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useMonthlyAnalysis, MonthlyData, FunnelMonthlyData } from "@/hooks/useMonthlyAnalysis";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CubeLoader } from "@/components/CubeLoader";
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ComposedChart, Line, Legend, Tooltip, ReferenceLine } from "recharts";

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

const getRoasColor = (roas: number) => {
  if (roas >= 2) return 'text-green-500';
  if (roas >= 1) return 'text-yellow-500';
  return 'text-red-500';
};

const getRoasBadgeClass = (roas: number) => {
  if (roas >= 2) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (roas >= 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
};

interface MonthlyTableProps {
  data: MonthlyData[];
  totals: {
    investment: number;
    revenue: number;
    grossProfit: number;
    roas: number;
    sales: number;
  };
  title: string;
  showAgencyResult?: boolean;
}

const MonthlyTable = ({ data, totals, title, showAgencyResult }: MonthlyTableProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Mês</TableHead>
                <TableHead className="text-right font-semibold">Investimento</TableHead>
                <TableHead className="text-right font-semibold">Faturado</TableHead>
                <TableHead className="text-right font-semibold">Lucro Bruto</TableHead>
                <TableHead className="text-right font-semibold">ROAS</TableHead>
                {showAgencyResult && (
                  <TableHead className="text-right font-semibold">Result. Agência</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={row.month} 
                  className={`hover:bg-muted/30 transition-colors ${row.revenue === 0 && row.investment === 0 ? 'opacity-50' : ''}`}
                >
                  <TableCell className="font-medium capitalize">{row.monthLabel}</TableCell>
                  <TableCell className="text-right text-blue-400">{formatCurrency(row.investment)}</TableCell>
                  <TableCell className="text-right text-orange-400">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className={`text-right ${row.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(row.grossProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoasBadgeClass(row.roas)}`}>
                      {row.roas.toFixed(2)}
                    </span>
                  </TableCell>
                  {showAgencyResult && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(row.grossProfit * 0.1)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-primary/10 border-t-2 border-primary/30 font-bold">
                <TableCell className="font-bold text-primary">TOTAL</TableCell>
                <TableCell className="text-right text-blue-400 font-bold">{formatCurrency(totals.investment)}</TableCell>
                <TableCell className="text-right text-orange-400 font-bold">{formatCurrency(totals.revenue)}</TableCell>
                <TableCell className={`text-right font-bold ${totals.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(totals.grossProfit)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getRoasBadgeClass(totals.roas)}`}>
                    {totals.roas.toFixed(2)}
                  </span>
                </TableCell>
                {showAgencyResult && (
                  <TableCell className="text-right text-primary font-bold">
                    {formatCurrency(totals.grossProfit * 0.1)}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

interface MonthlyChartProps {
  data: MonthlyData[];
  title: string;
}

const MonthlyChart = ({ data, title }: MonthlyChartProps) => {
  const chartData = data.map(d => ({
    name: d.monthLabel.substring(0, 3),
    investimento: d.investment,
    faturado: d.revenue,
    lucro: d.grossProfit,
    roas: d.roas,
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis 
                yAxisId="left" 
                tickFormatter={(v) => formatCompactCurrency(v)}
                className="text-xs"
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 'auto']}
                className="text-xs"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'roas') return [value.toFixed(2), 'ROAS'];
                  return [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)];
                }}
              />
              <Legend />
              <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar yAxisId="left" dataKey="investimento" fill="hsl(217, 91%, 60%)" name="Investimento" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="faturado" fill="hsl(25, 95%, 53%)" name="Faturado" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="lucro" fill="hsl(48, 96%, 53%)" name="Lucro" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="roas" stroke="hsl(142, 76%, 36%)" strokeWidth={3} dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2 }} name="ROAS" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const RoasChart = ({ data }: { data: MonthlyData[] }) => {
  const chartData = data.map(d => ({
    name: d.monthLabel.substring(0, 3),
    roas: d.roas,
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">ROAS por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis domain={[0, 'auto']} className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [value.toFixed(2), 'ROAS']}
              />
              <ReferenceLine y={1} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'Break-even', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <ReferenceLine y={2} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" label={{ value: 'Meta', fill: 'hsl(142, 76%, 36%)', fontSize: 10 }} />
              <Line type="monotone" dataKey="roas" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const AnaliseMensal = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all');

  const { generalMonthlyData, funnelMonthlyData, generalTotals, isLoading, funnels } = useMonthlyAnalysis({
    projectId: currentProject?.id,
    year: selectedYear,
  });

  // Generate year options (last 3 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Nenhum projeto selecionado</p>
        <button onClick={() => navigate('/projects')} className="text-primary hover:underline">
          Ir para projetos
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Análise Mensal" />
        <div className="flex items-center justify-center h-[60vh]">
          <CubeLoader message="Carregando dados mensais..." />
        </div>
      </div>
    );
  }

  const selectedFunnelData = selectedFunnel !== 'all' 
    ? funnelMonthlyData.find(f => f.funnelId === selectedFunnel)
    : null;

  const displayData = selectedFunnelData?.months || generalMonthlyData;
  const displayTotals = selectedFunnelData?.totals || generalTotals;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Análise Mensal" />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header with filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Índices Mensais</h1>
            <p className="text-muted-foreground">Análise detalhada mês a mês do seu projeto</p>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os funis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Visão Geral (Todos)</SelectItem>
                {funnels?.map(funnel => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Investimento</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{formatCompactCurrency(displayTotals.investment)}</p>
            </CardContent>
          </Card>
          
          <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Faturamento</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{formatCompactCurrency(displayTotals.revenue)}</p>
            </CardContent>
          </Card>
          
          <Card className={`border-${displayTotals.grossProfit >= 0 ? 'green' : 'red'}-500/30 bg-gradient-to-br from-${displayTotals.grossProfit >= 0 ? 'green' : 'red'}-500/10 to-transparent`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 ${displayTotals.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'} mb-2`}>
                {displayTotals.grossProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-xs font-medium">Lucro Bruto</span>
              </div>
              <p className={`text-2xl font-bold ${displayTotals.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCompactCurrency(displayTotals.grossProfit)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">ROAS Médio</span>
              </div>
              <p className={`text-2xl font-bold ${getRoasColor(displayTotals.roas)}`}>
                {displayTotals.roas.toFixed(2)}x
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs font-medium">Vendas</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{displayTotals.sales}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-1">
            <MonthlyTable 
              data={displayData} 
              totals={displayTotals} 
              title={selectedFunnel === 'all' ? 'Índices Gerais' : selectedFunnelData?.funnelName || 'Índices'}
            />
          </div>
          <div className="xl:col-span-2 space-y-6">
            <MonthlyChart 
              data={displayData} 
              title="Investimento, Faturamento e Lucro" 
            />
            <RoasChart data={displayData} />
          </div>
        </div>

        {/* Per-Funnel Breakdown (when showing all) */}
        {selectedFunnel === 'all' && funnelMonthlyData.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
              Detalhamento por Funil
            </h2>
            
            <Tabs defaultValue={funnelMonthlyData[0]?.funnelId} className="w-full">
              <TabsList className="mb-4 flex-wrap h-auto gap-2">
                {funnelMonthlyData.map(funnel => (
                  <TabsTrigger 
                    key={funnel.funnelId} 
                    value={funnel.funnelId}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {funnel.funnelName}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getRoasBadgeClass(funnel.totals.roas)}`}>
                      {funnel.totals.roas.toFixed(2)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {funnelMonthlyData.map(funnel => (
                <TabsContent key={funnel.funnelId} value={funnel.funnelId}>
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-1">
                      <MonthlyTable 
                        data={funnel.months} 
                        totals={funnel.totals} 
                        title={`Índices - ${funnel.funnelName}`}
                        showAgencyResult={funnel.funnelType === 'perpetuo'}
                      />
                    </div>
                    <div className="xl:col-span-2 space-y-6">
                      <MonthlyChart 
                        data={funnel.months} 
                        title={`${funnel.funnelName} - Investimento, Faturamento e Lucro`}
                      />
                      <RoasChart data={funnel.months} />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnaliseMensal;
