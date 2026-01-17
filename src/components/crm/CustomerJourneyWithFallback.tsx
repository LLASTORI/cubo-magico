/**
 * PROMPT 29: Jornada do Cliente com Fallback Silencioso
 * 
 * Hierarquia: Clientes → Pedidos → Produtos
 * Fallback: Orders Core → crm_transactions (automático)
 * 
 * Nenhum texto de "legado" ou "quando for processado".
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
import { useCRMJourneyFallback, type JourneyCustomer, type JourneyOrder } from '@/hooks/useCRMJourneyFallback';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface OrderCardProps {
  order: JourneyOrder;
}

function OrderCard({ order }: OrderCardProps) {
  return (
    <div className={cn(
      "border rounded-lg p-3",
      order.isFirstPurchase && "border-primary/50 bg-primary/5"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-1.5 rounded-full",
            order.isFirstPurchase ? "bg-primary/20" : "bg-muted"
          )}>
            <ShoppingCart className={cn(
              "h-3 w-3",
              order.isFirstPurchase ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              {order.productName}
              {order.isFirstPurchase && (
                <Badge variant="default" className="text-xs">1ª Compra</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(order.orderedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {order.offerName && (
                <span className="ml-2">• {order.offerName}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">{formatCurrency(order.totalPrice)}</p>
          {order.utmSource && (
            <Badge variant="outline" className="text-xs mt-1">
              {order.utmSource}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

interface CustomerCardProps {
  customer: JourneyCustomer;
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
                    {customer.name || 'Cliente'}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </CardDescription>
                  {customer.products.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {customer.products.slice(0, 3).map((product, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {product.length > 20 ? product.substring(0, 20) + '...' : product}
                        </Badge>
                      ))}
                      {customer.products.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{customer.products.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.orderCount} compra{customer.orderCount !== 1 ? 's' : ''}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2 mb-3">
              {customer.orders.map((order) => (
                <OrderCard key={order.orderId} order={order} />
              ))}
            </div>

            {customer.contactId && (
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link to={getProjectUrl(`/crm/contact/${customer.contactId}`)}>
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Ver Perfil
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

interface CustomerJourneyWithFallbackProps {
  maxHeight?: string;
}

export function CustomerJourneyWithFallback({ maxHeight = '600px' }: CustomerJourneyWithFallbackProps) {
  const { customers, summary, isLoading } = useCRMJourneyFallback();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.email.toLowerCase().includes(term) ||
      (customer.name && customer.name.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Jornada do Cliente
          </CardTitle>
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

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Jornada do Cliente
            </CardTitle>
            <CardDescription>
              {summary.totalCustomers} cliente{summary.totalCustomers !== 1 ? 's' : ''} • {summary.totalOrders} compra{summary.totalOrders !== 1 ? 's' : ''}
            </CardDescription>
          </div>

          {customers.length > 0 && (
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

        {summary.totalOrders > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <ShoppingCart className="h-3 w-3" />
                Compras
              </div>
              <p className="text-lg font-semibold mt-1">{summary.totalOrders.toLocaleString('pt-BR')}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Users className="h-3 w-3" />
                Clientes
              </div>
              <p className="text-lg font-semibold mt-1">{summary.totalCustomers.toLocaleString('pt-BR')}</p>
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
        {customers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma compra encontrada.</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
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
