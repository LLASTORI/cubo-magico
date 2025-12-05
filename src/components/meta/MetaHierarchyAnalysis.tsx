import { useState, useMemo } from "react";
import { Megaphone, Layers, FileImage, ChevronRight, Home, GitBranch, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface MetaInsight {
  id: string;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  date_start: string;
  date_stop: string;
}

interface MetaCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  status: string | null;
}

interface MetaAdset {
  id: string;
  adset_id: string;
  adset_name: string | null;
  campaign_id: string;
  status: string | null;
}

interface MetaAd {
  id: string;
  ad_id: string;
  ad_name: string | null;
  adset_id: string;
  campaign_id: string;
  status: string | null;
}

interface MetaHierarchyAnalysisProps {
  insights: MetaInsight[];
  campaigns: MetaCampaign[];
  adsets: MetaAdset[];
  ads: MetaAd[];
  loading?: boolean;
  onRefresh?: () => void;
}

interface HierarchyMetrics {
  id: string;
  name: string;
  status?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  percentage: number;
}

interface DrilldownPath {
  campaign?: { id: string; name: string };
  adset?: { id: string; name: string };
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
  spend: { label: "Gasto", color: "hsl(var(--primary))" },
  clicks: { label: "Cliques", color: "hsl(142, 76%, 36%)" },
};

const HIERARCHY = ['campaign', 'adset', 'ad'] as const;
type HierarchyLevel = typeof HIERARCHY[number];

const LEVEL_CONFIG: Record<HierarchyLevel, { label: string; icon: any }> = {
  campaign: { label: 'Campanha', icon: Megaphone },
  adset: { label: 'Conjunto', icon: Layers },
  ad: { label: 'Anúncio', icon: FileImage },
};

