import { useState, useEffect, useMemo } from "react";
import { format, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, RefreshCw, Users, UserPlus, Repeat, ShoppingCart, Package, MessageCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";

interface CustomerCohortProps {
  selectedFunnel: string;
  funnelOfferCodes: string[];
}

interface HotmartSale {
  purchase: {
    offer: { code: string };
    price: { value: number };
    status: string;
    order_date: number;
  };
  buyer: { 
    email: string; 
    name?: string;
    checkout_phone?: string;
  };
}

interface CustomerData {
  email: string;
  name: string;
  phone: string | null;
  totalPurchases: number; // Total distinct sales (each offer = 1 sale)
  totalSpent: number;
  firstPurchase: Date;
  lastPurchase: Date;
  daysBetweenPurchases: number;
  products: string[];
  isRecurrent: boolean;
  otherFunnels: string[]; // Names of other funnels where customer bought
  otherFunnelProducts: { funnel: string; products: string[] }[]; // Products grouped by other funnels
}

interface CohortMetrics {
  uniqueCustomers: number;
  newCustomers: number;
  recurrentCustomers: number;
  avgPurchasesPerCustomer: number;
  avgSpentPerCustomer: number;
  topCustomers: CustomerData[];
  allCustomers: CustomerData[]; // Full list for filtering
  purchaseDistribution: { purchases: string; count: number; percentage: number }[];
}

type CustomerFilter = 'all' | 'new' | 'recurrent';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(197, 71%, 52%)',
];

const chartConfig = {
  count: { label: "Clientes", color: "hsl(var(--primary))" },
  newCustomers: { label: "Novos", color: "hsl(142, 76%, 36%)" },
  recurrentCustomers: { label: "Recorrentes", color: "hsl(262, 83%, 58%)" },
};

interface OfferMapping {
  codigo_oferta: string;
  nome_produto: string;
  id_funil: string;
}

