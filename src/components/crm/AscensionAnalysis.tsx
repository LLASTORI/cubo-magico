/**
 * Análise de Ascensão - PROMPT 3: Orders Core Consolidado
 * 
 * Fonte: orders + order_items (via useAscensionOrdersCore)
 * ❌ crm_transactions removido
 */

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
import { Loader2, TrendingUp, Users, Target, CalendarIcon, ArrowRight, Package, Tag, Filter, Database } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { useAscensionOrdersCore } from '@/hooks/useAscensionOrdersCore';

type SelectionType = 'product' | 'offer' | 'funnel';

interface TransactionData {
  contact_id: string;
  product_name: string | null;
  product_code: string | null;
  offer_code: string | null;
  offer_name: string | null;
  status: string;
  transaction_date: string | null;
  funnel_id: string | null;
}

interface AscensionResult {
  entryName: string;
  entryType: 'product' | 'offer' | 'funnel';
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

  // Fetch orders from Orders Core
  const { items: ordersItems, isLoading: loadingOrders } = useAscensionOrdersCore();
  
  // Transformar para formato compatível com a lógica existente
  const transactions = useMemo(() => {
    return ordersItems.map(item => ({
      contact_id: item.buyer_email, // usar email como identificador único
      product_name: item.product_name,
      product_code: item.provider_product_id,
      offer_code: item.provider_offer_id,
      offer_name: item.offer_name,
      status: 'APPROVED',
      transaction_date: item.ordered_at,
      funnel_id: item.funnel_id,
    }));
  }, [ordersItems]);

