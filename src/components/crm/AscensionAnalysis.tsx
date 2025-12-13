import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, Users, Target, CalendarIcon, ArrowRight, Package, Tag } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

type SelectionType = 'product' | 'offer';

interface AscensionResult {
  entryName: string;
  entryType: 'product' | 'offer';
  totalBuyers: number;
  ascendedBuyers: number;
  ascensionRate: number;
  targetBreakdown: { name: string; count: number }[];
}

export function AscensionAnalysis() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // Selection type states
  const [entryType, setEntryType] = useState<SelectionType>('product');
  const [targetType, setTargetType] = useState<SelectionType>('product');
  
  // Selected items
  const [selectedEntryItems, setSelectedEntryItems] = useState<string[]>([]);
  const [selectedTargetItems, setSelectedTargetItems] = useState<string[]>([]);
  
  // Date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Fetch transactions
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['crm-ascension-transactions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('crm_transactions')
        .select('contact_id, product_name, product_code, offer_code, offer_name, status, transaction_date')
        .eq('project_id', projectId)
        .in('status', ['APPROVED', 'COMPLETE']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Extract unique products and offers
  const { products, offers } = useMemo(() => {
    const productSet = new Set<string>();
    const offerMap = new Map<string, string>();

    transactions.forEach(t => {
      if (t.product_name) productSet.add(t.product_name);
      if (t.offer_code && t.offer_name) {
        offerMap.set(t.offer_code, t.offer_name);
      } else if (t.offer_code) {
        offerMap.set(t.offer_code, t.offer_code);
      }
    });

    return {
      products: Array.from(productSet).sort(),
      offers: Array.from(offerMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [transactions]);

  // Entry options based on selection type
  const entryOptions = useMemo(() => {
    if (entryType === 'product') {
      return products.map(p => ({ value: p, label: p }));
    }
    return offers.map(o => ({ value: o.code, label: o.name }));
  }, [entryType, products, offers]);

  // Target options based on selection type
  const targetOptions = useMemo(() => {
    if (targetType === 'product') {
      return products.map(p => ({ value: p, label: p }));
    }
    return offers.map(o => ({ value: o.code, label: o.name }));
  }, [targetType, products, offers]);

  // Calculate ascension metrics
  const ascensionResults = useMemo(() => {
    if (selectedEntryItems.length === 0 || selectedTargetItems.length === 0) {
      return null;
    }

    // Filter transactions by date range if set
    let filteredTransactions = transactions;
    if (dateRange?.from) {
      filteredTransactions = transactions.filter(t => {
        if (!t.transaction_date) return false;
        const txDate = new Date(t.transaction_date);
        if (dateRange.from && txDate < dateRange.from) return false;
        if (dateRange.to && txDate > dateRange.to) return false;
        return true;
      });
    }

    // Group transactions by contact
    const contactTransactions = new Map<string, typeof transactions>();
    filteredTransactions.forEach(t => {
      const existing = contactTransactions.get(t.contact_id) || [];
      existing.push(t);
      contactTransactions.set(t.contact_id, existing);
    });

    // Helper to check if transaction matches entry criteria
    const matchesEntry = (t: typeof transactions[0]) => {
      if (entryType === 'product') {
        return selectedEntryItems.includes(t.product_name || '');
      }
      return selectedEntryItems.includes(t.offer_code || '');
    };

    // Helper to check if transaction matches target criteria
    const matchesTarget = (t: typeof transactions[0]) => {
      if (targetType === 'product') {
        return selectedTargetItems.includes(t.product_name || '');
      }
      return selectedTargetItems.includes(t.offer_code || '');
    };

    // Calculate results per entry item
    const results: AscensionResult[] = [];

    selectedEntryItems.forEach(entryItem => {
      // Find all contacts who bought this entry item
      const entryBuyers = new Set<string>();
      const ascendedBuyers = new Set<string>();
      const targetBreakdown = new Map<string, number>();

      contactTransactions.forEach((txs, contactId) => {
        const boughtEntry = txs.some(t => {
          if (entryType === 'product') {
            return t.product_name === entryItem;
          }
          return t.offer_code === entryItem;
        });

        if (boughtEntry) {
          entryBuyers.add(contactId);

          // Check if they also bought any target item
          const targetTxs = txs.filter(matchesTarget);
          if (targetTxs.length > 0) {
            ascendedBuyers.add(contactId);
            
            // Count per target item
            targetTxs.forEach(t => {
              const targetKey = targetType === 'product' ? t.product_name : t.offer_code;
              if (targetKey && selectedTargetItems.includes(targetKey)) {
                targetBreakdown.set(targetKey, (targetBreakdown.get(targetKey) || 0) + 1);
              }
            });
          }
        }
      });

      const entryName = entryType === 'product' 
        ? entryItem 
        : offers.find(o => o.code === entryItem)?.name || entryItem;

      results.push({
        entryName,
        entryType,
        totalBuyers: entryBuyers.size,
        ascendedBuyers: ascendedBuyers.size,
        ascensionRate: entryBuyers.size > 0 ? (ascendedBuyers.size / entryBuyers.size) * 100 : 0,
        targetBreakdown: Array.from(targetBreakdown.entries())
          .map(([name, count]) => {
            const displayName = targetType === 'product' 
              ? name 
              : offers.find(o => o.code === name)?.name || name;
            return { name: displayName, count };
          })
          .sort((a, b) => b.count - a.count),
      });
    });

    // Sort by ascension rate
    results.sort((a, b) => b.ascensionRate - a.ascensionRate);

    // Calculate totals
    const totalEntryBuyers = new Set<string>();
    const totalAscendedBuyers = new Set<string>();

    contactTransactions.forEach((txs, contactId) => {
      const boughtEntry = txs.some(matchesEntry);
      const boughtTarget = txs.some(matchesTarget);

      if (boughtEntry) {
        totalEntryBuyers.add(contactId);
        if (boughtTarget) {
          totalAscendedBuyers.add(contactId);
        }
      }
    });

    return {
      results,
      totals: {
        totalEntryBuyers: totalEntryBuyers.size,
        totalAscendedBuyers: totalAscendedBuyers.size,
        overallAscensionRate: totalEntryBuyers.size > 0 
          ? (totalAscendedBuyers.size / totalEntryBuyers.size) * 100 
          : 0,
      },
    };
  }, [transactions, selectedEntryItems, selectedTargetItems, entryType, targetType, dateRange, offers]);

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loadingTransactions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análise de Ascensão
          </CardTitle>
          <CardDescription>
            Descubra quais produtos de entrada geram mais upsells para produtos premium
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entry Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Produtos de Entrada
                </label>
                <Tabs value={entryType} onValueChange={(v) => { setEntryType(v as SelectionType); setSelectedEntryItems([]); }}>
                  <TabsList className="h-8">
                    <TabsTrigger value="product" className="text-xs px-2">Produto</TabsTrigger>
                    <TabsTrigger value="offer" className="text-xs px-2">Oferta</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <MultiSelect
                options={entryOptions}
                selected={selectedEntryItems}
                onChange={setSelectedEntryItems}
                placeholder={`Selecione ${entryType === 'product' ? 'produtos' : 'ofertas'} de entrada...`}
              />
            </div>

            {/* Target Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  Produtos Alvo (Ascensão)
                </label>
                <Tabs value={targetType} onValueChange={(v) => { setTargetType(v as SelectionType); setSelectedTargetItems([]); }}>
                  <TabsList className="h-8">
                    <TabsTrigger value="product" className="text-xs px-2">Produto</TabsTrigger>
                    <TabsTrigger value="offer" className="text-xs px-2">Oferta</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <MultiSelect
                options={targetOptions}
                selected={selectedTargetItems}
                onChange={setSelectedTargetItems}
                placeholder={`Selecione ${targetType === 'product' ? 'produtos' : 'ofertas'} alvo...`}
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Período total"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {dateRange && (
              <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                Limpar período
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {ascensionResults && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Compradores de Entrada</p>
                    <p className="text-2xl font-bold">{ascensionResults.totals.totalEntryBuyers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Compraram Produto Alvo</p>
                    <p className="text-2xl font-bold">{ascensionResults.totals.totalAscendedBuyers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-500/10">
                    <Target className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Ascensão Geral</p>
                    <p className="text-2xl font-bold">{formatPercent(ascensionResults.totals.overallAscensionRate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Produto de Entrada</CardTitle>
              <CardDescription>
                Taxa de ascensão individual para cada {entryType === 'product' ? 'produto' : 'oferta'} de entrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{entryType === 'product' ? 'Produto' : 'Oferta'} de Entrada</TableHead>
                    <TableHead className="text-center">Compradores</TableHead>
                    <TableHead className="text-center">Ascenderam</TableHead>
                    <TableHead className="text-center">Taxa de Ascensão</TableHead>
                    <TableHead>Produtos Alvo Comprados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ascensionResults.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {result.entryType === 'product' ? (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Tag className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{result.entryName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{result.totalBuyers}</TableCell>
                      <TableCell className="text-center">{result.ascendedBuyers}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={result.ascensionRate} 
                            className="h-2 w-20"
                          />
                          <span className={cn(
                            "text-sm font-medium",
                            result.ascensionRate >= 20 ? "text-green-600" : 
                            result.ascensionRate >= 10 ? "text-yellow-600" : "text-muted-foreground"
                          )}>
                            {formatPercent(result.ascensionRate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {result.targetBreakdown.slice(0, 3).map((t, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {t.name.length > 20 ? t.name.substring(0, 20) + '...' : t.name}: {t.count}
                            </Badge>
                          ))}
                          {result.targetBreakdown.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{result.targetBreakdown.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {ascensionResults.results.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum comprador encontrado para os produtos de entrada selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!ascensionResults && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Selecione os produtos para análise</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha produtos de entrada e produtos alvo para ver a taxa de ascensão
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
