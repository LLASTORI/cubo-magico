import { useState, useMemo } from "react";
import { Target, Megaphone, Layers, MousePointer, Sparkles, ChevronRight, Home, GitBranch, Image, Globe, FileText } from "lucide-react";
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
  checkout_origin?: string | null;
}

// Parsed UTM structure from checkout_origin
// Format: Origem|Conjunto|Campanha|Posicionamento|Criativo|Pagina
interface ParsedUTM {
  source: string;      // Origem de Checkout (e.g., "Meta-Ads")
  adset: string;       // Conjunto (e.g., "00_ADVANTAGE_6845240173892")
  campaign: string;    // Campanha (e.g., "PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292")
  placement: string;   // Posicionamento (e.g., "Instagram_Reels")
  creative: string;    // Criativo (e.g., "VENDA_VIDEO_02_MAKE_13_MINUTOS_6845240176092")
  page: string;        // Página (e.g., "page_name=hm-make-pratica-2")
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
  placement?: string;
  creative?: string;
  page?: string;
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

// Hierarchy: Source > Campaign > Adset > Placement > Creative > Page
const HIERARCHY = ['source', 'campaign', 'adset', 'placement', 'creative', 'page'] as const;
type HierarchyLevel = typeof HIERARCHY[number];

const LEVEL_CONFIG: Record<HierarchyLevel, { label: string; icon: any }> = {
  source: { label: 'Origem', icon: Globe },
  campaign: { label: 'Campanha', icon: Megaphone },
  adset: { label: 'Conjunto', icon: Layers },
  placement: { label: 'Posicionamento', icon: Target },
  creative: { label: 'Criativo', icon: Image },
  page: { label: 'Página', icon: FileText },
};

// Parse checkout_origin into structured UTM data
const parseCheckoutOrigin = (checkoutOrigin: string | null | undefined): ParsedUTM => {
  const empty: ParsedUTM = {
    source: '',
    adset: '',
    campaign: '',
    placement: '',
    creative: '',
    page: '',
  };

  if (!checkoutOrigin) return empty;

  const parts = checkoutOrigin.split('|');
  
  return {
    source: parts[0] || '',
    adset: parts[1] || '',
    campaign: parts[2] || '',
    placement: parts[3] || '',
    creative: parts[4] || '',
    page: parts[5] || '',
  };
};

const UTMAnalysis = ({ salesData, funnelOfferCodes }: UTMAnalysisProps) => {
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  // Filter sales by funnel offer codes and parse checkout_origin
  const filteredSales = useMemo(() => {
    return salesData
      .filter(sale => funnelOfferCodes.includes(sale.offer_code || ''))
      .map(sale => ({
        ...sale,
        parsedUTM: parseCheckoutOrigin(sale.checkout_origin),
      }));
  }, [salesData, funnelOfferCodes]);

  const currentLevel = useMemo(() => {
    if (!drilldownPath.source) return 0;
    if (!drilldownPath.campaign) return 1;
    if (!drilldownPath.adset) return 2;
    if (!drilldownPath.placement) return 3;
    if (!drilldownPath.creative) return 4;
    if (!drilldownPath.page) return 5;
    return 6;
  }, [drilldownPath]);

  const currentField: HierarchyLevel = HIERARCHY[Math.min(currentLevel, HIERARCHY.length - 1)];

  // Get the value for a given field from a parsed sale
  const getFieldValue = (parsedUTM: ParsedUTM, field: HierarchyLevel): string => {
    return parsedUTM[field] || '';
  };

  // Get display name for a field value
  const getDisplayName = (value: string): string => {
    if (!value) return '(não definido)';
    return value;
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
        page: [],
        totalSales: 0,
        totalRevenue: 0,
      };
    }

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const analyzeByField = (field: HierarchyLevel): UTMMetrics[] => {
      const groups: Record<string, { sales: number; revenue: number }> = {};
      
      filteredSales.forEach(sale => {
        const value = getFieldValue(sale.parsedUTM, field);
        const displayName = getDisplayName(value);
        const valueInBRL = sale.total_price_brl || 0;
        
        if (!groups[displayName]) {
          groups[displayName] = { sales: 0, revenue: 0 };
        }
        groups[displayName].sales += 1;
        groups[displayName].revenue += valueInBRL;
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
      page: analyzeByField('page'),
      totalSales,
      totalRevenue,
    };
  }, [filteredSales]);

