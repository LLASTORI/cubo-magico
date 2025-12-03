import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw, Filter, Zap, Settings, BarChart3, LogOut, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MetricCard from "@/components/MetricCard";
import SalesTable from "@/components/SalesTable";
import SalesFilters, { FilterParams } from "@/components/SalesFilters";
import ProjectSelector from "@/components/ProjectSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { CuboBrand } from "@/components/CuboLogo";
import { CubeLoader } from "@/components/CubeLoader";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterParams | null>(null);
  const [offerMappings, setOfferMappings] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentProject, credentials, markCredentialsValidated } = useProject();

  // Clear all data when project changes to avoid cross-project data leakage
  useEffect(() => {
    setSalesData(null);
    setCurrentFilters(null);
    setOfferMappings([]);
  }, [currentProject?.id]);

  // Redirect if no project or credentials not validated
  useEffect(() => {
    if (currentProject && credentials && !credentials.is_validated) {
      toast({
        title: "Credenciais não validadas",
        description: "Configure e teste as credenciais do projeto antes de continuar",
        variant: "destructive",
      });
      navigate('/projects');
    }
  }, [currentProject, credentials, navigate, toast]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Load offer mappings when project changes
  useEffect(() => {
    const fetchOfferMappings = async () => {
      if (!currentProject) {
        setOfferMappings([]);
        return;
      }
      
      const { data } = await supabase
        .from('offer_mappings')
        .select('codigo_oferta, id_funil')
        .eq('project_id', currentProject.id);
      
      if (data) {
        setOfferMappings(data);
      }
    };
    
    fetchOfferMappings();
  }, [currentProject?.id]);

  const fetchHotmartData = async (filters: FilterParams) => {
    if (!currentProject) {
      toast({
        title: "Projeto não selecionado",
        description: "Selecione um projeto antes de buscar dados",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setCurrentFilters(filters);
      
      // Convert dates to timestamps using UTC to avoid timezone issues
      const startDateObj = new Date(filters.startDate);
      const endDateObj = new Date(filters.endDate);
      
      // Start of start date (00:00:00 UTC)
      const startUTC = Date.UTC(
        startDateObj.getFullYear(),
        startDateObj.getMonth(),
        startDateObj.getDate(),
        0, 0, 0, 0
      );
      
      // End of end date (23:59:59.999 UTC)
      const endUTC = Date.UTC(
        endDateObj.getFullYear(),
        endDateObj.getMonth(),
        endDateObj.getDate(),
        23, 59, 59, 999
      );

      console.log('=== DEBUG DATAS ===');
      console.log('startDate:', filters.startDate, '-> UTC:', new Date(startUTC).toISOString());
      console.log('endDate:', filters.endDate, '-> UTC:', new Date(endUTC).toISOString());

      const params: any = {
        start_date: startUTC,
        end_date: endUTC,
        max_results: 500, // Maximum allowed by API
      };

      // Note: API only supports one status at a time, we'll filter multiple statuses locally
      if (filters.transactionStatus && filters.transactionStatus.length === 1) {
        params.transaction_status = filters.transactionStatus[0].toUpperCase();
      }

      console.log('Requesting with params:', params);

      // Fetch all pages of data
      let allItems: any[] = [];
      let nextPageToken: string | null = null;
      let totalResults = 0;
      
      do {
        const requestParams = { ...params };
        if (nextPageToken) {
          requestParams.page_token = nextPageToken;
        }

        const { data, error } = await supabase.functions.invoke('hotmart-api', {
          body: {
            endpoint: '/sales/history',
            params: requestParams,
            projectId: currentProject?.id,
          },
        });

        if (error) throw error;

        console.log(`Fetched page with ${data?.items?.length || 0} items`);
        
        if (data?.items) {
          allItems = [...allItems, ...data.items];
        }
        
        totalResults = data?.page_info?.total_results || 0;
        nextPageToken = data?.page_info?.next_page_token || null;
        
      } while (nextPageToken);

      const finalData = {
        items: allItems,
        page_info: {
          total_results: totalResults,
          results_per_page: allItems.length,
        }
      };

      console.log(`Total items fetched: ${allItems.length} of ${totalResults}`);
      setSalesData(finalData);

      toast({
        title: "Dados carregados com sucesso!",
        description: `${allItems.length} transações carregadas`,
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
      
      if (!currentProject) {
        throw new Error('Selecione um projeto primeiro');
      }
      
      // Make a minimal request to test authentication
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/summary',
          params: {},
          projectId: currentProject.id,
        },
      });

      if (error) throw error;

      // Mark credentials as validated on success
      await markCredentialsValidated(currentProject.id);

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

  // Calculate metrics from filtered data
  const calculateMetrics = (filteredSales: any[]) => {
    if (!filteredSales || filteredSales.length === 0) {
      return {
        totalSales: "R$ 0,00",
        transactions: 0,
        customers: 0,
      };
    }

    const total = filteredSales.reduce((sum: number, item: any) => {
      return sum + (item.value || 0);
    }, 0);

    const uniqueCustomers = new Set(filteredSales.map((item: any) => item.buyer)).size;

    return {
      totalSales: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(total),
      transactions: filteredSales.length,
      customers: uniqueCustomers,
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
    if (!salesData?.items || !currentFilters) return [];

    console.log('=== DEBUG FILTROS ===');
    console.log('Total de itens da API:', salesData.items.length);
    console.log('Filtros aplicados:', currentFilters);
    console.log('Mapeamentos de ofertas:', offerMappings);

    let filteredItems = salesData.items.map((item: any) => {
      const utmData = parseUtmFromSourceSck(item.purchase?.tracking?.source_sck);
      
      return {
        transaction: item.purchase?.transaction || 'N/A',
        product: item.product?.name || 'N/A',
        buyer: item.buyer?.name || item.buyer?.email || 'N/A',
        value: item.purchase?.price?.value || 0,
        status: item.purchase?.status || 'unknown',
        date: new Date(item.purchase?.approved_date || item.purchase?.order_date).toLocaleDateString('pt-BR'),
        offerCode: item.purchase?.offer?.code || undefined,
        ...utmData,
      };
    });

    console.log('Após mapeamento:', filteredItems.length, 'itens');

    // Apply status filter (if multiple statuses selected)
    if (currentFilters.transactionStatus && currentFilters.transactionStatus.length > 1) {
      filteredItems = filteredItems.filter(item => 
        currentFilters.transactionStatus!.some(status => 
          item.status?.toLowerCase() === status.toLowerCase()
        )
      );
    }

    // Apply funnel filter (if specified)
    if (currentFilters.idFunil && currentFilters.idFunil.length > 0) {
      const offerCodesForFunnel = offerMappings
        .filter(mapping => currentFilters.idFunil!.includes(mapping.id_funil))
        .map(mapping => mapping.codigo_oferta)
        .filter(Boolean);
      
      console.log('Filtro de funil:', currentFilters.idFunil);
      console.log('Códigos de oferta do funil:', offerCodesForFunnel);
      
      const beforeFilter = filteredItems.length;
      filteredItems = filteredItems.filter(item => 
        item.offerCode && offerCodesForFunnel.includes(item.offerCode)
      );
      console.log('Após filtro de funil:', filteredItems.length, 'de', beforeFilter);
    }

    // Apply product filter (multiple selection)
    if (currentFilters.productName && currentFilters.productName.length > 0) {
      filteredItems = filteredItems.filter(item => 
        currentFilters.productName!.includes(item.product)
      );
    }

    // Apply offer filter (multiple selection)
    if (currentFilters.offerCode && currentFilters.offerCode.length > 0) {
      filteredItems = filteredItems.filter(item => 
        item.offerCode && currentFilters.offerCode!.includes(item.offerCode)
      );
    }

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

    console.log('=== RESULTADO FINAL ===');
    console.log('Total após todos os filtros:', filteredItems.length);

    return filteredItems;
  };

  const formattedSales = formatSalesData();
  const metrics = calculateMetrics(formattedSales);

  // Extract unique products and offers from sales data
  const availableProducts = salesData?.items 
    ? Array.from(new Set(salesData.items.map((item: any) => item.product?.name).filter(Boolean))) as string[]
    : [];
  
  const availableOffers = salesData?.items 
    ? Array.from(
        new Map(
          salesData.items
            .filter((item: any) => item.purchase?.offer?.code)
            .map((item: any) => [
              item.purchase.offer.code,
              { code: item.purchase.offer.code, name: item.purchase.offer.code }
            ])
        ).values()
      ) as { code: string; name: string }[]
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-cube">
        <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CuboBrand size="md" />
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {currentProject ? currentProject.name : 'Selecione um projeto'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentProject ? 'Projeto ativo' : 'Nenhum projeto selecionado'}
                </p>
              </div>
              <ProjectSelector />
            </div>
            <div className="flex gap-2 items-center">
              {currentProject && (
                <>
                  <Button
                    onClick={() => navigate('/funnel-analysis', { 
                      state: { 
                        salesData: formattedSales,
                        filters: currentFilters 
                      } 
                    })}
                    variant="outline"
                    className="gap-2"
                    disabled={!salesData}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Análise de Funil
                  </Button>
                  <Button
                    onClick={() => navigate('/offer-mappings')}
                    variant="outline"
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Mapeamento de Ofertas
                  </Button>
                  <Button
                    onClick={testConnection}
                    disabled={testingConnection || loading}
                    variant="outline"
                    className="gap-2"
                  >
                    <Zap className={`w-4 h-4 ${testingConnection ? 'animate-pulse' : ''}`} />
                    Testar Conexão
                  </Button>
                </>
              )}
              {salesData && currentProject && (
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
              <ThemeToggle />
              <Button
                onClick={handleLogout}
                variant="outline"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {!currentProject ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum Projeto Selecionado
            </h3>
            <p className="text-muted-foreground mb-4">
              Selecione um projeto existente ou crie um novo para começar
            </p>
            <Button onClick={() => navigate('/projects')} className="gap-2">
              <Settings className="w-4 h-4" />
              Gerenciar Projetos
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <SalesFilters 
              onFilter={fetchHotmartData} 
              availableProducts={availableProducts}
              availableOffers={availableOffers}
              projectId={currentProject?.id}
            />

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <CubeLoader message="Consultando API da Hotmart..." size="lg" />
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
        )}
      </main>
    </div>
  );
};

export default Index;
