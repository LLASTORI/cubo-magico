import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Filter, Settings, FolderOpen, CheckCircle, Database, SearchX, DollarSign, TrendingUp, ShoppingCart, Users } from "lucide-react";
import { OrdersTable } from "@/components/OrdersTable";
import SalesTablePagination from "@/components/SalesTablePagination";
import SalesFilters, { FilterParams } from "@/components/SalesFilters";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/CubeLoader";
import { AppHeader } from "@/components/AppHeader";
import { useOrdersCore, OrdersCoreFilters } from "@/hooks/useOrdersCore";
import { Badge } from "@/components/ui/badge";
import { useTenantNavigation } from "@/navigation";
import MetricCard from "@/components/MetricCard";
import { formatMoney } from "@/utils/formatMoney";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BUSCA RÁPIDA - PAINEL CENTRAL DE PEDIDOS (MULTI-PLATAFORMA)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REBUILD: 2026-01-16
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ARQUITETURA MULTI-PLATAFORMA (REGRA DE OURO)                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ A Busca Rápida NÃO é específica da Hotmart.                                │
 * │ É um PAINEL CENTRAL de pedidos para QUALQUER plataforma.                   │
 * │                                                                             │
 * │ A plataforma (Hotmart, Kiwify, Monetizze, etc) é apenas um ATRIBUTO:       │
 * │   • orders.provider = 'hotmart' | 'kiwify' | 'monetizze' | ...             │
 * │                                                                             │
 * │ FUTURO (sem alterar lógica de pedidos):                                    │
 * │   • Seletor de plataforma no header                                        │
 * │   • Filtro por provider nos filtros existentes                             │
 * │   • Badge visual indicando origem do pedido                                │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * DATA SOURCES (Ledger BRL v2.0 - Canonical):
 * - orders: customer_paid, producer_net_brl, platform_fee_brl, coproducer_brl, affiliate_brl, tax_brl
 * - orders.ledger_status: 'complete' = métricas financeiras válidas
 * - order_items: products list
 * 
 * FORBIDDEN SOURCES:
 * ❌ producer_net (legado)
 * ❌ ledger_events para agregação
 * ❌ finance_ledger_summary
 * ❌ useFinanceLedger hook
 * ❌ hotmart_sales (legacy)
 * ❌ crm_transactions
 * 
 * CARD DEFINITIONS (Ledger BRL v2.0 - CORRIGIDO):
 * - Receita Bruta: SUM(orders.customer_paid) [TODOS os pedidos, sem filtro ledger_status]
 * - Receita Líquida do Produtor: SUM(orders.producer_net_brl) WHERE ledger_status='complete'
 * - Taxas Plataforma: SUM(orders.platform_fee_brl) WHERE ledger_status='complete'
 * - Coprodução: SUM(orders.coproducer_brl) WHERE ledger_status='complete'
 * - Afiliados: SUM(orders.affiliate_brl) WHERE ledger_status='complete'
 * - Reembolsos: SUM(orders.tax_brl) WHERE ledger_status='complete'
 * 
 * TABLE: Each row = 1 order (NOT transaction events)
 * 
 * VALIDATION CASE: Juliane Coeli (HP3609747213C1)
 * - customer_paid = 205.00 ✓
 * - producer_net_brl = 94.43 ✓
 * - 3 items (97 + 39 + 69) ✓
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Helper to check if any UTM filter is active
const hasUtmFilterActive = (filters: FilterParams | null): boolean => {
  if (!filters) return false;
  return !!(filters.utmSource || filters.utmCampaign || filters.utmAdset || filters.utmPlacement || filters.utmCreative);
};