  // Analysis with drilldown filtering applied
  const drilldownData = useMemo(() => {
    let filtered = [...filteredSales];
    
    // Filter by drilldown path
    if (drilldownPath.source) {
      filtered = filtered.filter(s => s.parsedUTM.source === drilldownPath.source);
    }
    if (drilldownPath.campaign) {
      filtered = filtered.filter(s => s.parsedUTM.campaign === drilldownPath.campaign);
    }
    if (drilldownPath.adset) {
      filtered = filtered.filter(s => s.parsedUTM.adset === drilldownPath.adset);
    }
    if (drilldownPath.placement) {
      filtered = filtered.filter(s => s.parsedUTM.placement === drilldownPath.placement);
    }
    if (drilldownPath.creative) {
      filtered = filtered.filter(s => s.parsedUTM.creative === drilldownPath.creative);
    }
    if (drilldownPath.page) {
      filtered = filtered.filter(s => s.parsedUTM.page === drilldownPath.page);
    }

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const groups: Record<string, { sales: number; revenue: number }> = {};
    
    filtered.forEach(sale => {
      const value = getFieldValue(sale.parsedUTM, currentField);
      const displayName = getDisplayName(value);
      const valueInBRL = sale.total_price_brl || 0;
      
      if (!groups[displayName]) {
        groups[displayName] = { sales: 0, revenue: 0 };
      }
      groups[displayName].sales += 1;
      groups[displayName].revenue += valueInBRL;
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

  const handleDrilldown = (metric: UTMMetrics) => {
    if (metric.name === '(não definido)') return; // Can't drill down on undefined
    
    const newPath = { ...drilldownPath };
    if (currentLevel === 0) newPath.source = metric.name;
    else if (currentLevel === 1) newPath.campaign = metric.name;
    else if (currentLevel === 2) newPath.adset = metric.name;
    else if (currentLevel === 3) newPath.placement = metric.name;
    else if (currentLevel === 4) newPath.creative = metric.name;
    else if (currentLevel === 5) newPath.page = metric.name;
    setDrilldownPath(newPath);
  };

  const goBack = () => {
    const newPath = { ...drilldownPath };
    if (currentLevel === 6) delete newPath.page;
    else if (currentLevel === 5) delete newPath.creative;
    else if (currentLevel === 4) delete newPath.placement;
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

    const pathItems: { key: keyof DrilldownPath; value: string | undefined }[] = [
      { key: 'source', value: drilldownPath.source },
      { key: 'campaign', value: drilldownPath.campaign },
      { key: 'adset', value: drilldownPath.adset },
      { key: 'placement', value: drilldownPath.placement },
      { key: 'creative', value: drilldownPath.creative },
      { key: 'page', value: drilldownPath.page },
    ];

    pathItems.forEach((item, index) => {
      if (item.value) {
        items.push(<ChevronRight key={`sep-${index}`} className="w-4 h-4 text-muted-foreground" />);
        
        // Build the path up to this point for the click handler
        const pathUpToHere: DrilldownPath = {};
        for (let i = 0; i <= index; i++) {
          const key = pathItems[i].key;
          if (pathItems[i].value) {
            pathUpToHere[key] = pathItems[i].value;
          }
        }
        
        items.push(
          <Badge 
            key={item.key} 
            variant="secondary" 
            className="cursor-pointer truncate max-w-[120px]" 
            onClick={() => setDrilldownPath(pathUpToHere)}
            title={item.value}
          >
            {item.value}
          </Badge>
        );
      }
    });

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
            key={`${metric.name}-${idx}`} 
            className={showDrilldown && currentLevel < HIERARCHY.length && metric.name !== '(não definido)' ? "cursor-pointer hover:bg-muted/50" : ""}
            onClick={() => showDrilldown && currentLevel < HIERARCHY.length && metric.name !== '(não definido)' && handleDrilldown(metric)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="truncate max-w-[200px]" title={metric.name}>{metric.name}</span>
                {showDrilldown && currentLevel < HIERARCHY.length && metric.name !== '(não definido)' && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
        <h3 className="text-lg font-semibold">Análise de UTMs</h3>
        <p className="text-sm text-muted-foreground">Origem, Campanha, Conjunto, Posicionamento, Criativo e Página das vendas</p>
      </div>

      <Tabs defaultValue="drilldown" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="drilldown" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Drill-down
          </TabsTrigger>
          <TabsTrigger value="source">Origem</TabsTrigger>
          <TabsTrigger value="campaign">Campanha</TabsTrigger>
          <TabsTrigger value="adset">Conjunto</TabsTrigger>
          <TabsTrigger value="placement">Posicionamento</TabsTrigger>
          <TabsTrigger value="creative">Criativo</TabsTrigger>
          <TabsTrigger value="page">Página</TabsTrigger>
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

        {HIERARCHY.map(field => (
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