export const MetaHierarchyAnalysis = ({ 
  insights, 
  campaigns, 
  adsets, 
  ads,
  loading,
  onRefresh 
}: MetaHierarchyAnalysisProps) => {
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  const currentLevel = useMemo(() => {
    if (!drilldownPath.campaign) return 0;
    if (!drilldownPath.adset) return 1;
    return 2;
  }, [drilldownPath]);

  const currentField = HIERARCHY[currentLevel];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Calculate metrics by campaign (individual tab)
  const campaignMetrics = useMemo((): HierarchyMetrics[] => {
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    insights.forEach(insight => {
      const campaignId = insight.campaign_id || 'unknown';
      if (!groups[campaignId]) {
        groups[campaignId] = { spend: 0, impressions: 0, clicks: 0, reach: 0 };
      }
      groups[campaignId].spend += insight.spend || 0;
      groups[campaignId].impressions += insight.impressions || 0;
      groups[campaignId].clicks += insight.clicks || 0;
      groups[campaignId].reach += insight.reach || 0;
    });

    const totalSpend = Object.values(groups).reduce((sum, g) => sum + g.spend, 0);

    return Object.entries(groups).map(([id, data]) => {
      const campaign = campaigns.find(c => c.campaign_id === id);
      return {
        id,
        name: campaign?.campaign_name || id,
        status: campaign?.status,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        reach: data.reach,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        percentage: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [insights, campaigns]);

  // Calculate metrics by adset (individual tab) - only include insights that have adset_id
  const adsetMetrics = useMemo((): HierarchyMetrics[] => {
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    // Only process insights that have an adset_id (adset-level or ad-level insights)
    // Use adset-level insights only (has adset_id but no ad_id) to avoid double counting
    insights.filter(i => i.adset_id && !i.ad_id).forEach(insight => {
      const adsetId = insight.adset_id!;
      if (!groups[adsetId]) {
        groups[adsetId] = { spend: 0, impressions: 0, clicks: 0, reach: 0 };
      }
      groups[adsetId].spend += insight.spend || 0;
      groups[adsetId].impressions += insight.impressions || 0;
      groups[adsetId].clicks += insight.clicks || 0;
      groups[adsetId].reach += insight.reach || 0;
    });

    const totalSpend = Object.values(groups).reduce((sum, g) => sum + g.spend, 0);

    return Object.entries(groups).map(([id, data]) => {
      const adset = adsets.find(a => a.adset_id === id);
      // If no name found and ID looks like a number, show a better label
      const displayName = adset?.adset_name || (id.match(/^\d+$/) ? `Conjunto ${id}` : id);
      return {
        id,
        name: displayName,
        status: adset?.status,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        reach: data.reach,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        percentage: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [insights, adsets]);

  // Calculate metrics by ad (individual tab) - only include insights that have ad_id
  const adMetrics = useMemo((): HierarchyMetrics[] => {
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    // Only process insights that have an ad_id (ad-level insights)
    insights.filter(i => i.ad_id).forEach(insight => {
      const adId = insight.ad_id!;
      if (!groups[adId]) {
        groups[adId] = { spend: 0, impressions: 0, clicks: 0, reach: 0 };
      }
      groups[adId].spend += insight.spend || 0;
      groups[adId].impressions += insight.impressions || 0;
      groups[adId].clicks += insight.clicks || 0;
      groups[adId].reach += insight.reach || 0;
    });

    const totalSpend = Object.values(groups).reduce((sum, g) => sum + g.spend, 0);

    return Object.entries(groups).map(([id, data]) => {
      const ad = ads.find(a => a.ad_id === id);
      // If no name found and ID looks like a number, show a better label
      const displayName = ad?.ad_name || (id.match(/^\d+$/) ? `Anúncio ${id}` : id);
      return {
        id,
        name: displayName,
        status: ad?.status,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        reach: data.reach,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        percentage: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [insights, ads]);

  // Hierarchical drilldown analysis
  const drilldownAnalysis = useMemo(() => {
    let filteredInsights = [...insights];

    // Apply drilldown filters
    if (drilldownPath.campaign) {
      filteredInsights = filteredInsights.filter(i => i.campaign_id === drilldownPath.campaign?.id);
    }
    if (drilldownPath.adset) {
      filteredInsights = filteredInsights.filter(i => i.adset_id === drilldownPath.adset?.id);
    }

    // Filter by the appropriate level to avoid duplicate counting
    // Level 0 (campaigns): use campaign-level insights (no adset_id, no ad_id)
    // Level 1 (adsets): use adset-level insights (has adset_id, no ad_id)
    // Level 2 (ads): use ad-level insights (has ad_id)
    if (currentLevel === 0) {
      filteredInsights = filteredInsights.filter(i => !i.adset_id && !i.ad_id);
    } else if (currentLevel === 1) {
      filteredInsights = filteredInsights.filter(i => i.adset_id && !i.ad_id);
    } else {
      filteredInsights = filteredInsights.filter(i => i.ad_id);
    }

    const totalSpend = filteredInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const totalImpressions = filteredInsights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const totalClicks = filteredInsights.reduce((sum, i) => sum + (i.clicks || 0), 0);

    // Group by current level
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    filteredInsights.forEach(insight => {
      let id: string | null = null;
      if (currentLevel === 0) {
        id = insight.campaign_id;
      } else if (currentLevel === 1) {
        id = insight.adset_id;
      } else {
        id = insight.ad_id;
      }

      if (!id) return; // Skip if no ID for the current level

      if (!groups[id]) {
        groups[id] = { spend: 0, impressions: 0, clicks: 0, reach: 0 };
      }
      groups[id].spend += insight.spend || 0;
      groups[id].impressions += insight.impressions || 0;
      groups[id].clicks += insight.clicks || 0;
      groups[id].reach += insight.reach || 0;
    });

    const data: HierarchyMetrics[] = Object.entries(groups).map(([id, d]) => {
      let name = id;
      let status: string | null = null;

      if (currentLevel === 0) {
        const campaign = campaigns.find(c => c.campaign_id === id);
        name = campaign?.campaign_name || (id.match(/^\d+$/) ? `Campanha ${id}` : id);
        status = campaign?.status || null;
      } else if (currentLevel === 1) {
        const adset = adsets.find(a => a.adset_id === id);
        name = adset?.adset_name || (id.match(/^\d+$/) ? `Conjunto ${id}` : id);
        status = adset?.status || null;
      } else {
        const ad = ads.find(a => a.ad_id === id);
        name = ad?.ad_name || (id.match(/^\d+$/) ? `Anúncio ${id}` : id);
        status = ad?.status || null;
      }

      return {
        id,
        name,
        status,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        reach: d.reach,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
        cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
        percentage: totalSpend > 0 ? (d.spend / totalSpend) * 100 : 0,
      };
    }).sort((a, b) => b.spend - a.spend);

    return { data, totalSpend, totalImpressions, totalClicks };
  }, [insights, campaigns, adsets, ads, drilldownPath, currentLevel]);

  const handleDrilldown = (item: HierarchyMetrics) => {
    if (currentLevel >= 2) return; // Max level reached

    if (currentLevel === 0) {
      setDrilldownPath({ campaign: { id: item.id, name: item.name } });
    } else if (currentLevel === 1) {
      setDrilldownPath(prev => ({ ...prev, adset: { id: item.id, name: item.name } }));
    }
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === -1) {
      setDrilldownPath({});
    } else if (level === 0) {
      setDrilldownPath({ campaign: drilldownPath.campaign });
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;
    const isActive = status === 'ACTIVE';
    return (
      <Badge variant={isActive ? "default" : "secondary"} className="ml-2 text-[10px] px-1.5 py-0">
        {status}
      </Badge>
    );
  };

  // Table component
  const MetricsTable = ({ 
    data, 
    showDrilldown = false,
    onRowClick 
  }: { 
    data: HierarchyMetrics[]; 
    showDrilldown?: boolean;
    onRowClick?: (item: HierarchyMetrics) => void;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Nome</TableHead>
          <TableHead className="text-right">Gasto</TableHead>
          <TableHead className="text-right">Impressões</TableHead>
          <TableHead className="text-right">Cliques</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-right">CPC</TableHead>
          <TableHead className="text-right">CPM</TableHead>
          <TableHead className="w-[120px]">% Gasto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.slice(0, 20).map((item, index) => (
          <TableRow 
            key={item.id}
            className={cn(showDrilldown && currentLevel < 2 && "cursor-pointer hover:bg-muted/50")}
            onClick={() => showDrilldown && onRowClick?.(item)}
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate max-w-[250px]" title={item.name}>
                  {item.name}
                </span>
                {getStatusBadge(item.status)}
                {showDrilldown && currentLevel < 2 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                )}
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(item.spend)}</TableCell>
            <TableCell className="text-right">{formatNumber(item.impressions)}</TableCell>
            <TableCell className="text-right">{formatNumber(item.clicks)}</TableCell>
            <TableCell className="text-right">{item.ctr.toFixed(2)}%</TableCell>
            <TableCell className="text-right">{formatCurrency(item.cpc)}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.cpm)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Progress value={item.percentage} className="h-2" />
                <span className="text-xs text-muted-foreground w-10">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Nenhum dado disponível
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const CurrentIcon = LEVEL_CONFIG[currentField].icon;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Análise Hierárquica</h3>
          <p className="text-sm text-muted-foreground">Performance por Campanha, Conjunto e Anúncio</p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        )}
      </div>

      <Tabs defaultValue="hierarchy" className="space-y-6">
        <TabsList className="flex flex-wrap w-full gap-1">
          <TabsTrigger value="hierarchy" className="gap-1">
            <GitBranch className="w-4 h-4" />
            Hierarquia
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1">
            <Megaphone className="w-4 h-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="adsets" className="gap-1">
            <Layers className="w-4 h-4" />
            Conjuntos
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1">
            <FileImage className="w-4 h-4" />
            Anúncios
          </TabsTrigger>
        </TabsList>

        {/* Hierarchical Drilldown Tab */}
        <TabsContent value="hierarchy" className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg flex-wrap">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleBreadcrumbClick(-1)}
              className={cn("gap-1", currentLevel === 0 && "bg-primary/10 text-primary")}
            >
              <Home className="w-4 h-4" />
              Todos
            </Button>
            
            {drilldownPath.campaign && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleBreadcrumbClick(0)}
                  className={cn("gap-1", currentLevel === 1 && "bg-primary/10 text-primary")}
                >
                  <Megaphone className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{drilldownPath.campaign.name}</span>
                </Button>
              </>
            )}
            
            {drilldownPath.adset && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-1 bg-primary/10 text-primary"
                >
                  <Layers className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{drilldownPath.adset.name}</span>
                </Button>
              </>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-muted/20">
              <p className="text-sm text-muted-foreground">Gasto Total</p>
              <p className="text-2xl font-bold">{formatCurrency(drilldownAnalysis.totalSpend)}</p>
            </Card>
            <Card className="p-4 bg-muted/20">
              <p className="text-sm text-muted-foreground">Impressões</p>
              <p className="text-2xl font-bold">{formatNumber(drilldownAnalysis.totalImpressions)}</p>
            </Card>
            <Card className="p-4 bg-muted/20">
              <p className="text-sm text-muted-foreground">Cliques</p>
              <p className="text-2xl font-bold">{formatNumber(drilldownAnalysis.totalClicks)}</p>
            </Card>
          </div>

          {/* Current Level Label */}
          <div className="flex items-center gap-2">
            <CurrentIcon className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">
              {LEVEL_CONFIG[currentField].label}s
              {currentLevel < 2 && <span className="text-muted-foreground font-normal ml-2">(clique para detalhar)</span>}
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MetricsTable 
                data={drilldownAnalysis.data} 
                showDrilldown={true}
                onRowClick={handleDrilldown}
              />
            </div>
            
            <div className="flex items-center justify-center">
              {drilldownAnalysis.data.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={drilldownAnalysis.data.slice(0, 8)}
                      dataKey="spend"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {drilldownAnalysis.data.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                      />} 
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Todas as Campanhas ({campaignMetrics.length})</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MetricsTable data={campaignMetrics} />
            </div>
            <div className="flex items-center justify-center">
              {campaignMetrics.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={campaignMetrics.slice(0, 8)}
                      dataKey="spend"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {campaignMetrics.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                      />} 
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Adsets Tab */}
        <TabsContent value="adsets" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Todos os Conjuntos ({adsetMetrics.length})</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MetricsTable data={adsetMetrics} />
            </div>
            <div className="flex items-center justify-center">
              {adsetMetrics.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={adsetMetrics.slice(0, 8)}
                      dataKey="spend"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {adsetMetrics.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                      />} 
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <FileImage className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Todos os Anúncios ({adMetrics.length})</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MetricsTable data={adMetrics} />
            </div>
            <div className="flex items-center justify-center">
              {adMetrics.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={adMetrics.slice(0, 8)}
                      dataKey="spend"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {adMetrics.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                      />} 
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default MetaHierarchyAnalysis;
