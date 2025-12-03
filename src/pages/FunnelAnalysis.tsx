import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Percent, DollarSign, BarChart3, Target, ArrowRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeriodComparison from "@/components/funnel/PeriodComparison";
import FunnelChangelog from "@/components/funnel/FunnelChangelog";
import TemporalChart from "@/components/funnel/TemporalChart";
import UTMAnalysis from "@/components/funnel/UTMAnalysis";
import PaymentMethodAnalysis from "@/components/funnel/PaymentMethodAnalysis";
import CustomerCohort from "@/components/funnel/CustomerCohort";
interface OfferMapping {
  id: string;
  id_funil: string;
  nome_produto: string;
  nome_oferta: string | null;
  codigo_oferta: string | null;
  tipo_posicao: string | null;
  nome_posicao: string | null;
  ordem_posicao: number | null;
  valor: number | null;
  status: string | null;
}

interface DashboardSale {
  transaction: string;
  product: string;
  buyer: string;
  value: number;
  status: string;
  date: string;
  offerCode?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  utmPlacement?: string;
  utmCreative?: string;
}

interface AggregatedSaleData {
  offer_code: string;
  total_sales: number;
  total_value: number;
}

interface PositionMetrics {
  tipo_posicao: string;
  nome_posicao: string;
  ordem_posicao: number;
  nome_oferta: string;
  codigo_oferta: string;
  valor_oferta: number;
  total_vendas: number;
  total_receita: number;
  taxa_conversao: number;
  percentual_receita: number;
}

// Função para calcular a ordem correta no funil:
// FRONT -> OB1-5 -> US1 -> DS1 -> US2 -> DS2 -> US3 -> DS3 -> etc.
const getPositionSortOrder = (tipo: string, ordem: number): number => {
  if (tipo === 'FRONT' || tipo === 'FE') return 0;
  if (tipo === 'OB') return ordem;
  if (tipo === 'US') return 5 + (ordem * 2) - 1;
  if (tipo === 'DS') return 5 + (ordem * 2);
  return 999;
};

