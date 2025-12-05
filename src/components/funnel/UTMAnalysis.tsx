import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar, RefreshCw, Target, Megaphone, Layers, MousePointer, Sparkles, ChevronRight, Home, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

interface UTMAnalysisProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
  initialStartDate?: Date;
  initialEndDate?: Date;
}

interface SaleData {
  buyer_email: string | null;
  total_price_brl: number | null;
  utm_source: string | null;
  utm_campaign_id: string | null;
  utm_adset_name: string | null;
  utm_creative: string | null;
  utm_placement: string | null;
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

const UTMAnalysis = ({ selectedFunnel, funnelOfferCodes, initialStartDate, initialEndDate }: UTMAnalysisProps) => {
  const { currentProject } = useProject();
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(initialStartDate || subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(initialEndDate || today);
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  // Fetch sales data from database
  const { data: salesData, isLoading: loading, refetch } = useQuery({
    queryKey: ['utm-analysis-sales', currentProject?.id, startDate, endDate, funnelOfferCodes],
    queryFn: async () => {
      if (!currentProject?.id || funnelOfferCodes.length === 0) return [];
      
      const startUTC = formatInTimeZone(startDate, BRAZIL_TIMEZONE, "yyyy-MM-dd'T'00:00:00XXX");
      const endUTC = formatInTimeZone(endDate, BRAZIL_TIMEZONE, "yyyy-MM-dd'T'23:59:59XXX");
      
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('buyer_email, total_price_brl, utm_source, utm_campaign_id, utm_adset_name, utm_creative, utm_placement')
        .eq('project_id', currentProject.id)
        .in('status', ['APPROVED', 'COMPLETE'])
        .in('offer_code', funnelOfferCodes)
        .gte('sale_date', startUTC)
        .lte('sale_date', endUTC);
      
      if (error) throw error;
      return (data || []) as SaleData[];
    },
    enabled: !!currentProject?.id && funnelOfferCodes.length > 0,
  });

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
    if (!salesData || salesData.length === 0) {
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

    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);

    const analyzeByField = (field: string): UTMMetrics[] => {
      const groups: Record<string, { sales: number; revenue: number }> = {};
      
      salesData.forEach(sale => {
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
  }, [salesData]);

  // Analysis for hierarchical drilldown
  const drilldownAnalysis = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return { data: [], totalSales: 0, totalRevenue: 0 };
    }

    // Apply drilldown filters
    let filtered = salesData.filter(sale => {
      if (drilldownPath.source && getUtmField(sale, 'source') !== drilldownPath.source) return false;
      if (drilldownPath.campaign && getUtmField(sale, 'campaign') !== drilldownPath.campaign) return false;
      if (drilldownPath.adset && getUtmField(sale, 'adset') !== drilldownPath.adset) return false;
      if (drilldownPath.creative && getUtmField(sale, 'creative') !== drilldownPath.creative) return false;
      
      return true;
    });

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

    const data: UTMMetrics[] = Object.entries(groups)
      .map(([name, d]) => ({
        name,
        sales: d.sales,
        revenue: d.revenue,
        avgTicket: d.sales > 0 ? d.revenue / d.sales : 0,
        percentage: totalSales > 0 ? (d.sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    return { data, totalSales, totalRevenue };
  }, [salesData, drilldownPath, currentField]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDrilldown = (value: string) => {
    if (currentLevel >= 4) return;
    
    const newPath = { ...drilldownPath };
    if (currentLevel === 0) newPath.source = value;
    else if (currentLevel === 1) newPath.campaign = value;
    else if (currentLevel === 2) newPath.adset = value;
    else if (currentLevel === 3) newPath.creative = value;
    
    setDrilldownPath(newPath);
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === -1) {
      setDrilldownPath({});
    } else if (level === 0) {
      setDrilldownPath({ source: drilldownPath.source });
    } else if (level === 1) {
      setDrilldownPath({ source: drilldownPath.source, campaign: drilldownPath.campaign });
    } else if (level === 2) {
      setDrilldownPath({ source: drilldownPath.source, campaign: drilldownPath.campaign, adset: drilldownPath.adset });
    } else if (level === 3) {
      setDrilldownPath({ source: drilldownPath.source, campaign: drilldownPath.campaign, adset: drilldownPath.adset, creative: drilldownPath.creative });
    }
  };

  const UTMTable = ({ data, title, icon: Icon }: { data: UTMMetrics[]; title: string; icon: any }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h4 className="font-semibold">{title}</h4>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Valor</TableHead>
            <TableHead className="text-right">Produtos Vendidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="w-[120px]">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 10).map((item, index) => (
            <TableRow key={item.name}>
              <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>
                <span className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {item.name}
                </span>
              </TableCell>
              <TableCell className="text-right">{item.sales}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avgTicket)}</TableCell>
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
        </TableBody>
      </Table>
    </div>
  );

  const CurrentIcon = LEVEL_CONFIG[currentField].icon;

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Análise por UTM</h3>
          <p className="text-sm text-muted-foreground">Performance por source, campaign, adset, placement e creative</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Date Selectors */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <Calendar className="mr-2 h-3 w-3" />
                {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <Calendar className="mr-2 h-3 w-3" />
                {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2 ml-auto">
          {[7, 15, 30, 60].map(days => (
            <Button
              key={days}
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(subDays(today, days));
                setEndDate(today);
              }}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : (
        <Tabs defaultValue="hierarchy" className="space-y-6">
          <TabsList className="flex flex-wrap w-full gap-1">
            <TabsTrigger value="hierarchy" className="gap-1">
              <GitBranch className="w-4 h-4" />
              Hierarquia
            </TabsTrigger>
            <TabsTrigger value="source" className="gap-1">
              <Target className="w-4 h-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="campaign" className="gap-1">
              <Megaphone className="w-4 h-4" />
              Campaign
            </TabsTrigger>
            <TabsTrigger value="adset" className="gap-1">
              <Layers className="w-4 h-4" />
              Adset
            </TabsTrigger>
            <TabsTrigger value="placement" className="gap-1">
              <MousePointer className="w-4 h-4" />
              Placement
            </TabsTrigger>
            <TabsTrigger value="creative" className="gap-1">
              <Sparkles className="w-4 h-4" />
              Creative
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
              
              {drilldownPath.source && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBreadcrumbClick(0)}
                    className={cn("gap-1", currentLevel === 1 && "bg-primary/10 text-primary")}
                  >
                    <Target className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{drilldownPath.source}</span>
                  </Button>
                </>
              )}
              
              {drilldownPath.campaign && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBreadcrumbClick(1)}
                    className={cn("gap-1", currentLevel === 2 && "bg-primary/10 text-primary")}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{drilldownPath.campaign}</span>
                  </Button>
                </>
              )}
              
              {drilldownPath.adset && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBreadcrumbClick(2)}
                    className={cn("gap-1", currentLevel === 3 && "bg-primary/10 text-primary")}
                  >
                    <Layers className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{drilldownPath.adset}</span>
                  </Button>
                </>
              )}
              
              {drilldownPath.creative && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBreadcrumbClick(3)}
                    className={cn("gap-1", currentLevel === 4 && "bg-primary/10 text-primary")}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{drilldownPath.creative}</span>
                  </Button>
                </>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Vendas Filtradas</p>
                <p className="text-2xl font-bold">{drilldownAnalysis.totalSales}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Receita Filtrada</p>
                <p className="text-2xl font-bold">{formatCurrency(drilldownAnalysis.totalRevenue)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Nível Atual</p>
                <div className="flex items-center gap-2">
                  <CurrentIcon className="w-5 h-5 text-primary" />
                  <p className="text-2xl font-bold">{LEVEL_CONFIG[currentField].label}</p>
                </div>
              </Card>
            </div>

            {/* Drilldown Table and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CurrentIcon className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Por {LEVEL_CONFIG[currentField].label}</h4>
                  {currentLevel < 4 && (
                    <Badge variant="secondary" className="ml-2">
                      Clique para expandir
                    </Badge>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Produtos Vendidos</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="w-[100px]">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownAnalysis.data.slice(0, 15).map((item, index) => (
                      <TableRow 
                        key={item.name}
                        className={cn(
                          currentLevel < 4 && "cursor-pointer hover:bg-primary/5 transition-colors"
                        )}
                        onClick={() => currentLevel < 4 && handleDrilldown(item.name)}
                      >
                        <TableCell className="font-medium max-w-[200px]" title={item.name}>
                          <span className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="truncate">{item.name}</span>
                            {currentLevel < 4 && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.sales}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.avgTicket)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={item.percentage} className="h-2 w-12" />
                            <span className="text-xs text-muted-foreground w-10">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {drilldownAnalysis.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum dado encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <ChartContainer config={chartConfig} className="h-[400px]">
                <PieChart>
                  <Pie
                    data={drilldownAnalysis.data.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="sales"
                    label={({ name, percentage }) => {
                      const displayName = name.length > 12 ? `${name.substring(0, 12)}...` : name;
                      return `${displayName} (${percentage.toFixed(0)}%)`;
                    }}
                  >
                    {drilldownAnalysis.data.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </TabsContent>

          {/* Individual UTM Tabs */}
          <TabsContent value="source">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UTMTable data={analyzeUTM.source} title="Por Source" icon={Target} />
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={analyzeUTM.source.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="sales"
                    label={({ name, percentage }) => `${name.substring(0, 10)}... (${percentage.toFixed(0)}%)`}
                  >
                    {analyzeUTM.source.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="campaign">
            <UTMTable data={analyzeUTM.campaign} title="Por Campaign" icon={Megaphone} />
          </TabsContent>

          <TabsContent value="adset">
            <UTMTable data={analyzeUTM.adset} title="Por Adset" icon={Layers} />
          </TabsContent>

          <TabsContent value="placement">
            <UTMTable data={analyzeUTM.placement} title="Por Placement" icon={MousePointer} />
          </TabsContent>

          <TabsContent value="creative">
            <UTMTable data={analyzeUTM.creative} title="Por Creative" icon={Sparkles} />
          </TabsContent>
        </Tabs>
      )}
    </Card>
  );
};

export default UTMAnalysis;
