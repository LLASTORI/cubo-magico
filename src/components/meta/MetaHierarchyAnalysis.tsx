import { useState, useMemo } from "react";
import { Megaphone, Layers, FileImage, ChevronRight, Home, GitBranch, RefreshCw, ExternalLink, Copy, Check } from "lucide-react";
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
  
  // Debug log
  console.log(`[MetaHierarchy] Received: ${campaigns.length} campaigns, ${adsets.length} adsets, ${ads.length} ads, ${insights.length} insights`);

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

  // All insights are now at AD LEVEL ONLY
  // We aggregate UP to campaign and adset levels from ad-level data
  
  // Get only ad-level insights (the only type we have now)
  const adLevelInsights = useMemo(() => {
    return insights.filter(i => i.ad_id !== null);
  }, [insights]);

  // Calculate metrics by campaign - AGGREGATE from ad-level insights
  const campaignMetrics = useMemo((): HierarchyMetrics[] => {
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    // Aggregate all ad-level insights by campaign_id
    adLevelInsights.forEach(insight => {
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
  }, [adLevelInsights, campaigns]);

  // Calculate metrics by adset - AGGREGATE from ad-level insights
  const adsetMetrics = useMemo((): HierarchyMetrics[] => {
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    // Aggregate all ad-level insights by adset_id
    adLevelInsights.forEach(insight => {
      const adsetId = insight.adset_id;
      if (!adsetId) return;
      
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
  }, [adLevelInsights, adsets]);

  // Calculate metrics by ad - directly use ad-level insights
  const adMetrics = useMemo((): HierarchyMetrics[] => {
    const groups: Record<string, { spend: number; impressions: number; clicks: number; reach: number }> = {};
    
    adLevelInsights.forEach(insight => {
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
  }, [adLevelInsights, ads]);

  // Hierarchical drilldown analysis - ALL from ad-level insights
  const drilldownAnalysis = useMemo(() => {
    // Start with ad-level insights only
    let filteredInsights = [...adLevelInsights];

    // Apply drilldown filters
    if (drilldownPath.campaign) {
      filteredInsights = filteredInsights.filter(i => i.campaign_id === drilldownPath.campaign?.id);
    }
    if (drilldownPath.adset) {
      filteredInsights = filteredInsights.filter(i => i.adset_id === drilldownPath.adset?.id);
    }

    // Group by current level (aggregate from ad-level data)
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

      if (!id) return;

      if (!groups[id]) {
        groups[id] = { spend: 0, impressions: 0, clicks: 0, reach: 0 };
      }
      groups[id].spend += insight.spend || 0;
      groups[id].impressions += insight.impressions || 0;
      groups[id].clicks += insight.clicks || 0;
      groups[id].reach += insight.reach || 0;
    });

    const totalSpend = Object.values(groups).reduce((sum, g) => sum + g.spend, 0);
    const totalImpressions = Object.values(groups).reduce((sum, g) => sum + g.impressions, 0);
    const totalClicks = Object.values(groups).reduce((sum, g) => sum + g.clicks, 0);

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
  }, [adLevelInsights, campaigns, adsets, ads, drilldownPath, currentLevel]);

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

  // State for copied ID feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAd = (adId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.facebook.com/ads/library/?id=${adId}`, '_blank');
  };

  // Table component
  const MetricsTable = ({ 
    data, 
    showDrilldown = false,
    showAdActions = false,
    onRowClick 
  }: { 
    data: HierarchyMetrics[]; 
    showDrilldown?: boolean;
    showAdActions?: boolean;
    onRowClick?: (item: HierarchyMetrics) => void;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[280px]">Nome</TableHead>
          {showAdActions && <TableHead className="w-[140px]">ID do Anúncio</TableHead>}
          <TableHead className="text-right">Gasto</TableHead>
          <TableHead className="text-right">Impressões</TableHead>
          <TableHead className="text-right">Cliques</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-right">CPC</TableHead>
          <TableHead className="text-right">CPM</TableHead>
          <TableHead className="w-[100px]">% Gasto</TableHead>
          {showAdActions && <TableHead className="w-[80px] text-center">Ver</TableHead>}
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
                <span className="truncate max-w-[220px]" title={item.name}>
                  {item.name}
                </span>
                {getStatusBadge(item.status)}
                {showDrilldown && currentLevel < 2 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                )}
              </div>
            </TableCell>
            {showAdActions && (
              <TableCell>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    {item.id.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleCopyId(item.id, e)}
                    title="Copiar ID completo"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
            )}
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
            {showAdActions && (
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => handleOpenAd(item.id, e)}
                  title="Ver anúncio na Biblioteca de Anúncios"
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={showAdActions ? 10 : 8} className="text-center text-muted-foreground py-8">
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
                showAdActions={currentLevel === 2}
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
              <MetricsTable data={adMetrics} showAdActions />
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
