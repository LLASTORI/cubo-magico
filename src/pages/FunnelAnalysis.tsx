import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Percent, DollarSign, BarChart3, Target, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

interface SaleData {
  offer_code: string;
  total_sales: number;
  total_value: number;
  status: string;
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
  roas: number;
}

// Função para calcular a ordem correta no funil:
// FRONT -> OB1-5 -> US1 -> DS1 -> US2 -> DS2 -> US3 -> DS3 -> etc.
const getPositionSortOrder = (tipo: string, ordem: number): number => {
  if (tipo === 'FRONT' || tipo === 'FE') return 0; // FRONT sempre primeiro
  if (tipo === 'OB') return ordem; // OB1=1, OB2=2, OB3=3, OB4=4, OB5=5
  // US e DS são intercalados: US1=6, DS1=7, US2=8, DS2=9, etc.
  if (tipo === 'US') return 5 + (ordem * 2) - 1; // US1=6, US2=8, US3=10
  if (tipo === 'DS') return 5 + (ordem * 2); // DS1=7, DS2=9, DS3=11
  return 999;
};

const POSITION_COLORS: Record<string, string> = {
  'FRONT': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'FE': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'OB': 'bg-green-500/20 text-green-400 border-green-500/30',
  'US': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'DS': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const FunnelAnalysis = () => {
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<OfferMapping[]>([]);
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<string>("");
  const [investimento, setInvestimento] = useState<string>("");

  // Get unique funnels
  const funnels = useMemo(() => {
    const uniqueFunnels = [...new Set(mappings.map(m => m.id_funil))];
    return uniqueFunnels.sort();
  }, [mappings]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch offer mappings
      const { data: mappingsData } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('status', 'Ativo');
      
      if (mappingsData) {
        setMappings(mappingsData);
      }

      // Fetch sales aggregated by offer code
      const { data: salesAgg } = await supabase
        .from('hotmart_sales')
        .select('offer_code, status, total_price')
        .eq('status', 'COMPLETE');

      if (salesAgg) {
        // Aggregate sales by offer code
        const aggregated: Record<string, SaleData> = {};
        salesAgg.forEach((sale: any) => {
          const code = sale.offer_code || 'unknown';
          if (!aggregated[code]) {
            aggregated[code] = {
              offer_code: code,
              total_sales: 0,
              total_value: 0,
              status: sale.status,
            };
          }
          aggregated[code].total_sales += 1;
          aggregated[code].total_value += sale.total_price || 0;
        });
        setSalesData(Object.values(aggregated));
      }

      setLoading(false);
    };

    fetchData();
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

    // Find FRONT (Frontend) sales as base for conversion
    const feSales = funnelMappings
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => {
        const sale = salesData.find(s => s.offer_code === m.codigo_oferta);
        return sum + (sale?.total_sales || 0);
      }, 0);

    const totalFunnelRevenue = funnelMappings.reduce((sum, m) => {
      const sale = salesData.find(s => s.offer_code === m.codigo_oferta);
      return sum + (sale?.total_value || 0);
    }, 0);

    const investimentoNum = parseFloat(investimento) || 0;

    return funnelMappings.map(mapping => {
      const sale = salesData.find(s => s.offer_code === mapping.codigo_oferta);
      const totalVendas = sale?.total_sales || 0;
      const totalReceita = sale?.total_value || 0;

      // Conversion rate relative to FE
      const taxaConversao = feSales > 0 ? (totalVendas / feSales) * 100 : 0;
      
      // Revenue percentage
      const percentualReceita = totalFunnelRevenue > 0 ? (totalReceita / totalFunnelRevenue) * 100 : 0;

      // ROAS calculation (if investment is provided)
      const roas = investimentoNum > 0 ? totalReceita / investimentoNum : 0;

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
        roas: roas,
      } as PositionMetrics;
    });
  }, [selectedFunnel, mappings, salesData, investimento]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalVendas = funnelMetrics.reduce((sum, m) => sum + m.total_vendas, 0);
    const totalReceita = funnelMetrics.reduce((sum, m) => sum + m.total_receita, 0);
    const investimentoNum = parseFloat(investimento) || 0;
    const roasTotal = investimentoNum > 0 ? totalReceita / investimentoNum : 0;
    const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;

    return { totalVendas, totalReceita, roasTotal, ticketMedio };
  }, [funnelMetrics, investimento]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Análise de Funil
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Taxas de conversão, percentuais e ROAS por posição
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Funil</Label>
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
                <div className="space-y-2">
                  <Label>Investimento (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1000.00"
                    value={investimento}
                    onChange={(e) => setInvestimento(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {selectedFunnel ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total de Vendas</p>
                        <p className="text-3xl font-bold text-foreground">{summaryMetrics.totalVendas}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                        <BarChart3 className="w-6 h-6 text-primary-foreground" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                        <p className="text-3xl font-bold text-foreground">{formatCurrency(summaryMetrics.totalReceita)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                        <DollarSign className="w-6 h-6 text-primary-foreground" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                        <p className="text-3xl font-bold text-foreground">{formatCurrency(summaryMetrics.ticketMedio)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                        <Target className="w-6 h-6 text-primary-foreground" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">ROAS Total</p>
                        <p className="text-3xl font-bold text-foreground">
                          {summaryMetrics.roasTotal > 0 ? `${summaryMetrics.roasTotal.toFixed(2)}x` : '-'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                        <TrendingUp className="w-6 h-6 text-primary-foreground" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Funnel Flow Visualization */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Fluxo do Funil
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {funnelMetrics.map((metric, index) => (
                      <div key={metric.codigo_oferta} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <Badge 
                            variant="outline" 
                            className={`${POSITION_COLORS[metric.tipo_posicao] || 'bg-muted'} px-3 py-1`}
                          >
                            {metric.tipo_posicao}{metric.ordem_posicao > 0 ? metric.ordem_posicao : ''}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1">{metric.total_vendas} vendas</span>
                          <span className="text-xs font-medium">{formatPercent(metric.taxa_conversao)}</span>
                        </div>
                        {index < funnelMetrics.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Detailed Table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    Métricas por Posição
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posição</TableHead>
                          <TableHead>Oferta</TableHead>
                          <TableHead className="text-right">Valor Oferta</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Taxa Conv.</TableHead>
                          <TableHead className="text-right">% Receita</TableHead>
                          <TableHead className="text-right">ROAS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funnelMetrics.map((metric) => (
                          <TableRow key={metric.codigo_oferta}>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`${POSITION_COLORS[metric.tipo_posicao] || 'bg-muted'}`}
                              >
                                {metric.nome_posicao || `${metric.tipo_posicao}${metric.ordem_posicao > 0 ? metric.ordem_posicao : ''}`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{metric.nome_oferta || '-'}</p>
                                <p className="text-xs text-muted-foreground">{metric.codigo_oferta}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(metric.valor_oferta)}</TableCell>
                            <TableCell className="text-right font-medium">{metric.total_vendas}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(metric.total_receita)}</TableCell>
                            <TableCell className="text-right">
                              <span className={metric.taxa_conversao >= 100 ? 'text-green-500' : 'text-foreground'}>
                                {formatPercent(metric.taxa_conversao)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{formatPercent(metric.percentual_receita)}</TableCell>
                            <TableCell className="text-right">
                              {metric.roas > 0 ? (
                                <span className={metric.roas >= 2 ? 'text-green-500' : metric.roas >= 1 ? 'text-yellow-500' : 'text-red-500'}>
                                  {metric.roas.toFixed(2)}x
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Selecione um Funil
                </h3>
                <p className="text-muted-foreground">
                  Escolha um funil para visualizar as métricas de conversão e ROAS
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FunnelAnalysis;
