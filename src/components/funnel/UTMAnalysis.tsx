import { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, RefreshCw, Target, Megaphone, Layers, MousePointer, Sparkles, ChevronRight, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface UTMAnalysisProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
}

interface HotmartSale {
  purchase: {
    offer: { code: string };
    price: { value: number };
    status: string;
    tracking?: {
      source_sck?: string;
    };
  };
  buyer: { email: string };
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
  adset?: string;
  campaign?: string;
  placement?: string;
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
  sales: { label: "Vendas", color: "hsl(var(--primary))" },
  revenue: { label: "Receita", color: "hsl(142, 76%, 36%)" },
};

const HIERARCHY = ['source', 'adset', 'campaign', 'placement', 'creative'] as const;
type HierarchyLevel = typeof HIERARCHY[number];

const LEVEL_CONFIG: Record<HierarchyLevel, { label: string; icon: any }> = {
  source: { label: 'Source', icon: Target },
  adset: { label: 'Adset', icon: Layers },
  campaign: { label: 'Campaign', icon: Megaphone },
  placement: { label: 'Placement', icon: MousePointer },
  creative: { label: 'Creative', icon: Sparkles },
};

const UTMAnalysis = ({ selectedFunnel, funnelOfferCodes }: UTMAnalysisProps) => {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(today);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<HotmartSale[]>([]);
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  const currentLevel = useMemo(() => {
    if (!drilldownPath.source) return 0;
    if (!drilldownPath.adset) return 1;
    if (!drilldownPath.campaign) return 2;
    if (!drilldownPath.placement) return 3;
    return 4;
  }, [drilldownPath]);

  const currentField = HIERARCHY[currentLevel];

  const fetchDataFromAPI = async (): Promise<HotmartSale[]> => {
    const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    let allItems: HotmartSale[] = [];
    let nextPageToken: string | null = null;
    
    do {
      const params: any = { start_date: startUTC, end_date: endUTC, max_results: 500 };
      if (nextPageToken) params.page_token = nextPageToken;

      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: { endpoint: '/sales/history', params },
      });

      if (error) throw error;
      if (data?.items) allItems = [...allItems, ...data.items];
      nextPageToken = data?.page_info?.next_page_token || null;
    } while (nextPageToken);

    return allItems;
  };

  const parseUTMFromSck = (sck: string | undefined): Record<string, string> => {
    if (!sck) return {};
    const parts = sck.split('|');
    
    return {
      source: parts[0] || '',
      adset: parts[1] || '',
      campaign: parts[2] || '',
      placement: parts[3] || '',
      creative: parts[4] || '',
    };
  };

  const filteredAndAnalyzedData = useMemo(() => {
    // First filter by funnel offer codes and status
    let filtered = salesData.filter(sale => {
      const offerCode = sale.purchase?.offer?.code;
      const status = sale.purchase?.status;
      return funnelOfferCodes.includes(offerCode) && (status === 'COMPLETE' || status === 'APPROVED');
    });

    // Then filter by drilldown path
    filtered = filtered.filter(sale => {
      const sck = sale.purchase?.tracking?.source_sck;
      const utmParams = parseUTMFromSck(sck);
      
      if (drilldownPath.source && utmParams.source !== drilldownPath.source) return false;
      if (drilldownPath.adset && utmParams.adset !== drilldownPath.adset) return false;
      if (drilldownPath.campaign && utmParams.campaign !== drilldownPath.campaign) return false;
      if (drilldownPath.placement && utmParams.placement !== drilldownPath.placement) return false;
      
      return true;
    });

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.purchase?.price?.value || 0), 0);

    // Analyze by current field
    const groups: Record<string, { sales: number; revenue: number }> = {};
    
    filtered.forEach(sale => {
      const sck = sale.purchase?.tracking?.source_sck;
      const utmParams = parseUTMFromSck(sck);
      let value = utmParams[currentField] || '(não definido)';
      
      if (!groups[value]) {
        groups[value] = { sales: 0, revenue: 0 };
      }
      groups[value].sales += 1;
      groups[value].revenue += sale.purchase?.price?.value || 0;
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
  }, [salesData, funnelOfferCodes, drilldownPath, currentField]);

  const loadData = async () => {
    if (funnelOfferCodes.length === 0) {
      toast.error('Nenhuma oferta configurada para este funil');
      return;
    }

    setLoading(true);
    try {
      const sales = await fetchDataFromAPI();
      setSalesData(sales);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFunnel && funnelOfferCodes.length > 0) {
      loadData();
    }
  }, [selectedFunnel, funnelOfferCodes.join(',')]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDrilldown = (value: string) => {
    if (currentLevel >= 4) return; // Already at creative level
    
    const newPath = { ...drilldownPath };
    if (currentLevel === 0) newPath.source = value;
    else if (currentLevel === 1) newPath.adset = value;
    else if (currentLevel === 2) newPath.campaign = value;
    else if (currentLevel === 3) newPath.placement = value;
    
    setDrilldownPath(newPath);
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === -1) {
      setDrilldownPath({});
    } else if (level === 0) {
      setDrilldownPath({ source: drilldownPath.source });
    } else if (level === 1) {
      setDrilldownPath({ source: drilldownPath.source, adset: drilldownPath.adset });
    } else if (level === 2) {
      setDrilldownPath({ source: drilldownPath.source, adset: drilldownPath.adset, campaign: drilldownPath.campaign });
    } else if (level === 3) {
      setDrilldownPath({ source: drilldownPath.source, adset: drilldownPath.adset, campaign: drilldownPath.campaign, placement: drilldownPath.placement });
    }
  };

  const CurrentIcon = LEVEL_CONFIG[currentField].icon;

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Análise por UTM</h3>
          <p className="text-sm text-muted-foreground">Clique em um valor para navegar na hierarquia</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
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

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-muted/30 rounded-lg flex-wrap">
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
              <span className="max-w-[150px] truncate">{drilldownPath.source}</span>
            </Button>
          </>
        )}
        
        {drilldownPath.adset && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleBreadcrumbClick(1)}
              className={cn("gap-1", currentLevel === 2 && "bg-primary/10 text-primary")}
            >
              <Layers className="w-3 h-3" />
              <span className="max-w-[150px] truncate">{drilldownPath.adset}</span>
            </Button>
          </>
        )}
        
        {drilldownPath.campaign && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleBreadcrumbClick(2)}
              className={cn("gap-1", currentLevel === 3 && "bg-primary/10 text-primary")}
            >
              <Megaphone className="w-3 h-3" />
              <span className="max-w-[150px] truncate">{drilldownPath.campaign}</span>
            </Button>
          </>
        )}
        
        {drilldownPath.placement && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleBreadcrumbClick(3)}
              className={cn("gap-1", currentLevel === 4 && "bg-primary/10 text-primary")}
            >
              <MousePointer className="w-3 h-3" />
              <span className="max-w-[150px] truncate">{drilldownPath.placement}</span>
            </Button>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Vendas Filtradas</p>
          <p className="text-2xl font-bold">{filteredAndAnalyzedData.totalSales}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Receita Filtrada</p>
          <p className="text-2xl font-bold">{formatCurrency(filteredAndAnalyzedData.totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Nível Atual</p>
          <div className="flex items-center gap-2">
            <CurrentIcon className="w-5 h-5 text-primary" />
            <p className="text-2xl font-bold">{LEVEL_CONFIG[currentField].label}</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table */}
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
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ticket</TableHead>
                  <TableHead className="w-[100px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndAnalyzedData.data.slice(0, 15).map((item, index) => (
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
                {filteredAndAnalyzedData.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum dado encontrado para os filtros selecionados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Chart */}
          <ChartContainer config={chartConfig} className="h-[400px]">
            <PieChart>
              <Pie
                data={filteredAndAnalyzedData.data.slice(0, 8)}
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
                {filteredAndAnalyzedData.data.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </div>
      )}
    </Card>
  );
};

export default UTMAnalysis;
