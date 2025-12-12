import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  type StatusBreakdown,
  DEFAULT_STATUS_FILTER
} from '@/hooks/useCRMJourneyData';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { CustomerFlowChart } from './CustomerFlowChart';

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
              <h4 className="font-medium text-sm">Histórico de Compras</h4>
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
  const [filterType, setFilterType] = useState<'product' | 'funnel' | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ startDate: null, endDate: null });
  const [statusFilter, setStatusFilter] = useState<string[]>(DEFAULT_STATUS_FILTER);

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
  };

  const { 
    customerJourneys, 
    journeyMetrics, 
    uniqueProducts, 
    uniqueFunnels,
    statusBreakdown,
    isLoading,
    isLoadingBreakdown 
  } = useCRMJourneyData(filters);

  const statusLabels: Record<string, string> = {
    'APPROVED': 'Aprovado',
    'COMPLETE': 'Completo',
    'CANCELED': 'Cancelado',
    'REFUNDED': 'Reembolsado',
    'CHARGEBACK': 'Chargeback',
    'EXPIRED': 'Expirado',
    'OVERDUE': 'Vencido',
    'STARTED': 'Iniciado',
    'PRINTED_BILLET': 'Boleto Impresso',
    'WAITING_PAYMENT': 'Aguardando Pagamento',
  };

  const getStatusLabel = (status: string) => statusLabels[status] || status;

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
  };

  const availableStatuses = [
    { value: 'APPROVED', label: 'Aprovado' },
    { value: 'COMPLETE', label: 'Completo' },
    { value: 'CANCELED', label: 'Cancelado' },
    { value: 'REFUNDED', label: 'Reembolsado' },
    { value: 'CHARGEBACK', label: 'Chargeback' },
    { value: 'EXPIRED', label: 'Expirado' },
    { value: 'OVERDUE', label: 'Vencido' },
    { value: 'STARTED', label: 'Iniciado' },
    { value: 'PRINTED_BILLET', label: 'Boleto Impresso' },
    { value: 'WAITING_PAYMENT', label: 'Aguardando Pagamento' },
  ];

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

  const hasActiveFilters = entryFilter || targetFilter || dateFilter.startDate || dateFilter.endDate;

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
      {/* Status Breakdown Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumo por Status
          </CardTitle>
          <CardDescription>
            Quantidade de vendas e clientes únicos por status (antes dos filtros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBreakdown ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Carregando...
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {statusBreakdown.map((item) => {
                const isSelected = statusFilter.includes(item.status);
                return (
                  <button
                    key={item.status}
                    onClick={() => {
                      if (isSelected) {
                        setStatusFilter(statusFilter.filter(s => s !== item.status));
                      } else {
                        setStatusFilter([...statusFilter, item.status]);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-lg border transition-all",
                      isSelected 
                        ? "bg-primary/10 border-primary" 
                        : "bg-muted/50 border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                        {item.count.toLocaleString('pt-BR')} vendas
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.uniqueClients.toLocaleString('pt-BR')} clientes
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Clique nos status para adicionar/remover do filtro
          </p>
        </CardContent>
      </Card>

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

            {/* Status Filter */}
            <div className="space-y-2 min-w-[250px]">
              <label className="text-sm font-medium">Status das Vendas</label>
              <MultiSelect
                options={availableStatuses}
                selected={statusFilter}
                onChange={setStatusFilter}
                placeholder="Selecione os status..."
              />
            </div>

            {(entryFilter || targetFilter) && (
              <Button variant="outline" size="sm" onClick={clearFilter} className="gap-2">
                <X className="h-4 w-4" />
                Limpar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      {journeyMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl font-bold">{journeyMetrics.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LTV Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(journeyMetrics.avgLTV)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <ShoppingCart className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compras por Cliente</p>
                  <p className="text-2xl font-bold">{journeyMetrics.avgPurchases.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Recompra</p>
                  <p className="text-2xl font-bold">{journeyMetrics.repeatCustomerRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="journeys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journeys">Jornadas de Clientes</TabsTrigger>
          <TabsTrigger value="flow">Fluxo de Clientes</TabsTrigger>
          <TabsTrigger value="cohorts">
            {analysisMode === 'entry' ? 'Análise por Cohort' : 'Análise de Origem'}
          </TabsTrigger>
          <TabsTrigger value="products">
            {analysisMode === 'entry' ? 'Produtos Subsequentes' : 'Produtos de Origem'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journeys">
          <Card>
            <CardHeader>
              <CardTitle>Jornadas de Clientes</CardTitle>
              <CardDescription>
                {analysisMode === 'entry' 
                  ? (entryFilter 
                      ? `Clientes que entraram via ${entryFilter.type === 'product' ? 'produto(s)' : 'funil(is)'} selecionado(s)`
                      : 'Todos os clientes ordenados por LTV'
                    )
                  : (targetFilter
                      ? `Clientes que compraram ${targetFilter.type === 'product' ? 'produto(s)' : 'no(s) funil(is)'} selecionado(s)`
                      : 'Selecione um produto/funil de destino para análise'
                    )
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerJourneys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {analysisMode === 'origin' && !targetFilter
                      ? 'Selecione um produto ou funil de destino para ver de onde os clientes vieram'
                      : 'Nenhuma jornada encontrada com os filtros selecionados'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto de Entrada</TableHead>
                      <TableHead className="text-center">Compras</TableHead>
                      <TableHead className="text-right">LTV</TableHead>
                      <TableHead className="text-center">
                        {analysisMode === 'entry' ? 'Recompras' : 'Antes do Alvo'}
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
                  </TableBody>
                </Table>
              )}
              {customerJourneys.length > 50 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 50 de {customerJourneys.length} clientes
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow">
          <CustomerFlowChart journeys={customerJourneys} />
        </TabsContent>

        <TabsContent value="cohorts">
          <Card>
            <CardHeader>
              <CardTitle>
                {analysisMode === 'entry' ? 'Análise por Cohort de Entrada' : 'Análise de Origem'}
              </CardTitle>
              <CardDescription>
                {analysisMode === 'entry'
                  ? 'Compare o LTV e taxa de recompra entre diferentes pontos de entrada'
                  : 'Veja de onde vieram os clientes que compraram o produto/funil selecionado'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisMode === 'origin' && journeyMetrics && journeyMetrics.originMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem (Ponto de Entrada)</TableHead>
                      <TableHead className="text-center">Clientes</TableHead>
                      <TableHead className="text-center">% do Total</TableHead>
                      <TableHead className="text-right">LTV Após Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeyMetrics.originMetrics.map((origin, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{origin.funnel || origin.product}</p>
                            {origin.funnel && (
                              <p className="text-xs text-muted-foreground">{origin.product}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{origin.customerCount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {origin.percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(origin.avgLTVAfter)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : analysisMode === 'entry' && journeyMetrics && journeyMetrics.cohortMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entrada</TableHead>
                      <TableHead className="text-center">Clientes</TableHead>
                      <TableHead className="text-right">LTV Médio</TableHead>
                      <TableHead className="text-center">Compras/Cliente</TableHead>
                      <TableHead className="text-center">Taxa Recompra</TableHead>
                      <TableHead className="text-right">Receita Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeyMetrics.cohortMetrics.map((cohort, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cohort.entryFunnel || cohort.entryProduct}</p>
                            {cohort.entryFunnel && (
                              <p className="text-xs text-muted-foreground">{cohort.entryProduct}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{cohort.customerCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cohort.avgLTV)}
                        </TableCell>
                        <TableCell className="text-center">{cohort.avgPurchases.toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={cohort.repeatRate > 20 ? "default" : "secondary"}>
                            {cohort.repeatRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(cohort.totalRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {analysisMode === 'origin' && !targetFilter
                      ? 'Selecione um produto ou funil de destino para ver a análise de origem'
                      : 'Nenhum dado disponível'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>
                {analysisMode === 'entry' 
                  ? 'Produtos Mais Comprados Após Entrada' 
                  : 'Produtos Comprados Antes do Destino'
                }
              </CardTitle>
              <CardDescription>
                {analysisMode === 'entry'
                  ? 'Quais produtos os clientes mais compram depois da primeira compra'
                  : 'Quais produtos os clientes compraram antes de chegar ao produto/funil de destino'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisMode === 'entry' && journeyMetrics && journeyMetrics.topSubsequentProducts.length > 0 ? (
                <div className="space-y-4">
                  {journeyMetrics.topSubsequentProducts.map((item, index) => (
                    <div key={item.product} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{item.product}</p>
                          <span className="text-sm text-muted-foreground">
                            {item.count} clientes ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analysisMode === 'origin' && targetFilter ? (
                <div className="space-y-4">
                  {(() => {
                    // Calculate products purchased before target
                    const previousProductCounts = new Map<string, number>();
                    customerJourneys.forEach(j => {
                      j.previousProducts.forEach(p => {
                        previousProductCounts.set(p, (previousProductCounts.get(p) || 0) + 1);
                      });
                    });

                    const totalCustomers = customerJourneys.length;
                    const sortedProducts = Array.from(previousProductCounts.entries())
                      .map(([product, count]) => ({
                        product,
                        count,
                        percentage: (count / totalCustomers) * 100,
                      }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10);

                    if (sortedProducts.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>A maioria dos clientes entrou diretamente pelo produto/funil de destino</p>
                        </div>
                      );
                    }

                    return sortedProducts.map((item, index) => (
                      <div key={item.product} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">{item.product}</p>
                            <span className="text-sm text-muted-foreground">
                              {item.count} clientes ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {analysisMode === 'origin' && !targetFilter
                      ? 'Selecione um produto ou funil de destino para ver os produtos de origem'
                      : 'Nenhuma recompra encontrada'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
