import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Package, DollarSign, ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CubeLoader } from "@/components/CubeLoader";
import { AppHeader } from "@/components/AppHeader";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

const UndefinedOffers = () => {
  const { navigateTo, navigate } = useProjectNavigation();
  const { currentProject } = useProject();
  
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch funnels with type 'indefinido'
  const { data: indefinidoFunnels } = useQuery({
    queryKey: ['funnels-indefinido', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', currentProject!.id)
        .eq('funnel_type', 'indefinido');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch ALL offer mappings to identify which are in indefinido vs other funnels
  const { data: allOfferMappings } = useQuery({
    queryKey: ['all-offer-mappings', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*, funnels!offer_mappings_funnel_id_fkey(id, name, funnel_type)')
        .eq('project_id', currentProject!.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Separate mappings into indefinido and other funnels
  const { indefinidoMappings, otherFunnelCodes } = useMemo(() => {
    if (!allOfferMappings || !indefinidoFunnels) {
      return { indefinidoMappings: [], otherFunnelCodes: new Set<string>() };
    }

    const indefinidoFunnelIds = new Set(indefinidoFunnels.map(f => f.id));
    const indefinidoFunnelNames = new Set(indefinidoFunnels.map(f => f.name));
    
    const indefinido: typeof allOfferMappings = [];
    const otherCodes = new Set<string>();

    allOfferMappings.forEach(mapping => {
      const isIndefinido = 
        (mapping.funnel_id && indefinidoFunnelIds.has(mapping.funnel_id)) ||
        indefinidoFunnelNames.has(mapping.id_funil) ||
        (mapping.funnels as any)?.funnel_type === 'indefinido';

      if (isIndefinido) {
        indefinido.push(mapping);
      } else if (mapping.codigo_oferta) {
        // This code is mapped to a perpetuo or lancamento funnel
        otherCodes.add(mapping.codigo_oferta);
      }
    });

    return { indefinidoMappings: indefinido, otherFunnelCodes: otherCodes };
  }, [allOfferMappings, indefinidoFunnels]);

  // Fetch sales data for the period
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-indefinido', currentProject?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startTimestamp = `${format(startDate, 'yyyy-MM-dd')}T03:00:00.000Z`;
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndTimestamp = `${endDateObj.toISOString().split('T')[0]}T02:59:59.999Z`;
      
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('transaction_id, product_name, offer_code, total_price_brl, buyer_email, sale_date, status, installment_number')
        .eq('project_id', currentProject!.id)
        .in('status', ['APPROVED', 'COMPLETE'])
        .gte('sale_date', startTimestamp)
        .lte('sale_date', adjustedEndTimestamp);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Calculate metrics for each offer
  const offerMetrics = useMemo(() => {
    if (!salesData) return [];

    // Get offer codes from indefinido funnels
    const indefinidoOfferCodes = new Set(indefinidoMappings.map(m => m.codigo_oferta));
    
    // Group sales by offer code
    const salesByOffer: Record<string, { count: number; revenue: number; uniqueBuyers: Set<string> }> = {};
    
    salesData.forEach(sale => {
      const code = sale.offer_code || 'SEM_CODIGO';
      
      // Skip offers that are mapped to perpetuo or lancamento funnels
      if (otherFunnelCodes.has(code)) return;
      
      // Only include: offers in indefinido funnels OR completely unmapped offers
      const isInIndefinido = indefinidoOfferCodes.has(code);
      const isUnmapped = !otherFunnelCodes.has(code) && !indefinidoOfferCodes.has(code);
      
      if (!isInIndefinido && !isUnmapped) return;
      
      if (!salesByOffer[code]) {
        salesByOffer[code] = { count: 0, revenue: 0, uniqueBuyers: new Set() };
      }
      
      // Count only first installment for sales count
      const isFirstInstallment = sale.installment_number === 1 || sale.installment_number === null;
      if (isFirstInstallment) {
        salesByOffer[code].count += 1;
      }
      
      salesByOffer[code].revenue += sale.total_price_brl || 0;
      if (sale.buyer_email) {
        salesByOffer[code].uniqueBuyers.add(sale.buyer_email);
      }
    });

    // Transform to array with metrics
    return Object.entries(salesByOffer)
      .map(([code, data]) => {
        const mapping = indefinidoMappings.find(m => m.codigo_oferta === code);
        const funnel = indefinidoFunnels?.find(f => 
          f.id === mapping?.funnel_id || f.name === mapping?.id_funil
        );
        
        return {
          codigo: code,
          nome: mapping?.nome_oferta || mapping?.nome_produto || code,
          funnel: funnel?.name || 'Não mapeado',
          vendas: data.count,
          receita: data.revenue,
          ticketMedio: data.count > 0 ? data.revenue / data.count : 0,
          compradores: data.uniqueBuyers.size,
        };
      })
      .sort((a, b) => b.receita - a.receita);
  }, [salesData, indefinidoMappings, otherFunnelCodes, indefinidoFunnels]);

  // Summary totals
  const totals = useMemo(() => {
    return offerMetrics.reduce(
      (acc, offer) => ({
        vendas: acc.vendas + offer.vendas,
        receita: acc.receita + offer.receita,
        compradores: acc.compradores + offer.compradores,
      }),
      { vendas: 0, receita: 0, compradores: 0 }
    );
  }, [offerMetrics]);

  // Quick date setters
  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  const setThisMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Nenhum projeto selecionado</h2>
          <p className="text-muted-foreground mb-4">Selecione um projeto para visualizar as ofertas.</p>
          <Button onClick={() => navigate('/projects')}>Ir para Projetos</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Date Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setQuickDate(7)}>7 dias</Button>
                <Button variant="secondary" size="sm" onClick={() => setQuickDate(30)}>30 dias</Button>
                <Button variant="secondary" size="sm" onClick={setThisMonth}>Este mês</Button>
                <Button variant="secondary" size="sm" onClick={setLastMonth}>Mês anterior</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total de Ofertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerMetrics.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Vendas Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.vendas}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.receita)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ticket Médio Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.vendas > 0 ? formatCurrency(totals.receita / totals.vendas) : 'R$ 0,00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhamento por Oferta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className="flex justify-center py-12">
                <CubeLoader />
              </div>
            ) : offerMetrics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma oferta "A Definir" encontrada no período selecionado.</p>
                <p className="text-sm mt-2">
                  Ofertas aparecem aqui quando estão em funis do tipo "A Definir" ou não foram categorizadas.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oferta</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Funil</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Compradores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offerMetrics.map((offer, index) => (
                    <TableRow key={offer.codigo}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          {offer.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {offer.codigo}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={offer.funnel === 'Não mapeado' ? 'destructive' : 'secondary'}>
                          {offer.funnel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{offer.vendas}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(offer.receita)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(offer.ticketMedio)}</TableCell>
                      <TableCell className="text-right">{offer.compradores}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Sobre ofertas "A Definir"</p>
                <p>
                  Esta página mostra ofertas que estão em funis do tipo "A Definir" ou que ainda não foram
                  categorizadas em nenhum funil. Para mover uma oferta para um funil de Perpétuo ou Lançamento,
                  acesse a página de <Button variant="link" className="p-0 h-auto" onClick={() => navigateTo('offer-mappings')}>Mapeamento de Ofertas</Button>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UndefinedOffers;
