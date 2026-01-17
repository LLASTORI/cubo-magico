/**
 * CANONICAL COMPONENT: CustomerJourneyOrders
 * 
 * PROMPT 27: Reestruturação UX
 * 
 * REGRA CANÔNICA DE JORNADA:
 * - 1 pedido = 1 evento de jornada
 * - Hierarquia: Clientes → Pedidos → Produtos
 * - Busca por nome/email implementada
 * - Scroll corrigido
 * 
 * Este componente exibe a jornada canônica baseada em Orders Core.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Users,
  DollarSign,
  Repeat,
  Search,
  User,
  Mail,
} from 'lucide-react';
import { useCRMJourneyOrders, type JourneyOrderEvent } from '@/hooks/useCRMJourneyOrders';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Agrupa eventos por cliente (email)
interface CustomerGroup {
  email: string;
  name: string | null;
  contactId: string | null;
  orders: JourneyOrderEvent[];
  totalSpent: number;
  orderCount: number;
  firstOrderAt: string;
  lastOrderAt: string;
}

interface JourneyOrderCardProps {
  event: JourneyOrderEvent;
  compact?: boolean;
}

function JourneyOrderCard({ event, compact = false }: JourneyOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);

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
    <div className={cn(
      "border rounded-lg transition-all duration-200",
      event.is_first_purchase && "border-primary/50 bg-primary/5"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/50 transition-colors p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-full",
                event.is_first_purchase ? "bg-primary/20" : "bg-muted"
              )}>
                <ShoppingCart className={cn(
                  "h-3 w-3",
                  event.is_first_purchase ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {event.main_product_name || 'Pedido'}
                  {event.is_first_purchase && (
                    <Badge variant="default" className="text-xs">1ª Compra</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(event.ordered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {event.items_count > 1 && (
                    <span className="ml-2">• {event.items_count} produtos</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-sm">{formatCurrency(event.customer_paid)}</p>
                {!compact && (
                  <p className="text-xs text-muted-foreground">
                    Líquido: {formatCurrency(event.producer_net)}
                  </p>
                )}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t">
            {/* Produtos do pedido */}
            <div className="pt-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Package className="h-3 w-3" />
                Produtos do Pedido
              </h4>
              <div className="space-y-1.5">
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
              <div className="pt-2">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Origem</h4>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    source: {event.utm_source}
                  </Badge>
                  {event.utm_campaign && (
                    <Badge variant="outline" className="text-xs">
                      campaign: {event.utm_campaign}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface CustomerCardProps {
  customer: CustomerGroup;
}

function CustomerCard({ customer }: CustomerCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { getProjectUrl } = useProjectNavigation();

  return (
    <Card className="mb-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {customer.name || 'Cliente sem nome'}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.orderCount} pedido{customer.orderCount !== 1 ? 's' : ''}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Pedidos do cliente */}
            <div className="space-y-2 mb-3">
              {customer.orders.map((order) => (
                <JourneyOrderCard key={order.order_id} event={order} compact />
              ))}
            </div>

            {/* Link para contato */}
            {customer.contactId && (
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link to={getProjectUrl(`/crm/contact/${customer.contactId}`)}>
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Ver Perfil Completo
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
  const [searchTerm, setSearchTerm] = useState('');

  // Agrupa eventos por cliente
  const customerGroups = useMemo((): CustomerGroup[] => {
    const groups = new Map<string, CustomerGroup>();

    journeyEvents.forEach(event => {
      const email = event.contact_email;
      if (!groups.has(email)) {
        groups.set(email, {
          email,
          name: event.contact_name,
          contactId: event.contact_id,
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          firstOrderAt: event.ordered_at,
          lastOrderAt: event.ordered_at,
        });
      }
      const group = groups.get(email)!;
      group.orders.push(event);
      group.totalSpent += event.customer_paid;
      group.orderCount++;
      if (event.ordered_at < group.firstOrderAt) group.firstOrderAt = event.ordered_at;
      if (event.ordered_at > group.lastOrderAt) group.lastOrderAt = event.ordered_at;
    });

    // Ordena por total gasto (maior primeiro)
    return Array.from(groups.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [journeyEvents]);

  // Filtra por busca
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customerGroups;
    
    const term = searchTerm.toLowerCase();
    return customerGroups.filter(customer => 
      customer.email.toLowerCase().includes(term) ||
      (customer.name && customer.name.toLowerCase().includes(term))
    );
  }, [customerGroups, searchTerm]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Jornada do Cliente
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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Jornada do Cliente
              <Badge variant="secondary" className="text-xs">Orders Core</Badge>
            </CardTitle>
            <CardDescription>
              {customerGroups.length} cliente{customerGroups.length !== 1 ? 's' : ''} • {journeyEvents.length} pedido{journeyEvents.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>

          {/* PROMPT 27: Busca por nome/email */}
          {!contactEmail && customerGroups.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
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

      <CardContent className="pt-0">
        {customerGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum pedido encontrado.</p>
            <p className="text-xs mt-1">
              Os pedidos aparecerão aqui quando forem processados via Orders Core.
            </p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum cliente encontrado.</p>
            <p className="text-xs mt-1">
              Tente buscar por outro nome ou email.
            </p>
          </div>
        ) : (
          /* PROMPT 27: ScrollArea com overflow corrigido */
          <ScrollArea style={{ height: maxHeight }} className="pr-2">
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <CustomerCard key={customer.email} customer={customer} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
