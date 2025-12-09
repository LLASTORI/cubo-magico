import { useState, useMemo } from "react";
import { Target, Megaphone, Layers, MousePointer, Sparkles, ChevronRight, Home, GitBranch, Image } from "lucide-react";
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
  // Meta extracted fields - these are the IDs extracted from tracking
  meta_campaign_id_extracted?: string | null;
  meta_adset_id_extracted?: string | null;
  meta_ad_id_extracted?: string | null;
}

interface MetaHierarchyData {
  campaigns?: Array<{ campaign_id: string; campaign_name: string | null; id?: string; status?: string | null }>;
  adsets?: Array<{ adset_id: string; adset_name: string | null; campaign_id: string; id?: string; status?: string | null }>;
  ads?: Array<{ ad_id: string; ad_name: string | null; adset_id: string; campaign_id: string; id?: string; status?: string | null }>;
}

interface UTMAnalysisProps {
  salesData: SaleData[];
  funnelOfferCodes: string[];
  metaHierarchy?: MetaHierarchyData;
}

interface UTMMetrics {
  name: string;
  id?: string; // Keep the ID for reference
  sales: number;
  revenue: number;
  avgTicket: number;
  percentage: number;
}

interface DrilldownPath {
  campaign?: string;
  adset?: string;
  ad?: string;
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

// Updated hierarchy to use Meta structure: Campaign > Adset > Ad
const HIERARCHY = ['campaign', 'adset', 'ad'] as const;
type HierarchyLevel = typeof HIERARCHY[number];

const LEVEL_CONFIG: Record<HierarchyLevel, { label: string; icon: any }> = {
  campaign: { label: 'Campanha', icon: Megaphone },
  adset: { label: 'Conjunto', icon: Layers },
  ad: { label: 'Anúncio', icon: Image },
};

const UTMAnalysis = ({ salesData, funnelOfferCodes, metaHierarchy }: UTMAnalysisProps) => {
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  // Create lookup maps for Meta hierarchy names
  const nameLookups = useMemo(() => {
    const campaignNames = new Map<string, string>();
    const adsetNames = new Map<string, string>();
    const adNames = new Map<string, string>();
    
    // Also create reverse lookups: adset_id -> campaign_id, ad_id -> adset_id
    const adsetToCampaign = new Map<string, string>();
    const adToAdset = new Map<string, string>();

    metaHierarchy?.campaigns?.forEach(c => {
      if (c.campaign_id && c.campaign_name) {
        campaignNames.set(c.campaign_id, c.campaign_name);
      }
    });

    metaHierarchy?.adsets?.forEach(a => {
      if (a.adset_id && a.adset_name) {
        adsetNames.set(a.adset_id, a.adset_name);
      }
      if (a.adset_id && a.campaign_id) {
        adsetToCampaign.set(a.adset_id, a.campaign_id);
      }
    });

    metaHierarchy?.ads?.forEach(a => {
      if (a.ad_id && a.ad_name) {
        adNames.set(a.ad_id, a.ad_name);
      }
      if (a.ad_id && a.adset_id) {
        adToAdset.set(a.ad_id, a.adset_id);
      }
    });

    return { campaignNames, adsetNames, adNames, adsetToCampaign, adToAdset };
  }, [metaHierarchy]);

  // Filter sales by funnel offer codes
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => 
      funnelOfferCodes.includes(sale.offer_code || '')
    );
  }, [salesData, funnelOfferCodes]);

  const currentLevel = useMemo(() => {
    if (!drilldownPath.campaign) return 0;
    if (!drilldownPath.adset) return 1;
    if (!drilldownPath.ad) return 2;
    return 3;
  }, [drilldownPath]);

  const currentField: HierarchyLevel = HIERARCHY[Math.min(currentLevel, HIERARCHY.length - 1)];

  // Get the ID for a given field from a sale
  const getFieldId = (sale: SaleData, field: HierarchyLevel): string => {
    switch (field) {
      case 'campaign': {
        // Try to get campaign from ad -> adset -> campaign chain
        if (sale.meta_campaign_id_extracted) return sale.meta_campaign_id_extracted;
        if (sale.meta_adset_id_extracted) {
          const campaignId = nameLookups.adsetToCampaign.get(sale.meta_adset_id_extracted);
          if (campaignId) return campaignId;
        }
        if (sale.meta_ad_id_extracted) {
          const adsetId = nameLookups.adToAdset.get(sale.meta_ad_id_extracted);
          if (adsetId) {
            const campaignId = nameLookups.adsetToCampaign.get(adsetId);
            if (campaignId) return campaignId;
          }
        }
        return '';
      }
      case 'adset': {
        if (sale.meta_adset_id_extracted) return sale.meta_adset_id_extracted;
        if (sale.meta_ad_id_extracted) {
          const adsetId = nameLookups.adToAdset.get(sale.meta_ad_id_extracted);
          if (adsetId) return adsetId;
        }
        return '';
      }
      case 'ad':
        return sale.meta_ad_id_extracted || '';
      default:
        return '';
    }
  };

  // Get display name for a field value
  const getDisplayName = (field: HierarchyLevel, id: string): string => {
    if (!id) return '(não definido)';
    
    switch (field) {
      case 'campaign':
        return nameLookups.campaignNames.get(id) || `Campanha ${id}`;
      case 'adset':
        return nameLookups.adsetNames.get(id) || `Conjunto ${id}`;
      case 'ad':
        return nameLookups.adNames.get(id) || `Anúncio ${id}`;
      default:
        return id;
    }
  };

  // Analysis for individual tabs (no drilldown filtering)
  const analyzeUTM = useMemo(() => {
    if (filteredSales.length === 0) {
      return {
        campaign: [],
        adset: [],
        ad: [],
        totalSales: 0,
        totalRevenue: 0,
      };
    }

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const analyzeByField = (field: HierarchyLevel): UTMMetrics[] => {
      const groups: Record<string, { id: string; sales: number; revenue: number }> = {};
      
      filteredSales.forEach(sale => {
        const id = getFieldId(sale, field);
        const displayName = getDisplayName(field, id);
        const valueInBRL = sale.total_price_brl || 0;
        
        if (!groups[displayName]) {
          groups[displayName] = { id, sales: 0, revenue: 0 };
        }
        groups[displayName].sales += 1;
        groups[displayName].revenue += valueInBRL;
      });

      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          id: data.id,
          sales: data.sales,
          revenue: data.revenue,
          avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
          percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.sales - a.sales);
    };

    return {
      campaign: analyzeByField('campaign'),
      adset: analyzeByField('adset'),
      ad: analyzeByField('ad'),
      totalSales,
      totalRevenue,
    };
  }, [filteredSales, nameLookups]);

  // Analysis with drilldown filtering applied
  const drilldownData = useMemo(() => {
    let filtered = [...filteredSales];
    
    // Filter by drilldown path using IDs
    if (drilldownPath.campaign) {
      filtered = filtered.filter(s => getFieldId(s, 'campaign') === drilldownPath.campaign);
    }
    if (drilldownPath.adset) {
      filtered = filtered.filter(s => getFieldId(s, 'adset') === drilldownPath.adset);
    }
    if (drilldownPath.ad) {
      filtered = filtered.filter(s => getFieldId(s, 'ad') === drilldownPath.ad);
    }

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const groups: Record<string, { id: string; sales: number; revenue: number }> = {};
    
    filtered.forEach(sale => {
      const id = getFieldId(sale, currentField);
      const displayName = getDisplayName(currentField, id);
      const valueInBRL = sale.total_price_brl || 0;
      
      if (!groups[displayName]) {
        groups[displayName] = { id, sales: 0, revenue: 0 };
      }
      groups[displayName].sales += 1;
      groups[displayName].revenue += valueInBRL;
    });

    const metrics: UTMMetrics[] = Object.entries(groups)
      .map(([name, data]) => ({
        name,
        id: data.id,
        sales: data.sales,
        revenue: data.revenue,
        avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
        percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    return { metrics, totalSales, totalRevenue };
  }, [filteredSales, drilldownPath, currentField, nameLookups]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDrilldown = (metric: UTMMetrics) => {
    if (!metric.id) return; // Can't drill down on undefined
    
    const newPath = { ...drilldownPath };
    if (currentLevel === 0) newPath.campaign = metric.id;
    else if (currentLevel === 1) newPath.adset = metric.id;
    else if (currentLevel === 2) newPath.ad = metric.id;
    setDrilldownPath(newPath);
  };

  const goBack = () => {
    const newPath = { ...drilldownPath };
    if (currentLevel === 3) delete newPath.ad;
    else if (currentLevel === 2) delete newPath.adset;
    else if (currentLevel === 1) delete newPath.campaign;
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

    if (drilldownPath.campaign) {
      const name = getDisplayName('campaign', drilldownPath.campaign);
      items.push(<ChevronRight key="sep1" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="campaign" variant="secondary" className="cursor-pointer truncate max-w-[150px]" onClick={() => setDrilldownPath({ campaign: drilldownPath.campaign })}>
          {name}
        </Badge>
      );
    }
    if (drilldownPath.adset) {
      const name = getDisplayName('adset', drilldownPath.adset);
      items.push(<ChevronRight key="sep2" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="adset" variant="secondary" className="cursor-pointer truncate max-w-[150px]" onClick={() => setDrilldownPath({ campaign: drilldownPath.campaign, adset: drilldownPath.adset })}>
          {name}
        </Badge>
      );
    }
    if (drilldownPath.ad) {
      const name = getDisplayName('ad', drilldownPath.ad);
      items.push(<ChevronRight key="sep3" className="w-4 h-4 text-muted-foreground" />);
      items.push(
        <Badge key="ad" variant="secondary" className="truncate max-w-[150px]">
          {name}
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
            key={`${metric.name}-${idx}`} 
            className={showDrilldown && currentLevel < HIERARCHY.length && metric.id ? "cursor-pointer hover:bg-muted/50" : ""}
            onClick={() => showDrilldown && currentLevel < HIERARCHY.length && metric.id && handleDrilldown(metric)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="truncate max-w-[200px]" title={metric.name}>{metric.name}</span>
                {showDrilldown && currentLevel < HIERARCHY.length && metric.id && (
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
        <h3 className="text-lg font-semibold">Análise de Atribuição Meta</h3>
        <p className="text-sm text-muted-foreground">Campanhas, Conjuntos e Anúncios vinculados às vendas</p>
      </div>

      <Tabs defaultValue="drilldown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drilldown" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Drill-down
          </TabsTrigger>
          <TabsTrigger value="campaign">Campanha</TabsTrigger>
          <TabsTrigger value="adset">Conjunto</TabsTrigger>
          <TabsTrigger value="ad">Anúncio</TabsTrigger>
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

        {(['campaign', 'adset', 'ad'] as const).map(field => (
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