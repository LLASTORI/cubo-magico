import { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, RefreshCw, Target, Megaphone, Layers, MousePointer, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface UTMAnalysisProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
}

interface HotmartSale {
  purchase: {
    offer: { code: string };
    price: { value: number };
    status: string;
  };
  buyer: { email: string };
  tracking?: {
    source_sck?: string;
  };
}

interface UTMMetrics {
  name: string;
  sales: number;
  revenue: number;
  avgTicket: number;
  percentage: number;
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

const UTMAnalysis = ({ selectedFunnel, funnelOfferCodes }: UTMAnalysisProps) => {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(today);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<HotmartSale[]>([]);

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

  // Parse source_sck format: "source|adset_name_id|campaign_name_id|placement|creative_name_id"
  const parseUTMFromSck = (sck: string | undefined): Record<string, string> => {
    if (!sck) return {};
    const parts = sck.split('|');
    
    // Format: source|adset|campaign|placement|creative
    return {
      source: parts[0] || '',
      adset: parts[1] || '',
      campaign: parts[2] || '',
      placement: parts[3] || '',
      creative: parts[4] || '',
    };
  };

  const analyzeUTM = useMemo(() => {
    const filtered = salesData.filter(sale => {
      const offerCode = sale.purchase?.offer?.code;
      const status = sale.purchase?.status;
      return funnelOfferCodes.includes(offerCode) && status === 'COMPLETE';
    });

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.purchase?.price?.value || 0), 0);

    const analyzeByField = (field: string): UTMMetrics[] => {
      const groups: Record<string, { sales: number; revenue: number }> = {};
      
      filtered.forEach(sale => {
        const sck = sale.tracking?.source_sck;
        const utmParams = parseUTMFromSck(sck);
        let value = utmParams[field] || '(não definido)';
        
        if (!groups[value]) {
          groups[value] = { sales: 0, revenue: 0 };
        }
        groups[value].sales += 1;
        groups[value].revenue += sale.purchase?.price?.value || 0;
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
  }, [salesData, funnelOfferCodes]);

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

  const UTMTable = ({ data, title, icon: Icon }: { data: UTMMetrics[]; title: string; icon: any }) => {
    const maxSales = Math.max(...data.map(d => d.sales), 1);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
              <TableHead className="w-[120px]">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((item, index) => (
              <TableRow key={item.name}>
                <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>
                  <span className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
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
  };

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Análise por UTM</h3>
          <p className="text-sm text-muted-foreground">Performance por source, campaign, adset, placement e creative</p>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : (
        <Tabs defaultValue="source" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
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