const CustomerCohort = ({ selectedFunnel, funnelOfferCodes }: CustomerCohortProps) => {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(subDays(today, 30));
  const [endDate, setEndDate] = useState<Date>(today);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<HotmartSale[]>([]);
  const [offerMappings, setOfferMappings] = useState<OfferMapping[]>([]);
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>('all');

  // Create a map of offer code to product name
  const offerToProductName = useMemo(() => {
    const map: Record<string, string> = {};
    offerMappings.forEach(m => {
      if (m.codigo_oferta) {
        map[m.codigo_oferta] = m.nome_produto;
      }
    });
    return map;
  }, [offerMappings]);

  // Create a map of offer code to funnel id
  const offerToFunnelId = useMemo(() => {
    const map: Record<string, string> = {};
    offerMappings.forEach(m => {
      if (m.codigo_oferta) {
        map[m.codigo_oferta] = m.id_funil;
      }
    });
    return map;
  }, [offerMappings]);

  // Fetch offer mappings
  useEffect(() => {
    const fetchMappings = async () => {
      const { data } = await supabase
        .from('offer_mappings')
        .select('codigo_oferta, nome_produto, id_funil');
      if (data) setOfferMappings(data);
    };
    fetchMappings();
  }, []);

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

  // First, group ALL sales by customer to understand cross-funnel behavior
  const cohortMetrics = useMemo((): CohortMetrics => {
    // Get all completed sales
    const allCompletedSales = salesData.filter(sale => sale.purchase?.status === 'COMPLETE');
    
    // Build a map of ALL customer purchases (across all offers/funnels)
    const customerAllPurchases: Record<string, {
      email: string;
      name: string;
      phone: string | null;
      allSales: { date: Date; value: number; offerCode: string; funnelId: string | null }[];
    }> = {};
    
    allCompletedSales.forEach(sale => {
      const email = sale.buyer?.email || 'unknown';
      const name = sale.buyer?.name || email;
      const phone = sale.buyer?.checkout_phone || null;
      const offerCode = sale.purchase?.offer?.code || '';
      const funnelId = offerToFunnelId[offerCode] || null;
      
      if (!customerAllPurchases[email]) {
        customerAllPurchases[email] = { email, name, phone, allSales: [] };
      }
      
      if (!customerAllPurchases[email].phone && phone) {
        customerAllPurchases[email].phone = phone;
      }
      
      customerAllPurchases[email].allSales.push({
        date: new Date(sale.purchase?.order_date || Date.now()),
        value: sale.purchase?.price?.value || 0,
        offerCode,
        funnelId,
      });
    });

    // Now filter to only customers who bought in the current funnel
    const customersInCurrentFunnel = Object.values(customerAllPurchases).filter(c => 
      c.allSales.some(s => funnelOfferCodes.includes(s.offerCode))
    );

    // Calculate customer metrics
    const customers: CustomerData[] = customersInCurrentFunnel.map(c => {
      // Sales in current funnel
      const salesInFunnel = c.allSales.filter(s => funnelOfferCodes.includes(s.offerCode));
      // Sales outside current funnel (other funnels or no funnel)
      const salesOutsideFunnel = c.allSales.filter(s => !funnelOfferCodes.includes(s.offerCode));
      
      const sortedSalesInFunnel = salesInFunnel.sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstPurchase = sortedSalesInFunnel[0]?.date || new Date();
      const lastPurchase = sortedSalesInFunnel[sortedSalesInFunnel.length - 1]?.date || new Date();
      const totalSpent = salesInFunnel.reduce((sum, s) => sum + s.value, 0);
      const products = [...new Set(salesInFunnel.map(s => s.offerCode))];
      
      // Total purchases = count all distinct sales (each product is a sale)
      const totalPurchases = c.allSales.length;
      
      // Check if customer has purchases outside this funnel
      const hasOtherSales = salesOutsideFunnel.length > 0;
      
      // Group products by funnel for other funnels
      const funnelProductsMap: Record<string, Set<string>> = {};
      salesOutsideFunnel.forEach(s => {
        const funnelName = s.funnelId || 'Sem funil';
        if (funnelName !== selectedFunnel) {
          if (!funnelProductsMap[funnelName]) {
            funnelProductsMap[funnelName] = new Set();
          }
          funnelProductsMap[funnelName].add(s.offerCode);
        }
      });
      
      // Convert to array format
      const otherFunnelProducts = Object.entries(funnelProductsMap).map(([funnel, productsSet]) => ({
        funnel,
        products: [...productsSet],
      }));
      
      const otherFunnels = otherFunnelProducts.map(f => f.funnel);
      
      let avgDaysBetween = 0;
      if (sortedSalesInFunnel.length > 1) {
        const totalDays = differenceInDays(lastPurchase, firstPurchase);
        avgDaysBetween = totalDays / (sortedSalesInFunnel.length - 1);
      }

      return {
        email: c.email,
        name: c.name,
        phone: c.phone,
        totalPurchases, // Total sales across ALL offers
        totalSpent,
        firstPurchase,
        lastPurchase,
        daysBetweenPurchases: avgDaysBetween,
        products,
        isRecurrent: hasOtherSales,
        otherFunnels,
        otherFunnelProducts,
      };
    });

    const uniqueCustomers = customers.length;
    const newCustomers = customers.filter(c => !c.isRecurrent).length;
    const recurrentCustomers = customers.filter(c => c.isRecurrent).length;
    
    // For average, count total products bought in this funnel
    const totalProducts = customers.reduce((sum, c) => sum + c.products.length, 0);
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    // Product count distribution (how many products per customer in this funnel)
    // Enhanced with revenue insights
    const productGroups: Record<string, CustomerData[]> = {};
    customers.forEach(c => {
      const key = c.products.length >= 5 ? '5+' : c.products.length.toString();
      if (!productGroups[key]) productGroups[key] = [];
      productGroups[key].push(c);
    });

    const avgTicketGlobal = uniqueCustomers > 0 ? totalSpent / uniqueCustomers : 0;
    const avgProductsPerCustomer = uniqueCustomers > 0 ? totalProducts / uniqueCustomers : 0;

    const purchaseDistribution = ['1', '2', '3', '4', '5+'].map(key => {
      const groupCustomers = productGroups[key] || [];
      const groupCount = groupCustomers.length;
      const groupRevenue = groupCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
      const groupAvgTicket = groupCount > 0 ? groupRevenue / groupCount : 0;
      const groupNewCount = groupCustomers.filter(c => !c.isRecurrent).length;
      const groupRecurrentCount = groupCustomers.filter(c => c.isRecurrent).length;
      
      // Calculate potential revenue if they bought one more product
      const avgProductPrice = groupCount > 0 && groupCustomers[0]?.products.length > 0
        ? groupRevenue / groupCustomers.reduce((sum, c) => sum + c.products.length, 0)
        : 0;
      const potentialRevenue = groupCount * avgProductPrice;
      
      // Top 5 customer names for tooltip
      const topCustomerNames = groupCustomers
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
        .map(c => c.name);

      return {
        purchases: key === '1' ? '1 produto' : key === '5+' ? '5+ produtos' : `${key} produtos`,
        key,
        count: groupCount,
        percentage: uniqueCustomers > 0 ? (groupCount / uniqueCustomers) * 100 : 0,
        revenue: groupRevenue,
        avgTicket: groupAvgTicket,
        newCount: groupNewCount,
        recurrentCount: groupRecurrentCount,
        potentialRevenue,
        avgProductPrice,
        topCustomerNames,
        revenuePercentage: totalSpent > 0 ? (groupRevenue / totalSpent) * 100 : 0,
      };
    });

    // Top customers by spending
    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      uniqueCustomers,
      newCustomers,
      recurrentCustomers,
      avgPurchasesPerCustomer: uniqueCustomers > 0 ? totalProducts / uniqueCustomers : 0,
      avgSpentPerCustomer: uniqueCustomers > 0 ? totalSpent / uniqueCustomers : 0,
      topCustomers,
      allCustomers: customers.sort((a, b) => b.totalSpent - a.totalSpent), // Full sorted list
      purchaseDistribution,
    };
  }, [salesData, funnelOfferCodes, offerToFunnelId, selectedFunnel]);

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

  // Export customers to CSV
  const exportToCSV = () => {
    const headers = [
      'Nome',
      'Email',
      'Telefone',
      'Compras (Recorrência)',
      'Produtos (neste funil)',
      'Total Gasto',
      'Ticket Médio',
      'Status',
      'Outros Funis',
      'Produtos Outros Funis'
    ];
    
    const rows = filteredCustomers.map(c => [
      c.name,
      c.email,
      c.phone || '',
      1 + c.otherFunnels.length,
      c.products.length,
      c.totalSpent.toFixed(2),
      (c.totalSpent / c.products.length).toFixed(2),
      c.isRecurrent ? 'Recorrente' : 'Novo',
      c.otherFunnels.join('; '),
      c.otherFunnelProducts.map(f => `${f.funnel}: ${f.products.map(p => offerToProductName[p] || p).join(', ')}`).join(' | ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ranking-clientes-${selectedFunnel}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  // Filter customers based on selected filter
  const filteredCustomers = useMemo(() => {
    let customers = cohortMetrics.allCustomers;
    if (customerFilter === 'new') {
      customers = cohortMetrics.allCustomers.filter(c => !c.isRecurrent);
    } else if (customerFilter === 'recurrent') {
      customers = cohortMetrics.allCustomers.filter(c => c.isRecurrent);
    }
    // Limit to top 50 for performance
    return customers.slice(0, 50);
  }, [cohortMetrics.allCustomers, customerFilter]);

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Análise de Clientes</h3>
          <p className="text-sm text-muted-foreground">Comportamento de compra e recorrência</p>
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">Total Clientes</span>
              </div>
              <p className="text-2xl font-bold">{cohortMetrics.uniqueCustomers}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-green-500" />
                <span className="text-xs text-muted-foreground">Novos (só este funil)</span>
              </div>
              <p className="text-2xl font-bold">{cohortMetrics.newCustomers}</p>
              <p className="text-xs text-muted-foreground">
                {cohortMetrics.uniqueCustomers > 0 
                  ? `${((cohortMetrics.newCustomers / cohortMetrics.uniqueCustomers) * 100).toFixed(0)}%`
                  : '0%'}
              </p>
            </div>
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="w-5 h-5 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Recorrentes (outros funis)</span>
                  </div>
                  <p className="text-2xl font-bold">{cohortMetrics.recurrentCustomers}</p>
                  <p className="text-xs text-muted-foreground">
                    {cohortMetrics.uniqueCustomers > 0 
                      ? `${((cohortMetrics.recurrentCustomers / cohortMetrics.uniqueCustomers) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-96" align="start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold">Clientes Recorrentes</span>
                    <Badge variant="secondary" className="ml-auto">
                      {cohortMetrics.recurrentCustomers} clientes
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {cohortMetrics.allCustomers
                      .filter(c => c.isRecurrent)
                      .slice(0, 15)
                      .map((customer, idx) => (
                        <div key={idx} className="p-2 rounded-md bg-muted/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate max-w-[200px]">{customer.name}</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(customer.totalSpent)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                          {customer.otherFunnelProducts.map((funnelData, fIdx) => (
                            <div key={fIdx} className="pl-2 border-l-2 border-purple-500/30 space-y-1">
                              <span className="text-xs font-medium text-purple-600">{funnelData.funnel}</span>
                              <div className="flex flex-wrap gap-1">
                                {funnelData.products.map((productCode, pIdx) => (
                                  <Badge key={pIdx} variant="outline" className="text-xs">
                                    {offerToProductName[productCode] || productCode}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                  {cohortMetrics.recurrentCustomers > 15 && (
                    <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                      Mostrando 15 de {cohortMetrics.recurrentCustomers} clientes recorrentes
                    </p>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                <span className="text-xs text-muted-foreground">Média Produtos/Cliente</span>
              </div>
              <p className="text-2xl font-bold">{cohortMetrics.avgPurchasesPerCustomer.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(cohortMetrics.avgSpentPerCustomer)} médio
              </p>
            </div>
          </div>

          {/* Purchase Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Distribuição por Nº de Produtos</h4>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={cohortMetrics.purchaseDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="purchases" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-4 max-w-xs">
                          <div className="font-semibold text-sm mb-2">{data.purchases}</div>
                          
                          {/* Métricas principais */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                            <span className="text-muted-foreground">Clientes:</span>
                            <span className="font-medium">{data.count} ({data.percentage.toFixed(1)}%)</span>
                            
                            <span className="text-muted-foreground">Receita:</span>
                            <span className="font-medium">{formatCurrency(data.revenue)}</span>
                            
                            <span className="text-muted-foreground">% da Receita:</span>
                            <span className="font-medium">{data.revenuePercentage.toFixed(1)}%</span>
                            
                            <span className="text-muted-foreground">Ticket Médio:</span>
                            <span className="font-medium">{formatCurrency(data.avgTicket)}</span>
                          </div>
                          
                          {/* Composição */}
                          <div className="text-xs border-t pt-2 mb-2">
                            <span className="text-muted-foreground">Composição: </span>
                            <span className="text-green-600">{data.newCount} novos</span>
                            <span className="text-muted-foreground"> | </span>
                            <span className="text-purple-600">{data.recurrentCount} recorrentes</span>
                          </div>
                          
                          {/* Insight de oportunidade */}
                          {data.key !== '5+' && data.count > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 text-xs">
                              <div className="font-medium text-amber-700 mb-1">💡 Oportunidade de Upsell</div>
                              <p className="text-muted-foreground">
                                Se cada cliente comprasse +1 produto, potencial de <span className="font-semibold text-amber-700">{formatCurrency(data.potentialRevenue)}</span> adicional
                              </p>
                            </div>
                          )}
                          
                          {/* Top clientes */}
                          {data.topCustomerNames.length > 0 && (
                            <div className="mt-2 pt-2 border-t text-xs">
                              <span className="text-muted-foreground">Top clientes: </span>
                              <span className="text-foreground">{data.topCustomerNames.slice(0, 3).join(', ')}</span>
                              {data.topCustomerNames.length > 3 && <span className="text-muted-foreground"> +{data.topCustomerNames.length - 3}</span>}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Novos vs Recorrentes</h4>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Novos', value: cohortMetrics.newCustomers, color: COLORS[1] },
                      { name: 'Recorrentes', value: cohortMetrics.recurrentCustomers, color: COLORS[2] },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill={COLORS[1]} />
                    <Cell fill={COLORS[2]} />
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </div>

          {/* Top Customers Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold">Top 50 Clientes (por valor gasto)</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={customerFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerFilter('all')}
                >
                  Todos ({cohortMetrics.uniqueCustomers})
                </Button>
                <Button
                  variant={customerFilter === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerFilter('new')}
                >
                  Novos ({cohortMetrics.newCustomers})
                </Button>
                <Button
                  variant={customerFilter === 'recurrent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerFilter('recurrent')}
                >
                  Recorrentes ({cohortMetrics.recurrentCustomers})
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Produtos</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer, index) => (
                  <TableRow key={customer.email}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors">
                            <p className="font-medium truncate max-w-[200px] text-primary underline-offset-2 hover:underline" title={customer.name}>
                              {customer.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={customer.email}>
                              {customer.email}
                            </p>
                            {customer.phone && (
                              <a 
                                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle className="w-3 h-3" />
                                {customer.phone}
                              </a>
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80" align="start">
                          <div className="space-y-3">
                            {customer.phone && (
                              <a 
                                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">{customer.phone}</span>
                                <span className="text-xs text-muted-foreground ml-auto">Abrir WhatsApp</span>
                              </a>
                            )}
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="font-semibold">Produtos Comprados</span>
                              <Badge variant="secondary" className="ml-auto">
                                {customer.products.length} {customer.products.length === 1 ? 'produto' : 'produtos'}
                              </Badge>
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {customer.products.map((productCode, idx) => (
                                <div key={idx} className="flex flex-col gap-1 p-2 rounded-md bg-muted/50">
                                  <span className="text-sm font-medium">
                                    {offerToProductName[productCode] || 'Produto não mapeado'}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {productCode}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t text-xs text-muted-foreground">
                              <p>Total de compras: {customer.totalPurchases}</p>
                              <p>Primeira compra: {format(customer.firstPurchase, "dd/MM/yyyy", { locale: ptBR })}</p>
                              <p>Última compra: {format(customer.lastPurchase, "dd/MM/yyyy", { locale: ptBR })}</p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell className="text-right">
                      {1 + customer.otherFunnels.length}
                    </TableCell>
                    <TableCell className="text-right">{customer.products.length}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(customer.totalSpent / customer.products.length)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={customer.isRecurrent ? "default" : "secondary"}>
                          {customer.isRecurrent ? 'Recorrente' : 'Novo'}
                        </Badge>
                        {customer.isRecurrent && customer.otherFunnelProducts.length > 0 && (
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <div className="flex flex-wrap gap-1 cursor-pointer">
                                {customer.otherFunnels.slice(0, 2).map((funnel, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs hover:bg-muted">
                                    {funnel}
                                  </Badge>
                                ))}
                                {customer.otherFunnels.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{customer.otherFunnels.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80" align="end">
                              <div className="space-y-2">
                                <span className="text-sm font-semibold">Outros Funis e Produtos</span>
                                {customer.otherFunnelProducts.map((funnelData, fIdx) => (
                                  <div key={fIdx} className="pl-2 border-l-2 border-purple-500/30 space-y-1">
                                    <span className="text-xs font-medium text-purple-600">{funnelData.funnel}</span>
                                    <div className="flex flex-wrap gap-1">
                                      {funnelData.products.map((productCode, pIdx) => (
                                        <Badge key={pIdx} variant="secondary" className="text-xs">
                                          {offerToProductName[productCode] || productCode}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CustomerCohort;
