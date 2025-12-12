import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustomerJourney } from '@/hooks/useCRMJourneyData';
import { ArrowRight, Info } from 'lucide-react';

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
}

interface CustomerFlowChartProps {
  journeys: CustomerJourney[];
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
};

export function CustomerFlowChart({ journeys }: CustomerFlowChartProps) {
  const [maxSteps, setMaxSteps] = useState(4);
  const [minFlowSize, setMinFlowSize] = useState(2);

  const flowData = useMemo(() => {
    if (journeys.length === 0) return { nodes: [], links: [], columns: [] };

    // Count transitions between products at each step
    const transitionCounts = new Map<string, Map<string, number>>();
    const productAtStep = new Map<string, Map<string, { count: number; revenue: number }>>();

    journeys.forEach(journey => {
      const purchases = journey.purchases.slice(0, maxSteps);
      
      purchases.forEach((purchase, index) => {
        const stepKey = `step_${index}`;
        const productKey = `${stepKey}:${purchase.productName}`;
        
        // Count products at each step
        if (!productAtStep.has(stepKey)) {
          productAtStep.set(stepKey, new Map());
        }
        const stepProducts = productAtStep.get(stepKey)!;
        const existing = stepProducts.get(purchase.productName) || { count: 0, revenue: 0 };
        stepProducts.set(purchase.productName, {
          count: existing.count + 1,
          revenue: existing.revenue + purchase.totalPrice,
        });

        // Count transitions to next product
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

    // Build nodes
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

    // Build links
    const links: FlowLink[] = [];
    const totalJourneys = journeys.length;

    transitionCounts.forEach((targets, sourceId) => {
      targets.forEach((count, targetId) => {
        if (count >= minFlowSize) {
          // Only add link if both source and target nodes exist
          const sourceExists = nodes.some(n => n.id === sourceId);
          const targetExists = nodes.some(n => n.id === targetId);
          
          if (sourceExists && targetExists) {
            links.push({
              source: sourceId,
              target: targetId,
              value: count,
              percentage: (count / totalJourneys) * 100,
            });
          }
        }
      });
    });

    // Group nodes by column
    const columns: FlowNode[][] = [];
    for (let i = 0; i < maxSteps; i++) {
      columns.push(nodes.filter(n => n.column === i).sort((a, b) => b.count - a.count));
    }

    return { nodes, links, columns, nodeColorMap };
  }, [journeys, maxSteps, minFlowSize]);

  const { nodes, links, columns, nodeColorMap } = flowData;

  // Calculate SVG dimensions and positions
  const svgWidth = 900;
  const svgHeight = Math.max(400, (columns as FlowNode[][]).reduce((max: number, col: FlowNode[]) => Math.max(max, col.length * 70), 0));
  const columnWidth = svgWidth / (columns.length || 1);
  const nodeWidth = 140;
  const nodeMinHeight = 30;
  const nodePadding = 10;

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; height: number }>();
    
    columns.forEach((column, colIndex) => {
      const totalCount = column.reduce((sum, n) => sum + n.count, 0);
      const availableHeight = svgHeight - 40;
      let currentY = 20;
      
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
  }, [columns, svgHeight, columnWidth]);

  // Generate path for links
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

  if (journeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Clientes</CardTitle>
          <CardDescription>Visualização do caminho dos clientes entre produtos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Nenhum dado de jornada disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const customersWithMultiplePurchases = journeys.filter(j => j.totalPurchases > 1).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Fluxo de Clientes
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Este gráfico mostra o caminho que os clientes percorrem entre produtos. A largura das linhas indica a quantidade de clientes que fizeram essa transição.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              {customersWithMultiplePurchases} clientes com múltiplas compras de {journeys.length} total
            </CardDescription>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Passos:</span>
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
              <span className="text-sm text-muted-foreground">Mín. clientes:</span>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Step Labels */}
        <div className="flex mb-4">
          {columns.map((_, index) => (
            <div 
              key={index} 
              className="flex-1 text-center text-sm font-medium text-muted-foreground"
            >
              {index === 0 ? 'Entrada' : `Compra ${index + 1}`}
            </div>
          ))}
        </div>

        {/* SVG Flow Chart */}
        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto">
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
                        <p className="font-medium">{link.value} clientes</p>
                        <p className="text-xs text-muted-foreground">{link.percentage.toFixed(1)}% do total</p>
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
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-medium mb-3">Produtos</p>
            <div className="flex flex-wrap gap-3">
              {Array.from(nodeColorMap.entries()).slice(0, 12).map(([product, color]) => (
                <div key={product} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {product.length > 25 ? product.substring(0, 25) + '...' : product}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total de Fluxos</p>
            <p className="text-lg font-bold">{links.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Produtos Únicos</p>
            <p className="text-lg font-bold">{nodeColorMap?.size || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Maior Fluxo</p>
            <p className="text-lg font-bold">
              {links.length > 0 ? Math.max(...links.map(l => l.value)) : 0} clientes
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Taxa Recompra</p>
            <p className="text-lg font-bold">
              {journeys.length > 0 
                ? ((customersWithMultiplePurchases / journeys.length) * 100).toFixed(1) 
                : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
