import { useState, useMemo } from "react";
import { Target, Megaphone, Layers, MousePointer, Sparkles, ChevronRight, Home, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface SaleData {
  offer_code?: string | null;
  total_price_brl?: number | null;
  utm_source?: string | null;
  utm_campaign_id?: string | null;
  utm_adset_name?: string | null;
  utm_creative?: string | null;
  utm_placement?: string | null;
}

interface UTMAnalysisProps {
  salesData: SaleData[];
  funnelOfferCodes: string[];
}

interface UTMMetrics {
  name: string;
  sales: number;
  revenue: number;
  avgTicket: number;
  percentage: number;
}

interface DrilldownPath {
  source?: string;
  campaign?: string;
  adset?: string;
  creative?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(197, 71%, 52%)',
  'hsl(339, 82%, 51%)',
  'hsl(48, 96%, 53%)',
  'hsl(174, 72%, 40%)',
];

const chartConfig = {
  sales: { label: "Produtos Vendidos", color: "hsl(var(--primary))" },
  revenue: { label: "Receita", color: "hsl(142, 76%, 36%)" },
};

const HIERARCHY = ['source', 'campaign', 'adset', 'creative', 'placement'] as const;
type HierarchyLevel = typeof HIERARCHY[number];

const LEVEL_CONFIG: Record<HierarchyLevel, { label: string; icon: any }> = {
  source: { label: 'Source', icon: Target },
  adset: { label: 'Adset', icon: Layers },
  campaign: { label: 'Campaign', icon: Megaphone },
  placement: { label: 'Placement', icon: MousePointer },
  creative: { label: 'Creative', icon: Sparkles },
};

const UTMAnalysis = ({ salesData, funnelOfferCodes }: UTMAnalysisProps) => {
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  // Filter sales by funnel offer codes
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => 
      funnelOfferCodes.includes(sale.offer_code || '')
    );
  }, [salesData, funnelOfferCodes]);

  const currentLevel = useMemo(() => {
    if (!drilldownPath.source) return 0;
    if (!drilldownPath.campaign) return 1;
    if (!drilldownPath.adset) return 2;
    if (!drilldownPath.creative) return 3;
    return 4;
  }, [drilldownPath]);

  const currentField = HIERARCHY[currentLevel];

  const getUtmField = (sale: SaleData, field: string): string => {
    switch (field) {
      case 'source': return sale.utm_source || '(não definido)';
      case 'campaign': return sale.utm_campaign_id || '(não definido)';
      case 'adset': return sale.utm_adset_name || '(não definido)';
      case 'creative': return sale.utm_creative || '(não definido)';
      case 'placement': return sale.utm_placement || '(não definido)';
      default: return '(não definido)';
    }
  };

  // Analysis for individual tabs (no drilldown filtering)
  const analyzeUTM = useMemo(() => {
    if (filteredSales.length === 0) {
      return {
        source: [],
        campaign: [],
        adset: [],
        placement: [],
        creative: [],
        totalSales: 0,
        totalRevenue: 0,
      };
    }

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const analyzeByField = (field: string): UTMMetrics[] => {
      const groups: Record<string, { sales: number; revenue: number }> = {};
      
      filteredSales.forEach(sale => {
        const value = getUtmField(sale, field);
        const valueInBRL = sale.total_price_brl || 0;
        
        if (!groups[value]) {
          groups[value] = { sales: 0, revenue: 0 };
        }
        groups[value].sales += 1;
        groups[value].revenue += valueInBRL;
      });

      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          sales: data.sales,
          revenue: data.revenue,
          avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
          percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.sales - a.sales);
    };

    return {
      source: analyzeByField('source'),
      campaign: analyzeByField('campaign'),
      adset: analyzeByField('adset'),
      placement: analyzeByField('placement'),
      creative: analyzeByField('creative'),
      totalSales,
      totalRevenue,
    };
  }, [filteredSales]);

  // Analysis with drilldown filtering applied
  const drilldownData = useMemo(() => {
    let filtered = [...filteredSales];
    
    if (drilldownPath.source) {
      filtered = filtered.filter(s => getUtmField(s, 'source') === drilldownPath.source);
    }
    if (drilldownPath.campaign) {
      filtered = filtered.filter(s => getUtmField(s, 'campaign') === drilldownPath.campaign);
    }
    if (drilldownPath.adset) {
      filtered = filtered.filter(s => getUtmField(s, 'adset') === drilldownPath.adset);
    }
    if (drilldownPath.creative) {
      filtered = filtered.filter(s => getUtmField(s, 'creative') === drilldownPath.creative);
    }

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const groups: Record<string, { sales: number; revenue: number }> = {};
    
    filtered.forEach(sale => {
      const value = getUtmField(sale, currentField);
      const valueInBRL = sale.total_price_brl || 0;
      
      if (!groups[value]) {
        groups[value] = { sales: 0, revenue: 0 };
      }
      groups[value].sales += 1;
      groups[value].revenue += valueInBRL;
    });

    const metrics: UTMMetrics[] = Object.entries(groups)
      .map(([name, data]) => ({
        name,
        sales: data.sales,
        revenue: data.revenue,
        avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
        percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    return { metrics, totalSales, totalRevenue };
  }, [filteredSales, drilldownPath, currentField]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDrilldown = (value: string) => {
    const newPath = { ...drilldownPath };
    if (currentLevel === 0) newPath.source = value;
    else if (currentLevel === 1) newPath.campaign = value;
    else if (currentLevel === 2) newPath.adset = value;
    else if (currentLevel === 3) newPath.creative = value;
    setDrilldownPath(newPath);
  };

  const goBack = () => {
    const newPath = { ...drilldownPath };
    if (currentLevel === 4) delete newPath.creative;
    else if (currentLevel === 3) delete newPath.adset;
    else if (currentLevel === 2) delete newPath.campaign;
    else if (currentLevel === 1) delete newPath.source;
    setDrilldownPath(newPath);
  };

  const resetDrilldown = () => {
    setDrilldownPath({});
  };

  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <Button 
        key="home" 
        variant="ghost" 
        size="sm" 
        onClick={resetDrilldown}
        className="px-2"
      >
        <Home className="w-4 h-4" />
      </Button>
    );

    if (drilldownPath.source) {
      items.push(<ChevronRight key="sep1" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="source" variant="secondary" className="cursor-pointer" onClick={() => setDrilldownPath({ source: drilldownPath.source })}>
          {drilldownPath.source}
        </Badge>
      );
    }
    if (drilldownPath.campaign) {
      items.push(<ChevronRight key="sep2" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="campaign" variant="secondary" className="cursor-pointer" onClick={() => setDrilldownPath({ source: drilldownPath.source, campaign: drilldownPath.campaign })}>
          {drilldownPath.campaign}
        </Badge>
      );
    }
    if (drilldownPath.adset) {
      items.push(<ChevronRight key="sep3" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="adset" variant="secondary" className="cursor-pointer" onClick={() => setDrilldownPath({ ...drilldownPath, creative: undefined })}>
          {drilldownPath.adset}
        </Badge>
      );
    }
    if (drilldownPath.creative) {
      items.push(<ChevronRight key="sep4" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="creative" variant="secondary">
          {drilldownPath.creative}
        </Badge>
      );
    }

    return <div className="flex items-center gap-1 flex-wrap">{items}</div>;
  };

  const renderMetricsTable = (metrics: UTMMetrics[], showDrilldown = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead className="text-right">Vendas</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">Ticket Médio</TableHead>
          <TableHead className="text-right">%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.slice(0, 10).map((metric, idx) => (
          <TableRow 
            key={metric.name} 
            className={showDrilldown && currentLevel < 4 ? "cursor-pointer hover:bg-muted/50" : ""}
            onClick={() => showDrilldown && currentLevel < 4 && handleDrilldown(metric.name)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="truncate max-w-[200px]">{metric.name}</span>
                {showDrilldown && currentLevel < 4 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">{metric.sales}</TableCell>
            <TableCell className="text-right">{formatCurrency(metric.revenue)}</TableCell>
            <TableCell className="text-right">{formatCurrency(metric.avgTicket)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{metric.percentage.toFixed(1)}%</span>
                <Progress value={metric.percentage} className="w-16 h-2" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderPieChart = (metrics: UTMMetrics[]) => (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <PieChart>
        <Pie
          data={metrics.slice(0, 8)}
          dataKey="sales"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percentage }) => `${(name as string).substring(0, 15)}: ${percentage.toFixed(1)}%`}
        >
          {metrics.slice(0, 8).map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Análise de UTM</h3>
        <p className="text-sm text-muted-foreground">Origem do tráfego e campanhas</p>
      </div>

      <Tabs defaultValue="drilldown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drilldown" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Drill-down
          </TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
          <TabsTrigger value="campaign">Campaign</TabsTrigger>
          <TabsTrigger value="adset">Adset</TabsTrigger>
          <TabsTrigger value="placement">Placement</TabsTrigger>
          <TabsTrigger value="creative">Creative</TabsTrigger>
        </TabsList>

        <TabsContent value="drilldown">
          <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between">
              {renderBreadcrumb()}
              {currentLevel > 0 && (
                <Button variant="outline" size="sm" onClick={goBack}>
                  Voltar
                </Button>
              )}
            </div>

            {/* Current Level Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                const Icon = LEVEL_CONFIG[currentField].icon;
                return (
                  <>
                    <Icon className="w-4 h-4" />
                    <span>Navegando por: {LEVEL_CONFIG[currentField].label}</span>
                  </>
                );
              })()}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Distribuição</h4>
                {renderPieChart(drilldownData.metrics)}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-4">Detalhamento</h4>
                {renderMetricsTable(drilldownData.metrics, true)}
              </Card>
            </div>
          </div>
        </TabsContent>

        {(['source', 'campaign', 'adset', 'placement', 'creative'] as const).map(field => (
          <TabsContent key={field} value={field}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Distribuição por {LEVEL_CONFIG[field].label}</h4>
                {renderPieChart(analyzeUTM[field])}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-4">Detalhamento</h4>
                {renderMetricsTable(analyzeUTM[field])}
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
};

export default UTMAnalysis;