  // Fetch offer mappings to include all configured offers
  const { data: offerMappings = [], isLoading: loadingOfferMappings } = useQuery({
    queryKey: ['crm-ascension-offer-mappings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('codigo_oferta, nome_oferta, nome_produto, id_produto, funnel_id, id_funil')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch funnels
  const { data: funnels = [], isLoading: loadingFunnels } = useQuery({
    queryKey: ['crm-ascension-funnels', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Extract unique products and offers (from both transactions AND offer_mappings)
  const { products, offers } = useMemo(() => {
    const productSet = new Set<string>();
    const offerMap = new Map<string, string>();

    // Add from transactions
    transactions.forEach(t => {
      if (t.product_name) productSet.add(t.product_name);
      if (t.offer_code && t.offer_name) {
        offerMap.set(t.offer_code, t.offer_name);
      } else if (t.offer_code) {
        offerMap.set(t.offer_code, t.offer_code);
      }
    });

    // Add from offer_mappings (so all configured offers appear even without transactions)
    offerMappings.forEach(m => {
      if (m.nome_produto) productSet.add(m.nome_produto);
      if (m.codigo_oferta) {
        offerMap.set(m.codigo_oferta, m.nome_oferta || m.codigo_oferta);
      }
    });

    return {
      products: Array.from(productSet).sort(),
      offers: Array.from(offerMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [transactions, offerMappings]);

  // Build funnel-to-offer mapping for funnel-based filtering
  const funnelOfferMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    offerMappings.forEach(m => {
      const funnelId = m.funnel_id;
      if (funnelId && m.codigo_oferta) {
        if (!map.has(funnelId)) {
          map.set(funnelId, new Set());
        }
        map.get(funnelId)!.add(m.codigo_oferta);
      }
    });
    return map;
  }, [offerMappings]);

  // Entry options based on selection type
  const entryOptions = useMemo(() => {
    if (entryType === 'product') {
      return products.map(p => ({ value: p, label: p }));
    }
    if (entryType === 'funnel') {
      return funnels.map(f => ({ value: f.id, label: f.name }));
    }
    return offers.map(o => ({ value: o.code, label: o.name }));
  }, [entryType, products, offers, funnels]);

  // Target options based on selection type
  const targetOptions = useMemo(() => {
    if (targetType === 'product') {
      return products.map(p => ({ value: p, label: p }));
    }
    if (targetType === 'funnel') {
      return funnels.map(f => ({ value: f.id, label: f.name }));
    }
    return offers.map(o => ({ value: o.code, label: o.name }));
  }, [targetType, products, offers, funnels]);

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
      if (entryType === 'funnel') {
        // Match if offer_code belongs to any of the selected funnels
        return selectedEntryItems.some(funnelId => {
          const offerCodes = funnelOfferMap.get(funnelId);
          return offerCodes && t.offer_code && offerCodes.has(t.offer_code);
        });
      }
      return selectedEntryItems.includes(t.offer_code || '');
    };

    // Helper to check if transaction matches target criteria
    const matchesTarget = (t: typeof transactions[0]) => {
      if (targetType === 'product') {
        return selectedTargetItems.includes(t.product_name || '');
      }
      if (targetType === 'funnel') {
        // Match if offer_code belongs to any of the selected funnels
        return selectedTargetItems.some(funnelId => {
          const offerCodes = funnelOfferMap.get(funnelId);
          return offerCodes && t.offer_code && offerCodes.has(t.offer_code);
        });
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
          if (entryType === 'funnel') {
            const offerCodes = funnelOfferMap.get(entryItem);
            return offerCodes && t.offer_code && offerCodes.has(t.offer_code);
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
              let targetKey: string | null = null;
              if (targetType === 'product') {
                targetKey = t.product_name;
              } else if (targetType === 'funnel') {
                // For funnel, find which selected funnel this transaction belongs to
                for (const funnelId of selectedTargetItems) {
                  const offerCodes = funnelOfferMap.get(funnelId);
                  if (offerCodes && t.offer_code && offerCodes.has(t.offer_code)) {
                    targetKey = funnelId;
                    break;
                  }
                }
              } else {
                targetKey = t.offer_code;
              }
              if (targetKey && selectedTargetItems.includes(targetKey)) {
                targetBreakdown.set(targetKey, (targetBreakdown.get(targetKey) || 0) + 1);
              }
            });
          }
        }
      });

      let entryName: string;
      if (entryType === 'product') {
        entryName = entryItem;
      } else if (entryType === 'funnel') {
        entryName = funnels.find(f => f.id === entryItem)?.name || entryItem;
      } else {
        entryName = offers.find(o => o.code === entryItem)?.name || entryItem;
      }

      results.push({
        entryName,
        entryType,
        totalBuyers: entryBuyers.size,
        ascendedBuyers: ascendedBuyers.size,
        ascensionRate: entryBuyers.size > 0 ? (ascendedBuyers.size / entryBuyers.size) * 100 : 0,
        targetBreakdown: Array.from(targetBreakdown.entries())
          .map(([name, count]) => {
            let displayName: string;
            if (targetType === 'product') {
              displayName = name;
            } else if (targetType === 'funnel') {
              displayName = funnels.find(f => f.id === name)?.name || name;
            } else {
              displayName = offers.find(o => o.code === name)?.name || name;
            }
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
  }, [transactions, selectedEntryItems, selectedTargetItems, entryType, targetType, dateRange, offers, funnels, funnelOfferMap]);

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loadingOrders || loadingOfferMappings || loadingFunnels) {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Análise de Ascensão
              </CardTitle>
              <CardDescription>
                Descubra quais produtos de entrada geram mais upsells para produtos premium
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Database className="h-3 w-3" />
              {transactions.length.toLocaleString('pt-BR')} transações
            </Badge>
          </div>
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
                    <TabsTrigger value="funnel" className="text-xs px-2">Funil</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <MultiSelect
                options={entryOptions}
                selected={selectedEntryItems}
                onChange={setSelectedEntryItems}
                placeholder={`Selecione ${entryType === 'product' ? 'produtos' : entryType === 'funnel' ? 'funis' : 'ofertas'} de entrada...`}
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
                    <TabsTrigger value="funnel" className="text-xs px-2">Funil</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <MultiSelect
                options={targetOptions}
                selected={selectedTargetItems}
                onChange={setSelectedTargetItems}
                placeholder={`Selecione ${targetType === 'product' ? 'produtos' : targetType === 'funnel' ? 'funis' : 'ofertas'} alvo...`}
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
                Taxa de ascensão individual para cada {entryType === 'product' ? 'produto' : entryType === 'funnel' ? 'funil' : 'oferta'} de entrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{entryType === 'product' ? 'Produto' : entryType === 'funnel' ? 'Funil' : 'Oferta'} de Entrada</TableHead>
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
                          ) : result.entryType === 'funnel' ? (
                            <Filter className="h-4 w-4 text-muted-foreground" />
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