const POSITION_COLORS: Record<string, string> = {
  'FRONT': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'FE': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'OB': 'bg-green-500/20 text-green-400 border-green-500/30',
  'US': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'DS': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// Taxas de conversão ideais por posição
const OPTIMAL_CONVERSION_RATES: Record<string, { min: number; max: number }> = {
  'OB1': { min: 30, max: 40 },
  'OB2': { min: 20, max: 30 },
  'OB3': { min: 10, max: 20 },
  'US1': { min: 8, max: 10 },
  'US2': { min: 3, max: 5 },
  'DS1': { min: 1, max: 3 },
  'DS2': { min: 1, max: 3 },
};

// Gera insight para o card do funil
const generateFunnelInsight = (
  tipo: string,
  ordem: number,
  taxaConversao: number,
  totalReceita: number,
  totalVendas: number,
  valorOferta: number
): { message: string; status: 'exceptional' | 'optimal' | 'improving' | 'neutral' } => {
  const positionKey = `${tipo}${ordem || ''}`;
  const optimalRange = OPTIMAL_CONVERSION_RATES[positionKey];
  
  // FRONT não tem benchmark de conversão (é a base)
  if (tipo === 'FRONT' || tipo === 'FE') {
    const potentialIncrease10 = totalReceita * 0.1;
    return {
      message: `🎯 Base do funil! Se aumentar 10% nas vendas front-end, potencial de +${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(potentialIncrease10)} em receita direta. Continue otimizando suas campanhas!`,
      status: 'neutral'
    };
  }
  
  if (!optimalRange) {
    return {
      message: `📊 Posição ${positionKey}: ${taxaConversao.toFixed(1)}% de conversão. Continue monitorando os resultados!`,
      status: 'neutral'
    };
  }
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  // Calcula o impacto de 10% de melhoria
  const currentSales = totalVendas;
  const improvedSales = Math.ceil(currentSales * 1.1);
  const additionalSales = improvedSales - currentSales;
  const additionalRevenue = additionalSales * valorOferta;
  
  if (taxaConversao > optimalRange.max) {
    // EXCEPCIONAL - acima do ponto ótimo
    return {
      message: `🏆 Excepcional! Taxa de ${taxaConversao.toFixed(1)}% está acima do ideal (${optimalRange.min}-${optimalRange.max}%)! Parabéns pela excelente performance! 💡 Oportunidade: considere testar um aumento de preço nesta oferta para maximizar o faturamento.`,
      status: 'exceptional'
    };
  } else if (taxaConversao >= optimalRange.min && taxaConversao <= optimalRange.max) {
    // NO PONTO ÓTIMO
    return {
      message: `✅ Ótimo trabalho! Taxa de ${taxaConversao.toFixed(1)}% está no ponto ideal (${optimalRange.min}-${optimalRange.max}%)! Continue assim! +10% de conversão = +${formatCurrency(additionalRevenue)} potencial.`,
      status: 'optimal'
    };
  } else {
    // ABAIXO DO IDEAL - espaço para melhorar
    const gap = optimalRange.min - taxaConversao;
    return {
      message: `📈 Espaço para crescer! Taxa atual: ${taxaConversao.toFixed(1)}% | Meta: ${optimalRange.min}-${optimalRange.max}%. Se melhorar 10%, você pode ganhar +${formatCurrency(additionalRevenue)}! Você está a ${gap.toFixed(1)}pp do ponto ideal. Vamos lá! 💪`,
      status: 'improving'
    };
  }
};

const FunnelAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mappings, setMappings] = useState<OfferMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<string>("");

  // Get sales data from Dashboard navigation state
  const dashboardData = location.state as { salesData?: DashboardSale[]; filters?: any } | null;
  const salesFromDashboard = dashboardData?.salesData || [];

  // Get unique funnels
  const funnels = useMemo(() => {
    const uniqueFunnels = [...new Set(mappings.map(m => m.id_funil))];
    return uniqueFunnels.sort();
  }, [mappings]);

  // Aggregate sales by offer_code from Dashboard data
  const salesData = useMemo((): AggregatedSaleData[] => {
    const aggregated: Record<string, AggregatedSaleData> = {};
    
    salesFromDashboard.forEach(sale => {
      const code = sale.offerCode || 'unknown';
      if (!aggregated[code]) {
        aggregated[code] = {
          offer_code: code,
          total_sales: 0,
          total_value: 0,
        };
      }
      aggregated[code].total_sales += 1;
      aggregated[code].total_value += sale.value || 0;
    });

    return Object.values(aggregated);
  }, [salesFromDashboard]);

  // Fetch offer mappings on mount
  useEffect(() => {
    const fetchMappings = async () => {
      setLoadingMappings(true);
      const { data: mappingsData } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('status', 'Ativo');
      
      if (mappingsData) {
        setMappings(mappingsData);
      }
      setLoadingMappings(false);
    };

    fetchMappings();
  }, []);

  // Calculate metrics for selected funnel
  const funnelMetrics = useMemo(() => {
    if (!selectedFunnel) return [];

    const funnelMappings = mappings
      .filter(m => m.id_funil === selectedFunnel)
      .sort((a, b) => {
        const orderA = getPositionSortOrder(a.tipo_posicao || '', a.ordem_posicao || 0);
        const orderB = getPositionSortOrder(b.tipo_posicao || '', b.ordem_posicao || 0);
        return orderA - orderB;
      });

    console.log('=== DEBUG: Análise de Funil ===');
    console.log('Funil selecionado:', selectedFunnel);
    console.log('Mapeamentos do funil:', funnelMappings.map(m => ({ 
      codigo: m.codigo_oferta, 
      posicao: m.tipo_posicao,
      nome: m.nome_oferta 
    })));
    console.log('salesData agregado:', salesData);

    // Find FRONT (Frontend) sales as base for conversion
    const feSales = funnelMappings
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => {
        const sale = salesData.find(s => s.offer_code === m.codigo_oferta);
        console.log(`FRONT código ${m.codigo_oferta}: encontrado=${!!sale}, vendas=${sale?.total_sales || 0}`);
        return sum + (sale?.total_sales || 0);
      }, 0);

    console.log('Total vendas FRONT:', feSales);

    const totalFunnelRevenue = funnelMappings.reduce((sum, m) => {
      const sale = salesData.find(s => s.offer_code === m.codigo_oferta);
      return sum + (sale?.total_value || 0);
    }, 0);

    return funnelMappings.map(mapping => {
      const sale = salesData.find(s => s.offer_code === mapping.codigo_oferta);
      const totalVendas = sale?.total_sales || 0;
      const totalReceita = sale?.total_value || 0;

      const taxaConversao = feSales > 0 ? (totalVendas / feSales) * 100 : 0;
      const percentualReceita = totalFunnelRevenue > 0 ? (totalReceita / totalFunnelRevenue) * 100 : 0;

      return {
        tipo_posicao: mapping.tipo_posicao || '',
        nome_posicao: mapping.nome_posicao || '',
        ordem_posicao: mapping.ordem_posicao || 0,
        nome_oferta: mapping.nome_oferta || '',
        codigo_oferta: mapping.codigo_oferta || '',
        valor_oferta: mapping.valor || 0,
        total_vendas: totalVendas,
        total_receita: totalReceita,
        taxa_conversao: taxaConversao,
        percentual_receita: percentualReceita,
      } as PositionMetrics;
    });
  }, [selectedFunnel, mappings, salesData]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalVendas = funnelMetrics.reduce((sum, m) => sum + m.total_vendas, 0);
    const totalReceita = funnelMetrics.reduce((sum, m) => sum + m.total_receita, 0);
    
    // Count unique customers (buyers) from sales data
    const uniqueCustomers = new Set(salesFromDashboard.map(sale => sale.buyer)).size;
    const ticketMedio = uniqueCustomers > 0 ? totalReceita / uniqueCustomers : 0;

    return { totalVendas, totalReceita, ticketMedio, uniqueCustomers };
  }, [funnelMetrics, salesFromDashboard]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // If no data from Dashboard, show message
  if (salesFromDashboard.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Análise de Funil
                </h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <Card className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum dado disponível
            </h3>
            <p className="text-muted-foreground mb-6">
              Primeiro, busque os dados no Dashboard usando os filtros desejados.
              Depois, clique em "Análise de Funil" para analisar os dados filtrados.
            </p>
            <Button onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Análise de Funil
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Taxas de conversão e métricas de vendas por posição
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {salesFromDashboard.length} vendas do Dashboard
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {loadingMappings ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Funnel Selector */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1 max-w-sm">
                  <Label>Selecione o Funil</Label>
                  <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funil" />
                    </SelectTrigger>
                    <SelectContent>
                      {funnels.map(funnel => (
                        <SelectItem key={funnel} value={funnel}>
                          {funnel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {selectedFunnel ? (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="flex flex-wrap w-full max-w-4xl gap-1">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="temporal">Gráfico Temporal</TabsTrigger>
                  <TabsTrigger value="comparison">Comparar Períodos</TabsTrigger>
                  <TabsTrigger value="utm">UTM</TabsTrigger>
                  <TabsTrigger value="payment">Pagamentos</TabsTrigger>
                  <TabsTrigger value="cohort">Clientes</TabsTrigger>
                  <TabsTrigger value="changelog">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-6 cursor-help">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                              <p className="text-3xl font-bold text-foreground">{summaryMetrics.uniqueCustomers}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>Número de compradores únicos identificados pelo e-mail/nome. Um cliente que compra múltiplos produtos conta apenas uma vez.</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                      <Card className="p-6 cursor-help">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total de Produtos Vendidos</p>
                            <p className="text-3xl font-bold text-foreground">{summaryMetrics.totalVendas}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                            <BarChart3 className="w-6 h-6 text-primary-foreground" />
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>Quantidade total de produtos vendidos no funil selecionado, considerando todas as posições (FRONT, OB, US, DS).</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="p-6 cursor-help">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(summaryMetrics.totalReceita)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                            <DollarSign className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>Soma de todos os valores de vendas realizadas no funil selecionado.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="p-6 cursor-help">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(summaryMetrics.ticketMedio)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>Receita Total ÷ Clientes Únicos. Representa o valor médio gasto por cada cliente no funil.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Funnel Flow Visualization */}
                <Card className="p-6 overflow-hidden">
                  <h3 className="text-lg font-semibold mb-6">Fluxo do Funil</h3>
                  <div className="relative">
                    {/* Background gradient line */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 rounded-full -translate-y-1/2 hidden md:block" />
                    
                    <div className="flex flex-wrap md:flex-nowrap items-stretch gap-3 md:gap-0">
                      {funnelMetrics.map((metric, index) => {
                        const maxSales = Math.max(...funnelMetrics.map(m => m.total_vendas));
                        const heightPercent = maxSales > 0 ? (metric.total_vendas / maxSales) * 100 : 0;
                        const gradients: Record<string, string> = {
                          'FRONT': 'from-blue-500 to-cyan-400',
                          'FE': 'from-blue-500 to-cyan-400',
                          'OB': 'from-emerald-500 to-green-400',
                          'US': 'from-purple-500 to-violet-400',
                          'DS': 'from-orange-500 to-amber-400',
                        };
                        const gradient = gradients[metric.tipo_posicao] || 'from-gray-500 to-gray-400';
                        
                        const insight = generateFunnelInsight(
                          metric.tipo_posicao,
                          metric.ordem_posicao,
                          metric.taxa_conversao,
                          metric.total_receita,
                          metric.total_vendas,
                          metric.valor_oferta
                        );
                        
                        const statusBorderColors = {
                          exceptional: 'border-yellow-400',
                          optimal: 'border-green-400',
                          improving: 'border-blue-400',
                          neutral: 'border-white/20',
                        };
                        
                        return (
                          <div key={metric.codigo_oferta} className="flex items-center flex-1 min-w-[120px]">
                            {/* Funnel Step */}
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <div className="relative group flex-1 cursor-help">
                                  <div 
                                    className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${gradient} shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${statusBorderColors[insight.status]}`}
                                    style={{ 
                                      minHeight: '120px',
                                      opacity: 0.9 + (heightPercent / 1000)
                                    }}
                                  >
                                    {/* Glow effect */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300`} />
                                    
                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                                      <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                                        {metric.tipo_posicao}{metric.ordem_posicao || ''}
                                      </span>
                                      <span className="text-3xl font-black mb-1">
                                        {metric.total_vendas}
                                      </span>
                                      <div className="flex items-center gap-1 text-xs font-medium opacity-90">
                                        <Percent className="w-3 h-3" />
                                        {formatPercent(metric.taxa_conversao)}
                                      </div>
                                      
                                      {/* Revenue bar */}
                                      <div className="w-full mt-3 bg-white/20 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className="h-full bg-white/60 rounded-full transition-all duration-500"
                                          style={{ width: `${metric.percentual_receita}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] mt-1 opacity-70">
                                        {formatCurrency(metric.total_receita)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-sm p-3">
                                <p className="text-sm leading-relaxed">{insight.message}</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            {/* Connector Arrow */}
                            {index < funnelMetrics.length - 1 && (
                              <div className="hidden md:flex items-center justify-center w-8 relative z-10">
                                <div className="w-full h-0.5 bg-gradient-to-r from-current to-current opacity-30" />
                                <ArrowRight className="absolute w-5 h-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-cyan-400" />
                      <span>Frontend</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-green-400" />
                      <span>Order Bump</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-violet-400" />
                      <span>Upsell</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-amber-400" />
                      <span>Downsell</span>
                    </div>
                  </div>
                </Card>

                {/* Detailed Table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Detalhamento por Posição</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posição</TableHead>
                          <TableHead>Oferta</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Taxa Conv.</TableHead>
                          <TableHead className="text-right">% Receita</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funnelMetrics.map((metric) => (
                          <TableRow key={metric.codigo_oferta}>
                            <TableCell>
                              <Badge variant="outline" className={POSITION_COLORS[metric.tipo_posicao]}>
                                {metric.tipo_posicao}{metric.ordem_posicao || ''}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{metric.nome_oferta || '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{metric.codigo_oferta}</TableCell>
                            <TableCell className="text-right">{formatCurrency(metric.valor_oferta)}</TableCell>
                            <TableCell className="text-right font-bold">{metric.total_vendas}</TableCell>
                            <TableCell className="text-right">{formatCurrency(metric.total_receita)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={metric.taxa_conversao > 10 ? "default" : "secondary"}>
                                {formatPercent(metric.taxa_conversao)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatPercent(metric.percentual_receita)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
                </TabsContent>

                <TabsContent value="temporal">
                  <TemporalChart
                    selectedFunnel={selectedFunnel}
                    funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  />
                </TabsContent>

                <TabsContent value="comparison">
                  <PeriodComparison
                    selectedFunnel={selectedFunnel}
                    funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  />
                </TabsContent>

                <TabsContent value="utm">
                  <UTMAnalysis
                    selectedFunnel={selectedFunnel}
                    funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  />
                </TabsContent>

                <TabsContent value="payment">
                  <PaymentMethodAnalysis
                    selectedFunnel={selectedFunnel}
                    funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  />
                </TabsContent>

                <TabsContent value="cohort">
                  <CustomerCohort
                    selectedFunnel={selectedFunnel}
                    funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  />
                </TabsContent>

                <TabsContent value="changelog">
                  <FunnelChangelog
                    selectedFunnel={selectedFunnel}
                    offerOptions={funnelMetrics.map(m => ({
                      codigo_oferta: m.codigo_oferta,
                      nome_oferta: m.nome_oferta
                    }))}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="p-12 text-center">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Selecione um Funil
                </h3>
                <p className="text-muted-foreground">
                  Escolha um funil acima para visualizar as métricas de conversão
                </p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FunnelAnalysis;
