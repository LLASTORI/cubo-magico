import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Package, Layers, Target, ShoppingBag, Globe, UserCheck, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { type GenericBreakdown } from '@/hooks/useCRMJourneyData';

interface CRMSummaryCardsProps {
  statusBreakdown: GenericBreakdown[];
  offerBreakdown: GenericBreakdown[];
  funnelBreakdown: GenericBreakdown[];
  positionBreakdown: GenericBreakdown[];
  productBreakdown: GenericBreakdown[];
  sourceBreakdown: GenericBreakdown[];
  contactStatusBreakdown: GenericBreakdown[];
  pageBreakdown: GenericBreakdown[];
  isLoading: boolean;
  selectedStatuses: string[];
  selectedSources: string[];
  selectedContactStatuses: string[];
  selectedPages: string[];
  onStatusToggle: (status: string) => void;
  onSourceToggle: (source: string) => void;
  onContactStatusToggle: (status: string) => void;
  onPageToggle: (page: string) => void;
  onProductClick?: (product: string) => void;
  onFunnelClick?: (funnelId: string) => void;
  onOfferClick?: (offerCode: string) => void;
  selectedProducts?: string[];
  selectedFunnels?: string[];
  selectedOffers?: string[];
}

export function CRMSummaryCards({
  statusBreakdown,
  offerBreakdown,
  funnelBreakdown,
  positionBreakdown,
  productBreakdown,
  sourceBreakdown,
  contactStatusBreakdown,
  pageBreakdown,
  isLoading,
  selectedStatuses,
  selectedSources,
  selectedContactStatuses,
  selectedPages,
  onStatusToggle,
  onSourceToggle,
  onContactStatusToggle,
  onPageToggle,
  onProductClick,
  onFunnelClick,
  onOfferClick,
  selectedProducts = [],
  selectedFunnels = [],
  selectedOffers = [],
}: CRMSummaryCardsProps) {
  const [activeTab, setActiveTab] = useState('contacts');

  const renderBreakdownCards = (
    items: GenericBreakdown[],
    isClickable: boolean = false,
    selectedItems?: string[],
    onToggle?: (key: string) => void,
    labelPrefix?: string
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
                  {item.count.toLocaleString('pt-BR')} {labelPrefix || 'itens'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.uniqueClients.toLocaleString('pt-BR')} contatos
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

  // Contact-level tabs
  const contactTabs = [
    { 
      id: 'contactStatus', 
      label: 'Status', 
      icon: UserCheck, 
      data: contactStatusBreakdown, 
      clickable: true,
      selected: selectedContactStatuses,
      onToggle: onContactStatusToggle,
      labelPrefix: 'contatos'
    },
    { 
      id: 'source', 
      label: 'Fonte', 
      icon: Globe, 
      data: sourceBreakdown, 
      clickable: true,
      selected: selectedSources,
      onToggle: onSourceToggle,
      labelPrefix: 'contatos'
    },
    { 
      id: 'page', 
      label: 'Página de Origem', 
      icon: FileText, 
      data: pageBreakdown, 
      clickable: true,
      selected: selectedPages,
      onToggle: onPageToggle,
      labelPrefix: 'contatos'
    },
  ];

  // Transaction-level tabs
  const transactionTabs = [
    { 
      id: 'status', 
      label: 'Status Pagamento', 
      icon: CreditCard, 
      data: statusBreakdown, 
      clickable: true,
      selected: selectedStatuses,
      onToggle: onStatusToggle,
      labelPrefix: 'vendas'
    },
    { 
      id: 'funnel', 
      label: 'Funis', 
      icon: Layers, 
      data: funnelBreakdown, 
      clickable: true,
      selected: selectedFunnels,
      onToggle: onFunnelClick,
      labelPrefix: 'vendas'
    },
    { 
      id: 'product', 
      label: 'Produtos', 
      icon: Package, 
      data: productBreakdown, 
      clickable: true,
      selected: selectedProducts,
      onToggle: onProductClick,
      labelPrefix: 'vendas'
    },
    { 
      id: 'offer', 
      label: 'Ofertas', 
      icon: ShoppingBag, 
      data: offerBreakdown, 
      clickable: true,
      selected: selectedOffers,
      onToggle: onOfferClick,
      labelPrefix: 'vendas'
    },
    { 
      id: 'position', 
      label: 'Posições', 
      icon: Target, 
      data: positionBreakdown, 
      clickable: false,
      labelPrefix: 'vendas'
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Resumo Geral
        </CardTitle>
        <CardDescription>
          Visão geral de contatos e transações. Clique nos cards para filtrar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contatos
              <Badge variant="secondary" className="ml-1 text-xs">
                {contactStatusBreakdown.reduce((acc, item) => acc + item.count, 0).toLocaleString('pt-BR')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Transações
              <Badge variant="secondary" className="ml-1 text-xs">
                {statusBreakdown.reduce((acc, item) => acc + item.count, 0).toLocaleString('pt-BR')}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Filtros baseados em dados do contato (aplicam-se a todos os leads, independente de ter transações).
            </p>
            {contactTabs.map((tab) => (
              <div key={tab.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {tab.data.length}
                  </Badge>
                </div>
                {isLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    {renderBreakdownCards(
                      tab.data,
                      tab.clickable,
                      tab.selected,
                      tab.onToggle,
                      tab.labelPrefix
                    )}
                    {tab.clickable && tab.data.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Clique nos cards para adicionar/remover do filtro
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="transactions" className="mt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Filtros baseados em transações (vendas). Leads sem transações não aparecerão se filtrar por status de pagamento.
            </p>
            {transactionTabs.map((tab) => (
              <div key={tab.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {tab.data.length}
                  </Badge>
                </div>
                {isLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    {renderBreakdownCards(
                      tab.data,
                      tab.clickable,
                      tab.selected,
                      tab.onToggle,
                      tab.labelPrefix
                    )}
                    {tab.clickable && tab.data.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Clique nos cards para adicionar/remover do filtro
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
