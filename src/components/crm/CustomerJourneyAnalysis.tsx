import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  CalendarIcon,
  RotateCcw
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { 
  useCRMJourneyData, 
  type EntryFilter, 
  type TargetFilter,
  type DateFilter,
  type CustomerJourney,
  type CRMFilters,
  DEFAULT_STATUS_FILTER
} from '@/hooks/useCRMJourneyData';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { CustomerFlowChart } from './CustomerFlowChart';
import { CRMSummaryCards } from './CRMSummaryCards';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

interface CustomerRowProps {
  journey: CustomerJourney;
  showOrigin?: boolean;
}

function CustomerRow({ journey, showOrigin }: CustomerRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sourceLabels: Record<string, string> = {
    'hotmart': 'Hotmart',
    'kiwify': 'Kiwify',
    'manual': 'Manual',
    'webhook': 'Webhook',
    'import': 'Importado',
  };

  const statusLabels: Record<string, string> = {
    'lead': 'Lead',
    'prospect': 'Prospect',
    'customer': 'Cliente',
    'churned': 'Churned',
    'inactive': 'Inativo',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="cursor-pointer hover:bg-muted/50">
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{journey.buyerName}</p>
            <p className="text-xs text-muted-foreground">{journey.buyerEmail}</p>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-xs">
                {sourceLabels[journey.contactSource] || journey.contactSource}
              </Badge>
              <Badge variant={journey.contactStatus === 'customer' ? 'default' : 'secondary'} className="text-xs">
                {statusLabels[journey.contactStatus] || journey.contactStatus}
              </Badge>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium text-sm">{journey.entryProduct}</p>
            {journey.entryFunnelName && (
              <p className="text-xs text-primary">{journey.entryFunnelName}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={journey.totalPurchases > 1 ? "default" : "secondary"}>
            {journey.totalPurchases}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(journey.totalSpent)}
        </TableCell>
        <TableCell className="text-center">
          {showOrigin ? (
            journey.previousProducts.length > 0 ? (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                {journey.previousProducts.length} antes
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                Entrada direta
              </Badge>
            )
          ) : (
            journey.subsequentProducts.length > 0 ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                +{journey.subsequentProducts.length} produtos
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )
          )}
        </TableCell>
        <TableCell className="text-right text-muted-foreground text-sm">
          {formatDate(journey.firstPurchaseDate)}
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <h4 className="font-medium text-sm">Histórico de Compras</h4>
                {journey.tags.length > 0 && (
                  <div className="flex gap-1">
                    {journey.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {journey.purchases.length > 0 ? (
                <div className="flex flex-wrap gap-2 items-center">
                  {journey.purchases.map((purchase, index) => (
                    <div key={purchase.transactionId} className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-2 rounded-lg border",
                        purchase.isEntry && "bg-primary/10 border-primary/30",
                        purchase.isTarget && "bg-orange-500/10 border-orange-500/30",
                        !purchase.isEntry && !purchase.isTarget && "bg-card border-border"
                      )}>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{purchase.productName}</p>
                          {purchase.isEntry && (
                            <Badge variant="outline" className="text-xs">Entrada</Badge>
                          )}
                          {purchase.isTarget && (
                            <Badge variant="outline" className="text-xs bg-orange-500/20">Alvo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(purchase.saleDate)}</span>
                          <span>•</span>
                          <span>{formatCurrency(purchase.totalPrice)}</span>
                          <span>•</span>
                          <span className="capitalize">{purchase.platform}</span>
                        </div>
                        {purchase.funnelName && (
                          <p className="text-xs text-primary mt-1">Funil: {purchase.funnelName}</p>
                        )}
                      </div>
                      {index < journey.purchases.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este contato ainda não realizou compras (Lead/Prospect)
                </p>
              )}
              {journey.avgTimeBetweenPurchases && (
                <p className="text-xs text-muted-foreground">
                  Tempo médio entre compras: {Math.round(journey.avgTimeBetweenPurchases)} dias
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CustomerJourneyAnalysis() {
  const [analysisMode, setAnalysisMode] = useState<'entry' | 'origin'>('entry');
  const [filterType, setFilterType] = useState<'product' | 'funnel' | 'offer' | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ startDate: null, endDate: null });
  const [statusFilter, setStatusFilter] = useState<string[]>(DEFAULT_STATUS_FILTER);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [contactStatusFilter, setContactStatusFilter] = useState<string[]>([]);
  const [pageFilter, setPageFilter] = useState<string[]>([]);

  const entryFilter: EntryFilter | null = analysisMode === 'entry' && filterType && selectedValues.length > 0
    ? { type: filterType, values: selectedValues }
    : null;

  const targetFilter: TargetFilter | null = analysisMode === 'origin' && filterType && selectedValues.length > 0
    ? { type: filterType, values: selectedValues }
    : null;

  const filters: CRMFilters = {
    entryFilter,
    targetFilter,
    dateFilter,
    statusFilter,
    transactionStatusFilter: statusFilter,
    sourceFilter,
    contactStatusFilter,
    pageFilter,
  };

  const { 
    customerJourneys, 
    journeyMetrics, 
    uniqueProducts, 
    uniqueFunnels,
    uniqueSources,
    uniqueContactStatuses,
    statusBreakdown,
    productBreakdown,
    offerBreakdown,
    funnelBreakdown,
    positionBreakdown,
    sourceBreakdown,
    contactStatusBreakdown,
    pageBreakdown,
    isLoading,
    isLoadingBreakdown 
  } = useCRMJourneyData(filters);

  const offerOptions = offerBreakdown.map((offer) => ({
    value: offer.key,
    label: offer.label,
  }));

  const selectedProductsFromCards = filterType === 'product' ? selectedValues : [];
  const selectedFunnelsFromCards = filterType === 'funnel' ? selectedValues : [];
  const selectedOffersFromCards = filterType === 'offer' ? selectedValues : [];

  const handleProductCardClick = (product: string) => {
    setFilterType('product');
    setSelectedValues((prev) =>
      prev.includes(product) ? prev.filter((p) => p !== product) : [...prev, product]
    );
  };

  const handleFunnelCardClick = (funnelId: string) => {
    setFilterType('funnel');
    setSelectedValues((prev) =>
      prev.includes(funnelId) ? prev.filter((f) => f !== funnelId) : [...prev, funnelId]
    );
  };

  const handleOfferCardClick = (offerCode: string) => {
    setFilterType('offer');
    setSelectedValues((prev) =>
      prev.includes(offerCode) ? prev.filter((o) => o !== offerCode) : [...prev, offerCode]
    );
  };

  const handleSourceToggle = (source: string) => {
    setSourceFilter((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleContactStatusToggle = (status: string) => {
    setContactStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handlePageToggle = (page: string) => {
    setPageFilter((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const clearFilter = () => {
    setFilterType(null);
    setSelectedValues([]);
  };

  const clearDateFilter = () => {
    setDateFilter({ startDate: null, endDate: null });
  };

  const clearAllFilters = () => {
    clearFilter();
    clearDateFilter();
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setSourceFilter([]);
    setContactStatusFilter([]);
    setPageFilter([]);
  };

  const handleFilterTypeChange = (value: string) => {
    if (value === 'all') {
      clearFilter();
    } else {
      setFilterType(value as 'product' | 'funnel');
      setSelectedValues([]);
    }
  };

  const handleModeChange = (mode: 'entry' | 'origin') => {
    setAnalysisMode(mode);
    clearFilter();
  };

  const hasActiveFilters = entryFilter || targetFilter || dateFilter.startDate || dateFilter.endDate || sourceFilter.length > 0 || contactStatusFilter.length > 0 || pageFilter.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados de jornada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards with Tabs */}
      <CRMSummaryCards
        statusBreakdown={statusBreakdown}
        offerBreakdown={offerBreakdown}
        funnelBreakdown={funnelBreakdown}
        positionBreakdown={positionBreakdown}
        productBreakdown={productBreakdown}
        sourceBreakdown={sourceBreakdown}
        contactStatusBreakdown={contactStatusBreakdown}
        pageBreakdown={pageBreakdown}
        isLoading={isLoadingBreakdown}
        selectedStatuses={statusFilter}
        selectedSources={sourceFilter}
        selectedContactStatuses={contactStatusFilter}
        selectedPages={pageFilter}
        onStatusToggle={(status) => {
          if (statusFilter.includes(status)) {
            setStatusFilter(statusFilter.filter(s => s !== status));
          } else {
            setStatusFilter([...statusFilter, status]);
          }
        }}
        onSourceToggle={handleSourceToggle}
        onContactStatusToggle={handleContactStatusToggle}
        onPageToggle={handlePageToggle}
        onProductClick={handleProductCardClick}
        onFunnelClick={handleFunnelCardClick}
        onOfferClick={handleOfferCardClick}
        selectedProducts={selectedProductsFromCards}
        selectedFunnels={selectedFunnelsFromCards}
        selectedOffers={selectedOffersFromCards}
      />

      {/* Analysis Mode Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Modo de Análise</CardTitle>
          <CardDescription>
            Escolha como deseja analisar a jornada dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={analysisMode === 'entry' ? 'default' : 'outline'}
              onClick={() => handleModeChange('entry')}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Por Entrada
              <span className="text-xs opacity-70">(O que compraram depois?)</span>
            </Button>
            <Button
              variant={analysisMode === 'origin' ? 'default' : 'outline'}
              onClick={() => handleModeChange('origin')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Por Destino
              <span className="text-xs opacity-70">(De onde vieram?)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {analysisMode === 'entry' ? 'Filtro de Entrada' : 'Filtro de Destino'}
              </CardTitle>
              <CardDescription>
                {analysisMode === 'entry' 
                  ? 'Selecione o produto ou funil de entrada para ver o que os clientes compraram depois'
                  : 'Selecione o produto ou funil de destino para ver de onde os clientes vieram'
                }
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Limpar Tudo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {analysisMode === 'entry' ? 'Data da Primeira Compra' : 'Período'}
              </label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateFilter.startDate && "text-muted-foreground"
                    )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter.startDate ? format(dateFilter.startDate, "dd/MM/yyyy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFilter.startDate || undefined}
                      onSelect={(date) => setDateFilter(prev => ({ ...prev, startDate: date || null }))}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateFilter.endDate && "text-muted-foreground"
                    )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter.endDate ? format(dateFilter.endDate, "dd/MM/yyyy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFilter.endDate || undefined}
                      onSelect={(date) => setDateFilter(prev => ({ ...prev, endDate: date || null }))}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {(dateFilter.startDate || dateFilter.endDate) && (
                  <Button variant="ghost" size="icon" onClick={clearDateFilter}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Filtro</label>
              <Select value={filterType || 'all'} onValueChange={handleFilterTypeChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  <SelectItem value="product">Por Produto</SelectItem>
                  <SelectItem value="funnel">Por Funil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === 'product' && (
              <div className="space-y-2 flex-1 min-w-[300px]">
                <label className="text-sm font-medium">
                  {analysisMode === 'entry' ? 'Produtos de Entrada' : 'Produtos de Destino'}
                </label>
                <MultiSelect
                  options={uniqueProducts.map(p => ({ value: p, label: p }))}
                  selected={selectedValues}
                  onChange={setSelectedValues}
                  placeholder="Selecione os produtos..."
                />
              </div>
            )}

            {filterType === 'funnel' && (
              <div className="space-y-2 flex-1 min-w-[300px]">
                <label className="text-sm font-medium">
                  {analysisMode === 'entry' ? 'Funis de Entrada' : 'Funis de Destino'}
                </label>
                <MultiSelect
                  options={uniqueFunnels.map(f => ({ value: f.id, label: f.name }))}
                  selected={selectedValues}
                  onChange={setSelectedValues}
                  placeholder="Selecione os funis..."
                />
              </div>
            )}

            {(filterType && selectedValues.length > 0) && (
              <Button variant="ghost" size="icon" onClick={clearFilter}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Active filter badges */}
          {(sourceFilter.length > 0 || contactStatusFilter.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {sourceFilter.map(source => (
                <Badge key={source} variant="secondary" className="gap-1">
                  Fonte: {source}
                  <button onClick={() => handleSourceToggle(source)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {contactStatusFilter.map(status => (
                <Badge key={status} variant="secondary" className="gap-1">
                  Status: {status}
                  <button onClick={() => handleContactStatusToggle(status)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journeyMetrics.totalCustomers.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              {journeyMetrics.repeatCustomerRate.toFixed(1)}% compraram mais de uma vez
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(journeyMetrics.avgLTV)}</div>
            <p className="text-xs text-muted-foreground">
              Valor médio por cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras Médias</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journeyMetrics.avgPurchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Compras por cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recompra</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journeyMetrics.repeatCustomerRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Clientes que voltaram
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flow Chart */}
      {customerJourneys.length > 0 && (
        <CustomerFlowChart journeys={customerJourneys} />
      )}

      {/* Cohort Analysis */}
      {journeyMetrics.cohortMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Análise por Ponto de Entrada</CardTitle>
            <CardDescription>
              Métricas de clientes agrupados por primeiro produto/funil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto de Entrada</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-right">LTV Médio</TableHead>
                  <TableHead className="text-center">Compras Médias</TableHead>
                  <TableHead className="text-center">Taxa Recompra</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journeyMetrics.cohortMetrics.slice(0, 10).map((cohort, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{cohort.entryProduct}</TableCell>
                    <TableCell>
                      {cohort.entryFunnel ? (
                        <Badge variant="outline">{cohort.entryFunnel}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{cohort.customerCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cohort.avgLTV)}</TableCell>
                    <TableCell className="text-center">{cohort.avgPurchases.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cohort.repeatRate > 20 ? "default" : "secondary"}>
                        {cohort.repeatRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cohort.totalRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Contatos</CardTitle>
          <CardDescription>
            {customerJourneys.length} contatos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>
                    {analysisMode === 'entry' ? 'Produto de Entrada' : 'Produto Alvo'}
                  </TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-right">LTV</TableHead>
                  <TableHead className="text-center">
                    {analysisMode === 'entry' ? 'Evolução' : 'Origem'}
                  </TableHead>
                  <TableHead className="text-right">Primeira Compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerJourneys.slice(0, 50).map((journey) => (
                  <CustomerRow 
                    key={journey.buyerEmail} 
                    journey={journey}
                    showOrigin={analysisMode === 'origin'}
                  />
                ))}
                {customerJourneys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum contato encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {customerJourneys.length > 50 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Exibindo 50 de {customerJourneys.length} contatos. Use os filtros para refinar a busca.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
