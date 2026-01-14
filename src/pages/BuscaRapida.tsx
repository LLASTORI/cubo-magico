import { useState, useEffect, useMemo } from "react";
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw, Filter, Settings, FolderOpen, Database, CheckCircle, Coins, Percent } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SalesTable from "@/components/SalesTable";
import SalesTablePagination from "@/components/SalesTablePagination";
import SalesFilters, { FilterParams } from "@/components/SalesFilters";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/CubeLoader";
import { AppHeader } from "@/components/AppHeader";
import { useFinanceLedger, LedgerFilters } from "@/hooks/useFinanceLedger";
import { Badge } from "@/components/ui/badge";
import { useTenantNavigation } from "@/navigation";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BUSCA RÁPIDA - CANONICAL FINANCIAL VIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This page uses EXCLUSIVELY finance_ledger_summary via useFinanceLedger hook.
 * All money values represent REAL MONEY paid by Hotmart (after all deductions).
 * 
 * FORBIDDEN SOURCES:
 * ❌ hotmart_sales.total_price_brl
 * ❌ finance_tracking_view
 * ❌ sales_core_events
 * ❌ Any percentage-based fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BuscaRapida = () => {
  const [currentFilters, setCurrentFilters] = useState<FilterParams | null>(null);
  const { toast } = useToast();
  const { navigateTo } = useTenantNavigation();
  const { currentProject, credentials } = useProject();
  
  // CANONICAL: Use finance_ledger_summary via useFinanceLedger hook
  const { 
    transactions, 
    loading, 
    error, 
    pagination,
    totals, // Global totals from complete filtered dataset (real money)
    fetchData,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
  } = useFinanceLedger();

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

  // Convert FilterParams to LedgerFilters format
  const convertToLedgerFilters = (filters: FilterParams): LedgerFilters => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    transactionStatus: filters.transactionStatus,
    funnelId: filters.idFunil,
    productName: filters.productName,
    offerCode: filters.offerCode,
    utmSource: filters.utmSource,
    utmCampaign: filters.utmCampaign,
    utmAdset: filters.utmAdset,
    utmPlacement: filters.utmPlacement,
    utmCreative: filters.utmCreative,
  });

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
    const ledgerFilters = convertToLedgerFilters(filters);
    // Reset to page 1 with default page size when applying new filters
    await fetchData(currentProject.id, ledgerFilters, 1, pagination.pageSize);
    
    if (!error) {
      toast({
        title: "Dados carregados com sucesso!",
        description: `${pagination.totalCount.toLocaleString('pt-BR')} transações encontradas`,
      });
    }
  };

  const handleRefresh = () => {
    if (currentFilters && currentProject) {
      const ledgerFilters = convertToLedgerFilters(currentFilters);
      fetchData(currentProject.id, ledgerFilters, pagination.page, pagination.pageSize);
    }
  };

  // Calculate metrics from page data (for display in table context)
  const pageMetrics = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        netRevenue: "R$ 0,00",
        producerGross: "R$ 0,00",
        transactions: 0,
        customers: 0,
      };
    }

    const totalNet = transactions.reduce((sum, item) => sum + (item.net_revenue || 0), 0);
    const totalGross = transactions.reduce((sum, item) => sum + (item.producer_gross || 0), 0);
    const uniqueCustomers = new Set(transactions.map(item => item.buyer_email).filter(Boolean)).size;

    return {
      netRevenue: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalNet),
      producerGross: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalGross),
      transactions: transactions.length,
      customers: uniqueCustomers,
    };
  }, [transactions]);

  // Global metrics from totals query (complete filtered dataset - REAL MONEY)
  const globalMetrics = useMemo(() => {
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

    return {
      netRevenue: formatCurrency(totals.netRevenue),
      producerGross: formatCurrency(totals.producerGross),
      affiliateCost: formatCurrency(totals.affiliateCost),
      coproducerCost: formatCurrency(totals.coproducerCost),
      platformCost: formatCurrency(totals.platformCost),
      refunds: formatCurrency(totals.refunds),
      transactions: totals.totalTransactions,
      customers: totals.uniqueCustomers,
      loading: totals.loading,
    };
  }, [totals]);

  // Format transactions for the table component (keeping compatibility)
  const formattedSales = useMemo(() => {
    return transactions.map(tx => {
      const economicDay = tx.economic_day;
      const formattedDate = economicDay 
        ? new Date(economicDay + 'T12:00:00').toLocaleDateString('pt-BR')
        : '-';
      
      return {
        transaction: tx.transaction_id,
        product: tx.product_name || '-',
        buyer: tx.buyer_name || '-',
        value: tx.net_revenue,
        grossValue: tx.producer_gross,
        status: tx.hotmart_status || 'UNKNOWN',
        date: formattedDate,
        utmSource: tx.utm_source || undefined,
        utmCampaign: tx.utm_campaign || undefined,
        utmAdset: tx.utm_adset || undefined,
        utmPlacement: tx.utm_placement || undefined,
        utmCreative: tx.utm_creative || undefined,
        originalCurrency: 'BRL',
        originalValue: tx.producer_gross,
        wasConverted: false,
      };
    });
  }, [transactions]);

  // Extract unique products and offers from canonical view
  const availableProducts = useMemo(() => {
    return Array.from(new Set(transactions.map(s => s.product_name).filter(Boolean))) as string[];
  }, [transactions]);

  const availableOffers = useMemo(() => {
    return transactions
      .filter(s => s.offer_code)
      .map(s => ({ code: s.offer_code!, name: s.offer_code! }))
      .filter((offer, index, self) => 
        self.findIndex(o => o.code === offer.code) === index
      );
  }, [transactions]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        rightContent={
          <div className="flex items-center gap-3">
            {/* Trust Level Badge - Finance Ledger (real money) */}
            <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <Coins className="w-3 h-3" />
              Finance Ledger
            </Badge>
            
            {transactions.length > 0 && currentProject && (
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
                <CubeLoader message="Consultando Finance Ledger..." size="lg" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-6 animate-fade-in">
                {/* Data Source Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>
                    Fonte canônica: <strong>finance_ledger_summary</strong> • 
                    Filtro por <strong>economic_day</strong> (horário de Brasília) • 
                    Valores em <strong>Receita Líquida Real</strong> (dinheiro pago pela Hotmart) •
                    <strong> {pagination.totalCount.toLocaleString('pt-BR')}</strong> transações no total
                  </span>
                </div>

                {/* Metrics Grid - Using GLOBAL TOTALS from complete dataset (REAL MONEY) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Receita Líquida do Produtor"
                    value={globalMetrics.loading ? "Calculando..." : globalMetrics.netRevenue}
                    icon={DollarSign}
                  />
                  <MetricCard
                    title="Receita Bruta do Produtor"
                    value={globalMetrics.loading ? "Calculando..." : globalMetrics.producerGross}
                    icon={TrendingUp}
                  />
                  <MetricCard
                    title="Transações"
                    value={globalMetrics.loading ? "..." : globalMetrics.transactions}
                    icon={ShoppingCart}
                  />
                  <MetricCard
                    title="Clientes Únicos"
                    value={globalMetrics.loading ? "..." : globalMetrics.customers}
                    icon={Users}
                  />
                </div>

                {/* Cost breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Custo Afiliados"
                    value={globalMetrics.loading ? "..." : globalMetrics.affiliateCost}
                    icon={Percent}
                  />
                  <MetricCard
                    title="Custo Coprodução"
                    value={globalMetrics.loading ? "..." : globalMetrics.coproducerCost}
                    icon={Percent}
                  />
                  <MetricCard
                    title="Taxas Hotmart"
                    value={globalMetrics.loading ? "..." : globalMetrics.platformCost}
                    icon={Percent}
                  />
                  <MetricCard
                    title="Reembolsos"
                    value={globalMetrics.loading ? "..." : globalMetrics.refunds}
                    icon={Percent}
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
                  Selecione as datas e filtros desejados para consultar o Finance Ledger
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
