import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw, Filter, Zap } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SalesTable from "@/components/SalesTable";
import SalesFilters, { FilterParams } from "@/components/SalesFilters";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterParams | null>(null);
  const { toast } = useToast();

  const fetchHotmartData = async (filters: FilterParams) => {
    try {
      setLoading(true);
      setCurrentFilters(filters);
      
      // Convert dates to timestamps
      const startTimestamp = new Date(filters.startDate).getTime();
      const endTimestamp = new Date(filters.endDate).getTime();

      const params: any = {
        start_date: startTimestamp,
        end_date: endTimestamp,
        max_results: filters.maxResults,
      };

      if (filters.transactionStatus) {
        params.transaction_status = filters.transactionStatus.toUpperCase();
      }

      console.log('Requesting with params:', params);

      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/history',
          params,
        },
      });

      if (error) throw error;

      console.log('Hotmart data received:', data);
      setSalesData(data);

      toast({
        title: "Dados carregados com sucesso!",
        description: `${data?.items?.length || 0} transações encontradas`,
      });
    } catch (error: any) {
      console.error('Error fetching Hotmart data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Não foi possível conectar à API da Hotmart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (currentFilters) {
      fetchHotmartData(currentFilters);
    }
  };

  const testConnection = async () => {
    try {
      setTestingConnection(true);
      
      // Make a minimal request to test authentication
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/summary',
          params: {},
        },
      });

      if (error) throw error;

      toast({
        title: "✓ Conexão bem-sucedida!",
        description: "As credenciais da Hotmart estão configuradas corretamente",
      });
    } catch (error: any) {
      console.error('Connection test failed:', error);
      toast({
        title: "✗ Falha na conexão",
        description: error.message || "Verifique suas credenciais da Hotmart",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Calculate metrics from real data
  const calculateMetrics = () => {
    if (!salesData?.items) {
      return {
        totalSales: "R$ 0,00",
        transactions: 0,
        customers: 0,
        growth: "0%",
      };
    }

    const items = salesData.items;
    const total = items.reduce((sum: number, item: any) => {
      return sum + (item.purchase?.price?.value || 0);
    }, 0);

    const uniqueCustomers = new Set(items.map((item: any) => item.buyer?.email)).size;

    return {
      totalSales: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(total / 100), // Hotmart returns values in cents
      transactions: items.length,
      customers: uniqueCustomers,
      growth: "+--",
    };
  };

  const parseUtmFromSourceSck = (sourceSck: string) => {
    if (!sourceSck) return {};
    
    // Format: Source|Conjunto|Campanha|Posicionamento|Criativo
    // Example: Meta-Ads|01_ADVANTAGE_ABERTA_6840169073892|PERPETUO_MAQUIAGEM35+_VENDA31_CBO_ANDROMEDA_6840169073692|Instagram_Reels|VENDA_VIDEO_06_MAKE35+_6840173725692
    const parts = sourceSck.split('|');
    
    return {
      utmSource: parts[0] || undefined,
      utmAdset: parts[1] || undefined,        // Conjunto (position 1)
      utmCampaign: parts[2] || undefined,     // Campanha (position 2)
      utmPlacement: parts[3] || undefined,
      utmCreative: parts[4] || undefined,
    };
  };

  const formatSalesData = () => {
    if (!salesData?.items) return [];

    let filteredItems = salesData.items.map((item: any) => {
      const utmData = parseUtmFromSourceSck(item.purchase?.tracking?.source_sck);
      
      return {
        transaction: item.purchase?.transaction || 'N/A',
        product: item.product?.name || 'N/A',
        buyer: item.buyer?.name || item.buyer?.email || 'N/A',
        value: item.purchase?.price?.value || 0,
        status: item.purchase?.status || 'unknown',
        date: new Date(item.purchase?.approved_date || item.purchase?.order_date).toLocaleDateString('pt-BR'),
        ...utmData,
      };
    });

    // Apply UTM filters locally
    if (currentFilters.utmSource) {
      filteredItems = filteredItems.filter(item => 
        item.utmSource?.toLowerCase().includes(currentFilters.utmSource!.toLowerCase())
      );
    }
    if (currentFilters.utmCampaign) {
      filteredItems = filteredItems.filter(item => 
        item.utmCampaign?.toLowerCase().includes(currentFilters.utmCampaign!.toLowerCase())
      );
    }
    if (currentFilters.utmAdset) {
      filteredItems = filteredItems.filter(item => 
        item.utmAdset?.toLowerCase().includes(currentFilters.utmAdset!.toLowerCase())
      );
    }
    if (currentFilters.utmPlacement) {
      filteredItems = filteredItems.filter(item => 
        item.utmPlacement?.toLowerCase().includes(currentFilters.utmPlacement!.toLowerCase())
      );
    }
    if (currentFilters.utmCreative) {
      filteredItems = filteredItems.filter(item => 
        item.utmCreative?.toLowerCase().includes(currentFilters.utmCreative!.toLowerCase())
      );
    }

    return filteredItems;
  };

  const metrics = calculateMetrics();
  const formattedSales = formatSalesData();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Dashboard Hotmart
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Consulte suas vendas e transações da API
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                disabled={testingConnection || loading}
                variant="outline"
                className="gap-2"
              >
                <Zap className={`w-4 h-4 ${testingConnection ? 'animate-pulse' : ''}`} />
                Testar Conexão
              </Button>
              {salesData && (
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <SalesFilters onFilter={fetchHotmartData} />

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Consultando API da Hotmart...</p>
            </div>
          ) : salesData ? (
            <div className="space-y-6 animate-fade-in">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Vendas Totais"
                  value={metrics.totalSales}
                  icon={DollarSign}
                />
                <MetricCard
                  title="Transações"
                  value={metrics.transactions}
                  icon={ShoppingCart}
                />
                <MetricCard
                  title="Clientes Únicos"
                  value={metrics.customers}
                  icon={Users}
                />
                <MetricCard
                  title="Total de Registros"
                  value={formattedSales.length}
                  icon={TrendingUp}
                />
              </div>

              {/* Sales Table */}
              {formattedSales.length > 0 ? (
                <SalesTable sales={formattedSales} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma transação encontrada para os filtros selecionados
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Filter className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Configure os Filtros
              </h3>
              <p className="text-muted-foreground">
                Selecione as datas e filtros desejados para buscar as transações da Hotmart
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