const BuscaRapida = () => {
  const [currentFilters, setCurrentFilters] = useState<FilterParams | null>(null);
  const [ordersWithoutUtmCount, setOrdersWithoutUtmCount] = useState<number>(0);
  const { toast } = useToast();
  const { navigateTo } = useTenantNavigation();
  const { currentProject, credentials } = useProject();
  
  // CANONICAL: Use Orders Core via useOrdersCore hook
  const { 
    orders, 
    loading, 
    error, 
    pagination,
    totals,
    fetchData,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
    countOrdersWithoutUtm,
  } = useOrdersCore();

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

  // Convert FilterParams to OrdersCoreFilters format
  // ALL filters are passed to the hook - NO client-side filtering
  const convertToOrdersFilters = (filters: FilterParams): OrdersCoreFilters => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    transactionStatus: filters.transactionStatus,
    funnelId: filters.idFunil,
    productName: filters.productName,
    offerCode: filters.offerCode,
    // ALL UTM filters mapped (PROMPT 10)
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
    const ordersFilters = convertToOrdersFilters(filters);
    const result = await fetchData(currentProject.id, ordersFilters, 1, pagination.pageSize);
    
    // Fetch count of orders without UTM if UTM filter is active
    if (hasUtmFilterActive(filters)) {
      const count = await countOrdersWithoutUtm(currentProject.id, ordersFilters);
      setOrdersWithoutUtmCount(count);
    } else {
      setOrdersWithoutUtmCount(0);
    }
    
    // Use the count returned from fetchData to ensure consistency
    // This prevents showing stale state from pagination.totalCount
    if (!error) {
      toast({
        title: "Dados carregados com sucesso!",
        description: `${result.totalCount.toLocaleString('pt-BR')} pedidos encontrados`,
      });
    }
  };

  const handleRefresh = () => {
    if (currentFilters && currentProject) {
      const ordersFilters = convertToOrdersFilters(currentFilters);
      fetchData(currentProject.id, ordersFilters, pagination.page, pagination.pageSize);
    }
  };


  // Extract unique products from orders
  const availableProducts = useMemo(() => {
    const products = new Set<string>();
    orders.forEach(order => {
      order.products.forEach(p => {
        if (p.product_name) products.add(p.product_name);
      });
    });
    return Array.from(products);
  }, [orders]);

  // Extract unique offers from orders
  const availableOffers = useMemo(() => {
    const offers = new Map<string, string>();
    orders.forEach(order => {
      order.products.forEach(p => {
        if (p.provider_offer_id && p.offer_name) {
          offers.set(p.provider_offer_id, p.offer_name);
        }
      });
    });
    return Array.from(offers.entries()).map(([code, name]) => ({ code, name }));
  }, [orders]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        rightContent={
          <div className="flex items-center gap-3">
            {/* Trust Level Badge - Orders Core */}
            <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <Database className="w-3 h-3" />
              Orders Core
            </Badge>
            
            {orders.length > 0 && currentProject && (
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
                <CubeLoader message="Consultando Orders Core..." size="lg" />
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-6 animate-fade-in">
                {/* Global Metric Cards - População Única v3.0 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    title="Faturamento Bruto"
                    value={formatMoney(totals.customerPaid, "BRL")}
                    icon={DollarSign}
                  />
                  <MetricCard
                    title="Faturamento Líquido"
                    value={formatMoney(totals.producerNet, "BRL")}
                    icon={TrendingUp}
                  />
                  <MetricCard
                    title="Número de Pedidos"
                    value={totals.totalOrders.toLocaleString('pt-BR')}
                    icon={ShoppingCart}
                  />
                  <MetricCard
                    title="Clientes Únicos"
                    value={totals.uniqueCustomers.toLocaleString('pt-BR')}
                    icon={Users}
                  />
                </div>

                {/* Data Source Info - Ledger BRL v2.0 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>
                    Fonte canônica: <strong>Ledger BRL v2.0</strong> • 
                    Receita Bruta = <strong>customer_paid</strong> • 
                    Receita Líquida = <strong>producer_net_brl</strong> •
                    <strong> {pagination.totalCount.toLocaleString('pt-BR')}</strong> pedidos no total
                  </span>
                </div>


                {/* Orders Table */}
                {orders.length > 0 && (
                  <>
                    <OrdersTable 
                      orders={orders} 
                      utmFilterActive={hasUtmFilterActive(currentFilters)}
                      ordersWithoutUtmCount={ordersWithoutUtmCount}
                    />
                    
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
              /* Task 5: Contextual no-results message */
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <SearchX className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Nenhum pedido encontrado
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {hasUtmFilterActive(currentFilters) 
                    ? "Nenhum pedido corresponde aos filtros aplicados. Pedidos sem UTM não aparecem quando filtros de UTM estão ativos."
                    : "Nenhum pedido corresponde aos filtros aplicados. Verifique as datas e os filtros selecionados."
                  }
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Filter className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Configure os Filtros
                </h3>
                <p className="text-muted-foreground">
                  Selecione as datas e filtros desejados para consultar o Orders Core
                </p>
              </div>
            )}
          </div>
        )}

        {/* 
         * ══════════════════════════════════════════════════════════════════════
         * 🧪 TESTE BINÁRIO A - CSV DESATIVADO TEMPORARIAMENTE
         * ══════════════════════════════════════════════════════════════════════
         * Objetivo: Isolar se o componente CSV está causando regressão na Busca Rápida
         * Data: 2026-01-25
         * Reativar após validação do RESULTADO A ou B
         * ══════════════════════════════════════════════════════════════════════
         */}
        {/* {currentProject && (
          <div className="mt-8">
            <SalesHistoryCSVImport />
          </div>
        )} */}
      </main>
    </div>
  );
};

export default BuscaRapida;
