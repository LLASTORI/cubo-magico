import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Package, Layers, Target, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { type GenericBreakdown } from '@/hooks/useCRMJourneyData';

interface CRMSummaryCardsProps {
  statusBreakdown: GenericBreakdown[];
  offerBreakdown: GenericBreakdown[];
  funnelBreakdown: GenericBreakdown[];
  positionBreakdown: GenericBreakdown[];
  productBreakdown: GenericBreakdown[];
  isLoading: boolean;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export function CRMSummaryCards({
  statusBreakdown,
  offerBreakdown,
  funnelBreakdown,
  positionBreakdown,
  productBreakdown,
  isLoading,
  selectedStatuses,
  onStatusToggle,
}: CRMSummaryCardsProps) {
  const [activeTab, setActiveTab] = useState('status');

  const renderBreakdownCards = (
    items: GenericBreakdown[],
    isClickable: boolean = false,
    selectedItems?: string[],
    onToggle?: (key: string) => void
  ) => {
    if (items.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
      );
    }

    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => {
          const isSelected = selectedItems?.includes(item.key);
          
          const CardWrapper = isClickable ? 'button' : 'div';
          
          return (
            <CardWrapper
              key={item.key}
              onClick={isClickable && onToggle ? () => onToggle(item.key) : undefined}
              className={cn(
                "flex flex-col items-start p-3 rounded-lg border transition-all text-left",
                isClickable && "hover:border-primary/50 cursor-pointer",
                isClickable && isSelected 
                  ? "bg-primary/10 border-primary" 
                  : "bg-muted/50 border-border"
              )}
            >
              <span className="text-sm font-medium truncate max-w-[200px]" title={item.label}>
                {item.label}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isClickable && isSelected ? "default" : "secondary"} className="text-xs">
                  {item.count.toLocaleString('pt-BR')} vendas
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.uniqueClients.toLocaleString('pt-BR')} clientes
                </span>
              </div>
            </CardWrapper>
          );
        })}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="flex flex-wrap gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-32" />
      ))}
    </div>
  );

  const tabs = [
    { id: 'status', label: 'Status', icon: Target, data: statusBreakdown, clickable: true },
    { id: 'funnel', label: 'Funis', icon: Layers, data: funnelBreakdown, clickable: false },
    { id: 'product', label: 'Produtos', icon: Package, data: productBreakdown, clickable: false },
    { id: 'offer', label: 'Ofertas', icon: ShoppingBag, data: offerBreakdown, clickable: false },
    { id: 'position', label: 'Posições', icon: Target, data: positionBreakdown, clickable: false },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Resumo Geral
        </CardTitle>
        <CardDescription>
          Visão geral de vendas e clientes únicos por categoria (antes dos filtros aplicados)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.data.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              {isLoading ? (
                <LoadingSkeleton />
              ) : (
                <>
                  {renderBreakdownCards(
                    tab.data,
                    tab.clickable,
                    tab.clickable ? selectedStatuses : undefined,
                    tab.clickable ? onStatusToggle : undefined
                  )}
                  {tab.clickable && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Clique nos status para adicionar/remover do filtro
                    </p>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
