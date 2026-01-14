import { useState, useEffect, useMemo } from "react";
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw, Filter, Settings, FolderOpen, Database, CheckCircle } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SalesTable from "@/components/SalesTable";
import SalesTablePagination from "@/components/SalesTablePagination";
import SalesFilters, { FilterParams } from "@/components/SalesFilters";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/CubeLoader";
import { AppHeader } from "@/components/AppHeader";
import { useFinanceTracking } from "@/hooks/useFinanceTracking";
import { Badge } from "@/components/ui/badge";
import { useTenantNavigation } from "@/navigation";

const BuscaRapida = () => {
  const [currentFilters, setCurrentFilters] = useState<FilterParams | null>(null);
  const { toast } = useToast();
  const { navigateTo } = useTenantNavigation();
  const { currentProject, credentials } = useProject();
  
  // Use the canonical Finance Tracking hook (queries finance_tracking_view)
  const { 
    sales, 
    loading, 
    error, 
    pagination,
    totals, // Global totals from complete filtered dataset
    fetchSales,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  } = useFinanceTracking();

  // Clear filters when project changes
  useEffect(() => {
    setCurrentFilters(null);
  }, [currentProject?.id]);

  // Redirect if no project or credentials not validated
  useEffect(() => {
    if (currentProject && credentials && !credentials.is_validated) {
      toast({
        title: "Credenciais não validadas",
        description: "Configure e teste as credenciais do projeto antes de continuar",
        variant: "destructive",
      });
      navigateTo('/projects');
    }
  }, [currentProject, credentials, navigateTo, toast]);

  // Handle error from hook
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro ao carregar dados",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleFilter = async (filters: FilterParams) => {
    if (!currentProject) {
      toast({
        title: "Projeto não selecionado",
        description: "Selecione um projeto antes de buscar dados",
        variant: "destructive",
      });
      return;
    }

    setCurrentFilters(filters);
    // Reset to page 1 with default page size when applying new filters
    await fetchSales(currentProject.id, filters, 1, pagination.pageSize);
    
    if (!error) {
      toast({
        title: "Dados carregados com sucesso!",
        description: `${pagination.totalCount.toLocaleString('pt-BR')} transações encontradas`,
      });
    }
  };

  const handleRefresh = () => {
    if (currentFilters && currentProject) {
      fetchSales(currentProject.id, currentFilters, pagination.page, pagination.pageSize);
    }
  };

  // Calculate metrics from page data (for display in table context)
  const pageMetrics = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        totalNetRevenue: "R$ 0,00",
        totalGrossRevenue: "R$ 0,00",
        transactions: 0,
        customers: 0,
      };
    }

    const totalNet = sales.reduce((sum, item) => sum + (item.net_amount || 0), 0);
    const totalGross = sales.reduce((sum, item) => sum + (item.gross_amount || 0), 0);
    const uniqueCustomers = new Set(sales.map(item => item.buyer_email).filter(Boolean)).size;

    return {
      totalNetRevenue: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalNet),
      totalGrossRevenue: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalGross),
      transactions: sales.length,
      customers: uniqueCustomers,
    };
  }, [sales]);

  // Global metrics from totals query (complete filtered dataset)
  const globalMetrics = useMemo(() => {
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

    return {
      totalNetRevenue: formatCurrency(totals.totalNetRevenue),
      totalGrossRevenue: formatCurrency(totals.totalGrossRevenue),
      transactions: totals.totalTransactions,
      customers: totals.totalUniqueCustomers,
      loading: totals.loading,
    };
  }, [totals]);

  // Format sales for the table component (keeping compatibility)
  const formattedSales = useMemo(() => {
    return sales.map(sale => {
      const economicDay = sale.economic_day;
      const formattedDate = economicDay 
        ? new Date(economicDay + 'T12:00:00').toLocaleDateString('pt-BR')
        : '-';
      
      return {
        transaction: sale.transaction_id,
        product: sale.product_name || '-',
        buyer: sale.buyer_name || '-',
        value: sale.net_amount,
        grossValue: sale.gross_amount,
        status: sale.hotmart_status || 'UNKNOWN',
        date: formattedDate,
        utmSource: sale.utm_source || undefined,
        utmCampaign: sale.utm_campaign || undefined,
        utmAdset: sale.utm_adset || undefined,
        utmPlacement: sale.utm_placement || undefined,
        utmCreative: sale.utm_creative || undefined,
        originalCurrency: 'BRL',
        originalValue: sale.gross_amount,
        wasConverted: false,
      };
    });
  }, [sales]);

  // Extract unique products and offers from canonical view
  const availableProducts = useMemo(() => {
    return Array.from(new Set(sales.map(s => s.product_name).filter(Boolean))) as string[];
  }, [sales]);

  const availableOffers = useMemo(() => {
    return sales
      .filter(s => s.offer_code)
      .map(s => ({ code: s.offer_code!, name: s.offer_code! }))
      .filter((offer, index, self) => 
        self.findIndex(o => o.code === offer.code) === index
      );
  }, [sales]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        rightContent={
          <div className="flex items-center gap-3">
            {/* Trust Level Badge - Always show Core */}
            <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <Database className="w-3 h-3" />
              Financial Core
            </Badge>
            
            {sales.length > 0 && currentProject && (
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
        }
      />

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
            <Button onClick={() => navigateTo('/projects')} className="gap-2">
              <Settings className="w-4 h-4" />
              Gerenciar Projetos
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <SalesFilters 
              onFilter={handleFilter} 
              availableProducts={availableProducts}
              availableOffers={availableOffers}
              projectId={currentProject?.id}
            />

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <CubeLoader message="Consultando Finance Tracking..." size="lg" />
              </div>
            ) : sales.length > 0 ? (
              <div className="space-y-6 animate-fade-in">
                {/* Data Source Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>
                    Fonte canônica: <strong>finance_tracking_view</strong> • 
                    Filtro por <strong>economic_day</strong> (horário de Brasília) • 
                    Valores em <strong>Receita Líquida</strong> (após taxas) •
                    <strong> {pagination.totalCount.toLocaleString('pt-BR')}</strong> transações no total
                  </span>
                </div>

                {/* Metrics Grid - Using GLOBAL TOTALS from complete dataset */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Receita Líquida (total)"
                    value={globalMetrics.loading ? "Calculando..." : globalMetrics.totalNetRevenue}
                    icon={DollarSign}
                  />
                  <MetricCard
                    title="Receita Bruta (total)"
                    value={globalMetrics.loading ? "Calculando..." : globalMetrics.totalGrossRevenue}
                    icon={TrendingUp}
                  />
                  <MetricCard
                    title="Transações (total)"
                    value={globalMetrics.loading ? "..." : globalMetrics.transactions}
                    icon={ShoppingCart}
                  />
                  <MetricCard
                    title="Clientes Únicos (total)"
                    value={globalMetrics.loading ? "..." : globalMetrics.customers}
                    icon={Users}
                  />
                </div>

                {/* Sales Table */}
                {formattedSales.length > 0 && (
                  <>
                    <SalesTable sales={formattedSales} showGrossColumn />
                    
                    {/* Pagination Controls */}
                    <SalesTablePagination
                      pagination={pagination}
                      onNextPage={nextPage}
                      onPrevPage={prevPage}
                      onSetPage={setPage}
                      onSetPageSize={setPageSize}
                      loading={loading}
                    />
                  </>
                )}
              </div>
            ) : currentFilters ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma transação encontrada para os filtros selecionados
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Filter className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Configure os Filtros
                </h3>
                <p className="text-muted-foreground">
                  Selecione as datas e filtros desejados para consultar o Financial Core
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BuscaRapida;
