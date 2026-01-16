/**
 * SHADOW COMPONENT: CustomerJourneyOrders
 * 
 * REGRA CANÔNICA DE JORNADA:
 * - 1 pedido = 1 evento de jornada
 * - Order items são detalhes, não eventos
 * - Ledger não cria eventos de jornada
 * - CRM legacy é transitório
 * 
 * Este componente exibe a jornada canônica baseada em Orders Core.
 * DO NOT REMOVE LEGACY (CustomerJourneyAnalysis) YET.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ShoppingCart,
  Package,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  Users,
  DollarSign,
  Repeat,
} from 'lucide-react';
import { useCRMJourneyOrders, type JourneyOrderEvent } from '@/hooks/useCRMJourneyOrders';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface JourneyOrderCardProps {
  event: JourneyOrderEvent;
}

function JourneyOrderCard({ event }: JourneyOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { getProjectUrl } = useProjectNavigation();

  const getItemTypeBadge = (itemType: string) => {
    switch (itemType) {
      case 'main':
        return <Badge variant="default" className="text-xs">Principal</Badge>;
      case 'bump':
        return <Badge variant="secondary" className="text-xs">Bump</Badge>;
      case 'upsell':
        return <Badge variant="outline" className="text-xs">Upsell</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{itemType}</Badge>;
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      event.is_first_purchase && "border-primary/50 bg-primary/5"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  event.is_first_purchase ? "bg-primary/20" : "bg-muted"
                )}>
                  <ShoppingCart className={cn(
                    "h-4 w-4",
                    event.is_first_purchase ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {event.main_product_name || 'Pedido'}
                    {event.is_first_purchase && (
                      <Badge variant="default" className="text-xs">1ª Compra</Badge>
                    )}
                    {event.items_count > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {event.items_count} produtos
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {format(new Date(event.ordered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {event.main_funnel_name && (
                      <span className="ml-2 text-primary">• {event.main_funnel_name}</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(event.customer_paid)}</p>
                  <p className="text-xs text-muted-foreground">
                    Líquido: {formatCurrency(event.producer_net)}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Produtos do pedido */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Package className="h-3 w-3" />
                Produtos do Pedido
              </h4>
              <div className="space-y-2">
                {event.products.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {getItemTypeBadge(product.item_type)}
                      <span className="text-sm">{product.product_name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(product.base_price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Atribuição UTM */}
            {event.utm_source && (
              <div className="border-t pt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Origem</h4>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    source: {event.utm_source}
                  </Badge>
                  {event.utm_campaign && (
                    <Badge variant="outline" className="text-xs">
                      campaign: {event.utm_campaign}
                    </Badge>
                  )}
                  {event.utm_adset && (
                    <Badge variant="outline" className="text-xs">
                      adset: {event.utm_adset}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Link para contato - CORRIGIDO PROMPT 22: usar getProjectUrl */}
            {event.contact_id && (
              <div className="border-t pt-4 flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to={getProjectUrl(`/crm/contact/${event.contact_id}`)}>
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Ver Contato
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface CustomerJourneyOrdersProps {
  contactEmail?: string;
  maxHeight?: string;
}

export function CustomerJourneyOrders({ contactEmail, maxHeight = '600px' }: CustomerJourneyOrdersProps) {
  const { journeyEvents, summary, isLoading, error } = useCRMJourneyOrders(contactEmail);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Jornada do Cliente (Orders Core)
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Erro</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Jornada do Cliente
              <Badge variant="secondary" className="text-xs">Orders Core</Badge>
            </CardTitle>
            <CardDescription>
              {journeyEvents.length} pedido{journeyEvents.length !== 1 ? 's' : ''} na jornada
            </CardDescription>
          </div>
        </div>

        {/* Summary Cards - apenas se não estiver filtrando por contato */}
        {!contactEmail && journeyEvents.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <ShoppingCart className="h-3 w-3" />
                Pedidos
              </div>
              <p className="text-lg font-semibold mt-1">{summary.totalOrders}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Users className="h-3 w-3" />
                Clientes
              </div>
              <p className="text-lg font-semibold mt-1">{summary.totalCustomers}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <DollarSign className="h-3 w-3" />
                Receita Total
              </div>
              <p className="text-lg font-semibold mt-1">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Repeat className="h-3 w-3" />
                Ticket Médio
              </div>
              <p className="text-lg font-semibold mt-1">{formatCurrency(summary.avgOrderValue)}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {journeyEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum pedido encontrado.</p>
            <p className="text-xs mt-1">
              Os pedidos aparecerão aqui quando forem processados via Orders Core.
            </p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-3">
              {journeyEvents.map((event) => (
                <JourneyOrderCard key={event.order_id} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
