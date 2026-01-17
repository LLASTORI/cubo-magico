/**
 * PROMPT 30: Mapa de Ascensão - Visualização estratégica premium
 * 
 * Pergunta que responde:
 * "Qual caminho os clientes realmente percorrem e onde estão as oportunidades?"
 * 
 * Layout:
 * 1. Painel de Filtros (período, passos, min. clientes)
 * 2. Gráfico Sankey (altura fixa, scroll horizontal)
 * 3. Insights Automáticos (caminho campeão, gargalo, produto de entrada)
 * 
 * NÃO contém:
 * ❌ Métricas globais ou resumo geral
 * ❌ Cards executivos
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/contexts/ProjectContext';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { TrendingUp, AlertCircle, Lightbulb, Target, ArrowRight, Trophy, AlertTriangle, Star } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionData {
  contact_id: string;
  product_name: string | null;
  transaction_date: string | null;
  total_price: number | null;
}

interface FlowNode {
  id: string;
  name: string;
  column: number;
  count: number;
  percentage: number;
  revenue: number;
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
  percentage: number;
  sourceName: string;
  targetName: string;
}

interface Insight {
  type: 'champion' | 'bottleneck' | 'entry';
  icon: React.ReactNode;
  title: string;
  description: string;
  value?: string;
  color: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(316, 73%, 52%)',
  'hsl(24, 95%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(47, 96%, 53%)',
  'hsl(199, 89%, 48%)',
];

const PERIOD_OPTIONS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último ano' },
  { value: 'all', label: 'Todo o período' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
};

export function CustomerFlowsAnalysis() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // Filtros
  const [period, setPeriod] = useState('all');
  const [maxSteps, setMaxSteps] = useState(4);
  const [minFlowSize, setMinFlowSize] = useState(2);

  // Calcular datas com base no período
  const dateRange = useMemo(() => {
    if (period === 'all') return null;
    const days = parseInt(period);
    return {
      start: startOfDay(subDays(new Date(), days)),
      end: endOfDay(new Date()),
    };
  }, [period]);

  // Buscar transações (cache de 5 min via usePaginatedQuery)
  const { data: transactions = [], isLoading } = usePaginatedQuery<TransactionData>(
    ['crm-flows-transactions', projectId, period],
    {
      table: 'crm_transactions',
      select: 'contact_id, product_name, transaction_date, total_price',
      filters: { project_id: projectId },
      inFilters: { status: ['APPROVED', 'COMPLETE'] },
      orderBy: { column: 'transaction_date', ascending: true },
      enabled: !!projectId,
    }
  );

  // Filtrar por período
  const filteredTransactions = useMemo(() => {
    if (!dateRange) return transactions;
    return transactions.filter(tx => {
      if (!tx.transaction_date) return false;
      const txDate = new Date(tx.transaction_date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Agrupar transações por contato para formar jornadas
  const journeys = useMemo(() => {
    const contactPurchases = new Map<string, { productName: string; date: string; price: number }[]>();

    filteredTransactions.forEach(tx => {
      if (!tx.product_name) return;
      
      const purchases = contactPurchases.get(tx.contact_id) || [];
      purchases.push({
        productName: tx.product_name,
        date: tx.transaction_date || '',
        price: tx.total_price || 0,
      });
      contactPurchases.set(tx.contact_id, purchases);
    });

    // Ordenar compras por data para cada contato
    contactPurchases.forEach((purchases) => {
      purchases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return Array.from(contactPurchases.entries()).map(([contactId, purchases]) => ({
      contactId,
      purchases,
      totalPurchases: purchases.length,
    }));
  }, [filteredTransactions]);

  // Calcular dados de fluxo
  const flowData = useMemo(() => {
    if (journeys.length === 0) return { nodes: [], links: [], columns: [], nodeColorMap: new Map() };

    const transitionCounts = new Map<string, Map<string, number>>();
    const productAtStep = new Map<string, Map<string, { count: number; revenue: number }>>();

    journeys.forEach(journey => {
      const purchases = journey.purchases.slice(0, maxSteps);
      
      purchases.forEach((purchase, index) => {
        const stepKey = `step_${index}`;
        const productKey = `${stepKey}:${purchase.productName}`;
        
        if (!productAtStep.has(stepKey)) {
          productAtStep.set(stepKey, new Map());
        }
        const stepProducts = productAtStep.get(stepKey)!;
        const existing = stepProducts.get(purchase.productName) || { count: 0, revenue: 0 };
        stepProducts.set(purchase.productName, {
          count: existing.count + 1,
          revenue: existing.revenue + purchase.price,
        });

        if (index < purchases.length - 1) {
          const nextPurchase = purchases[index + 1];
          const nextProductKey = `step_${index + 1}:${nextPurchase.productName}`;
          
          if (!transitionCounts.has(productKey)) {
            transitionCounts.set(productKey, new Map());
          }
          const transitions = transitionCounts.get(productKey)!;
          transitions.set(nextProductKey, (transitions.get(nextProductKey) || 0) + 1);
        }
      });
    });

    const nodes: FlowNode[] = [];
    const nodeColorMap = new Map<string, string>();
    let colorIndex = 0;

    productAtStep.forEach((products, stepKey) => {
      const stepIndex = parseInt(stepKey.split('_')[1]);
      const totalAtStep = Array.from(products.values()).reduce((sum, p) => sum + p.count, 0);
      
      products.forEach((data, productName) => {
        if (data.count >= minFlowSize) {
          const nodeId = `${stepKey}:${productName}`;
          
          if (!nodeColorMap.has(productName)) {
            nodeColorMap.set(productName, COLORS[colorIndex % COLORS.length]);
            colorIndex++;
          }

          nodes.push({
            id: nodeId,
            name: productName,
            column: stepIndex,
            count: data.count,
            percentage: (data.count / totalAtStep) * 100,
            revenue: data.revenue,
          });
        }
      });
    });

    const links: FlowLink[] = [];
    const totalJourneys = journeys.length;

    transitionCounts.forEach((targets, sourceId) => {
      targets.forEach((count, targetId) => {
        if (count >= minFlowSize) {
          const sourceExists = nodes.some(n => n.id === sourceId);
          const targetExists = nodes.some(n => n.id === targetId);
          
          if (sourceExists && targetExists) {
            const sourceName = sourceId.split(':').slice(1).join(':');
            const targetName = targetId.split(':').slice(1).join(':');
            
            links.push({
              source: sourceId,
              target: targetId,
              value: count,
              percentage: (count / totalJourneys) * 100,
              sourceName,
              targetName,
            });
          }
        }
      });
    });

    const columns: FlowNode[][] = [];
    for (let i = 0; i < maxSteps; i++) {
      columns.push(nodes.filter(n => n.column === i).sort((a, b) => b.count - a.count));
    }

    return { nodes, links, columns, nodeColorMap };
  }, [journeys, maxSteps, minFlowSize]);

  const { nodes, links, columns, nodeColorMap } = flowData;

  // Calcular insights automáticos
  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];
    
    if (nodes.length === 0 || links.length === 0) return result;

    // 1. Produto de Entrada (mais popular na coluna 0)
    const entryProducts = columns[0] || [];
    if (entryProducts.length > 0) {
      const topEntry = entryProducts[0];
      result.push({
        type: 'entry',
        icon: <Star className="h-4 w-4" />,
        title: 'Produto de Entrada',
        description: `${topEntry.name} é o principal ponto de entrada`,
        value: `${topEntry.count} clientes (${topEntry.percentage.toFixed(0)}%)`,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
      });
    }

    // 2. Caminho Campeão (link com mais clientes)
    if (links.length > 0) {
      const championLink = [...links].sort((a, b) => b.value - a.value)[0];
      result.push({
        type: 'champion',
        icon: <Trophy className="h-4 w-4" />,
        title: 'Caminho Campeão',
        description: `${championLink.sourceName} → ${championLink.targetName}`,
        value: `${championLink.value} clientes (${championLink.percentage.toFixed(1)}%)`,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      });
    }

    // 3. Gargalo (produto com muita entrada mas pouca saída)
    const nodesWithLowContinuation: Array<{ node: FlowNode; dropRate: number }> = [];
    
    nodes.forEach(node => {
      if (node.column >= maxSteps - 1) return; // Ignora última coluna
      
      const outgoingLinks = links.filter(l => l.source === node.id);
      const totalOutgoing = outgoingLinks.reduce((sum, l) => sum + l.value, 0);
      
      if (node.count > 5 && totalOutgoing < node.count * 0.3) {
        nodesWithLowContinuation.push({
          node,
          dropRate: 100 - (totalOutgoing / node.count * 100),
        });
      }
    });

    if (nodesWithLowContinuation.length > 0) {
      const biggestBottleneck = nodesWithLowContinuation.sort((a, b) => b.node.count - a.node.count)[0];
      result.push({
        type: 'bottleneck',
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Gargalo Identificado',
        description: `${biggestBottleneck.node.name} tem baixa conversão para próxima compra`,
        value: `${biggestBottleneck.dropRate.toFixed(0)}% não avançam`,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
      });
    }

    return result;
  }, [nodes, links, columns, maxSteps]);

  // Calcular dimensões e posições do SVG
  const svgWidth = Math.max(900, columns.length * 220);
  const columnWidth = svgWidth / (columns.length || 1);
  const nodeWidth = 140;
  const nodeMinHeight = 30;
  const nodePadding = 10;

  // Calcular altura necessária dinamicamente para não cortar nós
  const calculatedHeight = useMemo(() => {
    let maxColumnHeight = 0;
    columns.forEach(column => {
      const columnHeight = column.reduce((sum, node) => {
        const height = Math.max(nodeMinHeight, (node.count / Math.max(1, column.reduce((s, n) => s + n.count, 0))) * 300);
        return sum + height + nodePadding;
      }, 60); // padding top + bottom
      maxColumnHeight = Math.max(maxColumnHeight, columnHeight);
    });
    return Math.max(420, Math.min(800, maxColumnHeight)); // Min 420, max 800
  }, [columns, nodeMinHeight, nodePadding]);

  const svgHeight = calculatedHeight;

  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; height: number }>();
    
    columns.forEach((column, colIndex) => {
      const totalCount = column.reduce((sum, n) => sum + n.count, 0);
      const availableHeight = svgHeight - 60;
      let currentY = 30;
      
      column.forEach(node => {
        const heightRatio = node.count / totalCount;
        const height = Math.max(nodeMinHeight, heightRatio * availableHeight * 0.8);
        
        positions.set(node.id, {
          x: colIndex * columnWidth + (columnWidth - nodeWidth) / 2,
          y: currentY,
          height,
        });
        
        currentY += height + nodePadding;
      });
    });
    
    return positions;
  }, [columns, svgHeight, columnWidth, nodeWidth, nodeMinHeight, nodePadding]);

  const generateLinkPath = (link: FlowLink) => {
    const sourcePos = nodePositions.get(link.source);
    const targetPos = nodePositions.get(link.target);
    
    if (!sourcePos || !targetPos) return '';

    const sourceX = sourcePos.x + nodeWidth;
    const sourceY = sourcePos.y + sourcePos.height / 2;
    const targetX = targetPos.x;
    const targetY = targetPos.y + targetPos.height / 2;
    
    const midX = (sourceX + targetX) / 2;
    
    return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
  };

  // Importar skeleton dedicado para loading progressivo
  if (isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in-0 duration-200">
        {/* Filtros - aparecem primeiro mesmo em loading */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Período:</span>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Passos:</span>
                <Select value={maxSteps.toString()} onValueChange={(v) => setMaxSteps(parseInt(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mín. clientes:</span>
                <Select value={minFlowSize.toString()} onValueChange={(v) => setMinFlowSize(parseInt(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </CardContent>
        </Card>
        
        {/* Container do gráfico com skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mapa de Ascensão</CardTitle>
            </div>
            <CardDescription>
              Visualize os caminhos que seus clientes percorrem entre produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-muted/20 p-4 overflow-hidden" style={{ height: 420 }}>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Skeleton className="h-8 w-8 rounded-full mx-auto mb-3" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Insights skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Insights do Mapa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customersWithMultiplePurchases = journeys.filter(j => j.totalPurchases > 1).length;

  if (journeys.length === 0 || customersWithMultiplePurchases < minFlowSize) {
    return (
      <div className="space-y-4">
        {/* Filtros mesmo sem dados */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Período:</span>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                Dados insuficientes para visualizar o mapa
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                É necessário ter clientes com múltiplas compras para gerar o fluxo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Painel de Filtros */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Período:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Passos:</span>
              <Select value={maxSteps.toString()} onValueChange={(v) => setMaxSteps(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Mín. clientes:</span>
              <Select value={minFlowSize.toString()} onValueChange={(v) => setMinFlowSize(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{customersWithMultiplePurchases.toLocaleString('pt-BR')}</span> clientes com recompra
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Sankey */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Mapa de Ascensão</CardTitle>
          </div>
          <CardDescription>
            Visualize os caminhos que seus clientes percorrem entre produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Labels */}
          <div className="flex mb-2" style={{ width: svgWidth }}>
            {columns.map((_, index) => (
              <div 
                key={index} 
                className="flex-1 text-center"
                style={{ width: columnWidth }}
              >
                <Badge variant="outline" className="text-xs">
                  {index === 0 ? 'Entrada' : `Compra ${index + 1}`}
                </Badge>
              </div>
            ))}
          </div>

          {/* SVG Flow Chart com scroll horizontal E vertical */}
          <div className="overflow-auto border rounded-lg bg-muted/20 p-4" style={{ maxHeight: 480, maxWidth: '100%' }}>
            <svg width={svgWidth} height={svgHeight} className="block">
              {/* Links */}
              <g>
                {links.map((link, index) => {
                  const sourceNode = nodes.find(n => n.id === link.source);
                  const opacity = Math.max(0.2, Math.min(0.7, link.value / 20));
                  const strokeWidth = Math.max(2, Math.min(20, link.value / 2));
                  
                  return (
                    <TooltipProvider key={index}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <path
                            d={generateLinkPath(link)}
                            fill="none"
                            stroke={sourceNode ? nodeColorMap?.get(sourceNode.name) || 'hsl(var(--primary))' : 'hsl(var(--primary))'}
                            strokeWidth={strokeWidth}
                            strokeOpacity={opacity}
                            className="transition-all hover:stroke-opacity-100 cursor-pointer"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium flex items-center gap-1">
                              {link.sourceName} <ArrowRight className="h-3 w-3" /> {link.targetName}
                            </p>
                            <p className="text-sm">{link.value} clientes ({link.percentage.toFixed(1)}%)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {nodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const color = nodeColorMap?.get(node.name) || COLORS[0];

                  return (
                    <TooltipProvider key={node.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <g className="cursor-pointer">
                            <rect
                              x={pos.x}
                              y={pos.y}
                              width={nodeWidth}
                              height={pos.height}
                              rx={6}
                              fill={color}
                              fillOpacity={0.9}
                              className="transition-all hover:fill-opacity-100"
                            />
                            <foreignObject
                              x={pos.x + 4}
                              y={pos.y + 4}
                              width={nodeWidth - 8}
                              height={pos.height - 8}
                            >
                              <div className="h-full flex flex-col justify-center text-white text-xs overflow-hidden">
                                <p className="font-medium truncate leading-tight">
                                  {node.name.length > 18 ? node.name.substring(0, 18) + '...' : node.name}
                                </p>
                                <p className="opacity-80">{node.count} clientes</p>
                              </div>
                            </foreignObject>
                          </g>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{node.name}</p>
                            <p className="text-sm">{node.count} clientes ({node.percentage.toFixed(1)}%)</p>
                            <p className="text-sm text-muted-foreground">
                              Receita: {formatCurrency(node.revenue)}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Legend */}
          {nodeColorMap && nodeColorMap.size > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-3">
                {Array.from(nodeColorMap.entries()).slice(0, 10).map(([product, color]) => (
                  <div key={product} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {product}
                    </span>
                  </div>
                ))}
                {nodeColorMap.size > 10 && (
                  <span className="text-xs text-muted-foreground">
                    +{nodeColorMap.size - 10} produtos
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Automáticos */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Insights do Mapa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${insight.color}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {insight.icon}
                    <span className="font-medium text-sm">{insight.title}</span>
                  </div>
                  <p className="text-sm opacity-90">{insight.description}</p>
                  {insight.value && (
                    <p className="text-xs mt-2 font-medium">{insight.value}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
