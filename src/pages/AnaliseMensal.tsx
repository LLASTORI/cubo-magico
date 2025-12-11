import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useMonthlyAnalysis, MonthlyData, FunnelMonthlyData } from "@/hooks/useMonthlyAnalysis";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CubeLoader } from "@/components/CubeLoader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, BarChart3, GitCompare, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
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

const getVariationIndicator = (current: number, previous: number) => {
  if (previous === 0) return { icon: Minus, color: 'text-muted-foreground', value: 'N/A' };
  const variation = ((current - previous) / previous) * 100;
  if (variation > 0) return { icon: ArrowUpRight, color: 'text-green-400', value: `+${variation.toFixed(1)}%` };
  if (variation < 0) return { icon: ArrowDownRight, color: 'text-red-400', value: `${variation.toFixed(1)}%` };
  return { icon: Minus, color: 'text-muted-foreground', value: '0%' };
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

interface ComparisonTableProps {
  currentData: MonthlyData[];
  previousData: MonthlyData[];
  currentTotals: { investment: number; revenue: number; grossProfit: number; roas: number; sales: number };
  previousTotals: { investment: number; revenue: number; grossProfit: number; roas: number; sales: number };
  currentYear: number;
  previousYear: number;
}

const ComparisonTable = ({ currentData, previousData, currentTotals, previousTotals, currentYear, previousYear }: ComparisonTableProps) => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary" />
          Comparativo {currentYear} vs {previousYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Mês</TableHead>
                <TableHead className="text-right font-semibold" colSpan={2}>Investimento</TableHead>
                <TableHead className="text-right font-semibold" colSpan={2}>Faturado</TableHead>
                <TableHead className="text-right font-semibold" colSpan={2}>Lucro Bruto</TableHead>
                <TableHead className="text-right font-semibold" colSpan={2}>ROAS</TableHead>
              </TableRow>
              <TableRow className="bg-muted/30">
                <TableHead></TableHead>
                <TableHead className="text-right text-xs">{currentYear}</TableHead>
                <TableHead className="text-right text-xs">{previousYear}</TableHead>
                <TableHead className="text-right text-xs">{currentYear}</TableHead>
                <TableHead className="text-right text-xs">{previousYear}</TableHead>
                <TableHead className="text-right text-xs">{currentYear}</TableHead>
                <TableHead className="text-right text-xs">{previousYear}</TableHead>
                <TableHead className="text-right text-xs">{currentYear}</TableHead>
                <TableHead className="text-right text-xs">{previousYear}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((monthLabel, index) => {
                const current = currentData[index] || { investment: 0, revenue: 0, grossProfit: 0, roas: 0, sales: 0 };
                const previous = previousData[index] || { investment: 0, revenue: 0, grossProfit: 0, roas: 0, sales: 0 };
                const isEmpty = current.revenue === 0 && current.investment === 0 && previous.revenue === 0 && previous.investment === 0;
                
                return (
                  <TableRow 
                    key={monthLabel} 
                    className={`hover:bg-muted/30 transition-colors ${isEmpty ? 'opacity-50' : ''}`}
                  >
                    <TableCell className="font-medium">{monthLabel}</TableCell>
                    <TableCell className="text-right text-blue-400">{formatCompactCurrency(current.investment)}</TableCell>
                    <TableCell className="text-right text-blue-400/60">{formatCompactCurrency(previous.investment)}</TableCell>
                    <TableCell className="text-right text-orange-400">{formatCompactCurrency(current.revenue)}</TableCell>
                    <TableCell className="text-right text-orange-400/60">{formatCompactCurrency(previous.revenue)}</TableCell>
                    <TableCell className={`text-right ${current.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCompactCurrency(current.grossProfit)}
                    </TableCell>
                    <TableCell className={`text-right ${previous.grossProfit >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                      {formatCompactCurrency(previous.grossProfit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getRoasBadgeClass(current.roas)}`}>
                        {current.roas.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border opacity-60 ${getRoasBadgeClass(previous.roas)}`}>
                        {previous.roas.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Total Row */}
              <TableRow className="bg-primary/10 border-t-2 border-primary/30 font-bold">
                <TableCell className="font-bold text-primary">TOTAL</TableCell>
                <TableCell className="text-right text-blue-400 font-bold">{formatCompactCurrency(currentTotals.investment)}</TableCell>
                <TableCell className="text-right text-blue-400/60 font-bold">{formatCompactCurrency(previousTotals.investment)}</TableCell>
                <TableCell className="text-right text-orange-400 font-bold">{formatCompactCurrency(currentTotals.revenue)}</TableCell>
                <TableCell className="text-right text-orange-400/60 font-bold">{formatCompactCurrency(previousTotals.revenue)}</TableCell>
                <TableCell className={`text-right font-bold ${currentTotals.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCompactCurrency(currentTotals.grossProfit)}
                </TableCell>
                <TableCell className={`text-right font-bold ${previousTotals.grossProfit >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                  {formatCompactCurrency(previousTotals.grossProfit)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold border ${getRoasBadgeClass(currentTotals.roas)}`}>
                    {currentTotals.roas.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold border opacity-60 ${getRoasBadgeClass(previousTotals.roas)}`}>
                    {previousTotals.roas.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

interface ComparisonSummaryCardsProps {
  currentTotals: { investment: number; revenue: number; grossProfit: number; roas: number; sales: number };
  previousTotals: { investment: number; revenue: number; grossProfit: number; roas: number; sales: number };
  currentYear: number;
  previousYear: number;
}

const ComparisonSummaryCards = ({ currentTotals, previousTotals, currentYear, previousYear }: ComparisonSummaryCardsProps) => {
  const investmentVar = getVariationIndicator(currentTotals.investment, previousTotals.investment);
  const revenueVar = getVariationIndicator(currentTotals.revenue, previousTotals.revenue);
  const profitVar = getVariationIndicator(currentTotals.grossProfit, previousTotals.grossProfit);
  const roasVar = getVariationIndicator(currentTotals.roas, previousTotals.roas);
  const salesVar = getVariationIndicator(currentTotals.sales, previousTotals.sales);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-400">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Investimento</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${investmentVar.color}`}>
              <investmentVar.icon className="w-3 h-3" />
              {investmentVar.value}
            </div>
          </div>
          <p className="text-xl font-bold text-blue-400">{formatCompactCurrency(currentTotals.investment)}</p>
          <p className="text-xs text-blue-400/60">{previousYear}: {formatCompactCurrency(previousTotals.investment)}</p>
        </CardContent>
      </Card>
      
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-orange-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Faturamento</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${revenueVar.color}`}>
              <revenueVar.icon className="w-3 h-3" />
              {revenueVar.value}
            </div>
          </div>
          <p className="text-xl font-bold text-orange-400">{formatCompactCurrency(currentTotals.revenue)}</p>
          <p className="text-xs text-orange-400/60">{previousYear}: {formatCompactCurrency(previousTotals.revenue)}</p>
        </CardContent>
      </Card>
      
      <Card className={`border-${currentTotals.grossProfit >= 0 ? 'green' : 'red'}-500/30 bg-gradient-to-br from-${currentTotals.grossProfit >= 0 ? 'green' : 'red'}-500/10 to-transparent`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-2 ${currentTotals.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {currentTotals.grossProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-xs font-medium">Lucro Bruto</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${profitVar.color}`}>
              <profitVar.icon className="w-3 h-3" />
              {profitVar.value}
            </div>
          </div>
          <p className={`text-xl font-bold ${currentTotals.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCompactCurrency(currentTotals.grossProfit)}
          </p>
          <p className={`text-xs ${previousTotals.grossProfit >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
            {previousYear}: {formatCompactCurrency(previousTotals.grossProfit)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">ROAS Médio</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${roasVar.color}`}>
              <roasVar.icon className="w-3 h-3" />
              {roasVar.value}
            </div>
          </div>
          <p className={`text-xl font-bold ${getRoasColor(currentTotals.roas)}`}>
            {currentTotals.roas.toFixed(2)}x
          </p>
          <p className={`text-xs ${getRoasColor(previousTotals.roas)} opacity-60`}>
            {previousYear}: {previousTotals.roas.toFixed(2)}x
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-purple-400">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-medium">Vendas</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${salesVar.color}`}>
              <salesVar.icon className="w-3 h-3" />
              {salesVar.value}
            </div>
          </div>
          <p className="text-xl font-bold text-purple-400">{currentTotals.sales}</p>
          <p className="text-xs text-purple-400/60">{previousYear}: {previousTotals.sales}</p>
        </CardContent>
      </Card>
    </div>
  );
};

interface ComparisonChartProps {
  currentData: MonthlyData[];
  previousData: MonthlyData[];
  currentYear: number;
  previousYear: number;
}

const ComparisonChart = ({ currentData, previousData, currentYear, previousYear }: ComparisonChartProps) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const chartData = months.map((name, index) => ({
    name,
    [`revenue${currentYear}`]: currentData[index]?.revenue || 0,
    [`revenue${previousYear}`]: previousData[index]?.revenue || 0,
    [`roas${currentYear}`]: currentData[index]?.roas || 0,
    [`roas${previousYear}`]: previousData[index]?.roas || 0,
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Faturamento Comparativo</CardTitle>
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
                  if (name.includes('roas')) return [value.toFixed(2), name.includes(currentYear.toString()) ? `ROAS ${currentYear}` : `ROAS ${previousYear}`];
                  return [formatCurrency(value), name.includes(currentYear.toString()) ? `Faturado ${currentYear}` : `Faturado ${previousYear}`];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey={`revenue${currentYear}`} fill="hsl(25, 95%, 53%)" name={`Faturado ${currentYear}`} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey={`revenue${previousYear}`} fill="hsl(25, 95%, 53%, 0.4)" name={`Faturado ${previousYear}`} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey={`roas${currentYear}`} stroke="hsl(142, 76%, 36%)" strokeWidth={3} dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2 }} name={`ROAS ${currentYear}`} />
              <Line yAxisId="right" type="monotone" dataKey={`roas${previousYear}`} stroke="hsl(142, 76%, 36%, 0.5)" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: 'hsl(142, 76%, 36%, 0.5)', strokeWidth: 1 }} name={`ROAS ${previousYear}`} />
            </ComposedChart>
          </ResponsiveContainer>
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
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonYear, setComparisonYear] = useState<number>(new Date().getFullYear() - 1);

  const { 
    generalMonthlyData, 
    funnelMonthlyData, 
    generalTotals, 
    comparisonMonthlyData,
    comparisonTotals,
    isLoading, 
    funnels 
  } = useMonthlyAnalysis({
    projectId: currentProject?.id,
    year: selectedYear,
    comparisonYear: compareMode ? comparisonYear : null,
  });

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

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
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Compare Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <GitCompare className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="compare-mode" className="text-sm cursor-pointer">Comparar</Label>
              <Switch
                id="compare-mode"
                checked={compareMode}
                onCheckedChange={setCompareMode}
              />
            </div>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {compareMode && (
              <>
                <span className="text-muted-foreground">vs</span>
                <Select value={comparisonYear.toString()} onValueChange={(v) => setComparisonYear(parseInt(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.filter(y => y !== selectedYear).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            
            {!compareMode && (
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
            )}
          </div>
        </div>

        {compareMode ? (
          <>
            {/* Comparison Summary Cards */}
            <ComparisonSummaryCards
              currentTotals={generalTotals}
              previousTotals={comparisonTotals}
              currentYear={selectedYear}
              previousYear={comparisonYear}
            />

            {/* Comparison Table */}
            <div className="mb-8">
              <ComparisonTable
                currentData={generalMonthlyData}
                previousData={comparisonMonthlyData}
                currentTotals={generalTotals}
                previousTotals={comparisonTotals}
                currentYear={selectedYear}
                previousYear={comparisonYear}
              />
            </div>

            {/* Comparison Chart */}
            <ComparisonChart
              currentData={generalMonthlyData}
              previousData={comparisonMonthlyData}
              currentYear={selectedYear}
              previousYear={comparisonYear}
            />
          </>
        ) : (
          <>
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
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {funnelMonthlyData.map(funnel => (
                    <TabsContent key={funnel.funnelId} value={funnel.funnelId}>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <MonthlyTable 
                          data={funnel.months} 
                          totals={funnel.totals} 
                          title={funnel.funnelName}
                        />
                        <MonthlyChart 
                          data={funnel.months} 
                          title={`${funnel.funnelName} - Evolução`} 
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AnaliseMensal;
