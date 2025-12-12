import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Filter,
  X
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { 
  useCRMJourneyData, 
  type EntryFilter, 
  type CustomerJourney 
} from '@/hooks/useCRMJourneyData';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
}

function CustomerRow({ journey }: CustomerRowProps) {
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
            {journey.entryFunnelId && (
              <p className="text-xs text-muted-foreground">via Funil</p>
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
          {journey.subsequentProducts.length > 0 ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              +{journey.subsequentProducts.length} produtos
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
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
                    <div className={`px-3 py-2 rounded-lg border ${purchase.isEntry ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}>
                      <p className="font-medium text-sm">{purchase.productName}</p>
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
  const [filterType, setFilterType] = useState<'product' | 'funnel' | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const entryFilter: EntryFilter | null = filterType && selectedValues.length > 0
    ? { type: filterType, values: selectedValues }
    : null;

  const { 
    customerJourneys, 
    journeyMetrics, 
    uniqueProducts, 
    uniqueFunnels,
    isLoading 
  } = useCRMJourneyData(entryFilter);

  const clearFilter = () => {
    setFilterType(null);
    setSelectedValues([]);
  };

  const handleFilterTypeChange = (value: string) => {
    if (value === 'all') {
      clearFilter();
    } else {
      setFilterType(value as 'product' | 'funnel');
      setSelectedValues([]);
    }
  };

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
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtro de Entrada
          </CardTitle>
          <CardDescription>
            Selecione o produto ou funil de entrada para analisar a jornada dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
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
                <label className="text-sm font-medium">Produtos de Entrada</label>
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
                <label className="text-sm font-medium">Funis de Entrada</label>
                <MultiSelect
                  options={uniqueFunnels.map(f => ({ value: f.id, label: f.name }))}
                  selected={selectedValues}
                  onChange={setSelectedValues}
                  placeholder="Selecione os funis..."
                />
              </div>
            )}

            {entryFilter && (
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
          <TabsTrigger value="cohorts">Análise por Cohort</TabsTrigger>
          <TabsTrigger value="products">Produtos Subsequentes</TabsTrigger>
        </TabsList>

        <TabsContent value="journeys">
          <Card>
            <CardHeader>
              <CardTitle>Jornadas de Clientes</CardTitle>
              <CardDescription>
                {entryFilter 
                  ? `Clientes que entraram via ${entryFilter.type === 'product' ? 'produto(s)' : 'funil(is)'} selecionado(s)`
                  : 'Todos os clientes ordenados por LTV'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerJourneys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma jornada encontrada com os filtros selecionados</p>
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
                      <TableHead className="text-center">Recompras</TableHead>
                      <TableHead className="text-right">Primeira Compra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerJourneys.slice(0, 50).map((journey) => (
                      <CustomerRow key={journey.buyerEmail} journey={journey} />
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

        <TabsContent value="cohorts">
          <Card>
            <CardHeader>
              <CardTitle>Análise por Cohort de Entrada</CardTitle>
              <CardDescription>
                Compare o LTV e taxa de recompra entre diferentes pontos de entrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {journeyMetrics && journeyMetrics.cohortMetrics.length > 0 ? (
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
                  <p>Nenhum dado de cohort disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Comprados Após Entrada</CardTitle>
              <CardDescription>
                Quais produtos os clientes mais compram depois da primeira compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              {journeyMetrics && journeyMetrics.topSubsequentProducts.length > 0 ? (
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma recompra encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
