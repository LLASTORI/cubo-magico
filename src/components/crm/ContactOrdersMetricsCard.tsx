/**
 * REGRA CANÔNICA DE LTV
 * - LTV é calculado por pedido, não por item/transação
 * - Orders Core é a única fonte válida
 * - CRM legado é transitório
 * 
 * Este componente exibe métricas CANÔNICAS baseadas em pedidos,
 * rodando em paralelo com as métricas legadas.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ShoppingBag, 
  TrendingUp, 
  Repeat, 
  Calendar,
  Info,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCRMContactOrdersMetrics } from '@/hooks/useCRMContactOrdersMetrics';

interface ContactOrdersMetricsCardProps {
  contactId: string;
}

export function ContactOrdersMetricsCard({ contactId }: ContactOrdersMetricsCardProps) {
  const {
    metrics,
    isLoading,
    ordersCount,
    totalCustomerPaid,
    avgTicket,
    isRepeatCustomer,
    firstOrderAt,
    lastOrderAt,
    daysSinceLastOrder,
  } = useCRMContactOrdersMetrics(contactId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-600" />
            <span>Métricas por Pedido</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
              beta
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  // Se não há métricas, não exibe o card
  if (!metrics || ordersCount === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-600" />
            <span>Métricas por Pedido</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
              beta
            </Badge>
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[250px]">
                <p className="text-xs">
                  <strong>Baseado em pedidos</strong>, não em transações.
                  Um pedido com 3 produtos = 1 evento de compra.
                  Esta é a fonte canônica (Orders Core).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* LTV Canônico */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">LTV (Pedidos):</span>
          </div>
          <span className="font-semibold text-green-600 text-lg">
            {formatCurrency(totalCustomerPaid)}
          </span>
        </div>

        {/* Número de Pedidos */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Nº de pedidos:</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{ordersCount}</span>
            {isRepeatCustomer && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                <Repeat className="h-3 w-3 mr-1" />
                Recorrente
              </Badge>
            )}
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ticket médio:</span>
          <span className="font-medium">{formatCurrency(avgTicket)}</span>
        </div>

        <Separator className="my-2" />

        {/* Datas */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Primeiro pedido:
          </span>
          <span>{formatDate(firstOrderAt)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Último pedido:
          </span>
          <span>{formatDate(lastOrderAt)}</span>
        </div>

        {daysSinceLastOrder !== null && daysSinceLastOrder > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dias desde última compra:</span>
            <Badge 
              variant="outline" 
              className={
                daysSinceLastOrder > 90 
                  ? 'border-red-300 text-red-700 bg-red-50' 
                  : daysSinceLastOrder > 30 
                    ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                    : 'border-green-300 text-green-700 bg-green-50'
              }
            >
              {daysSinceLastOrder} dias
            </Badge>
          </div>
        )}

        {/* Footer explicativo */}
        <div className="pt-2 mt-2 border-t border-blue-200">
          <p className="text-xs text-blue-600/80 text-center">
            Baseado em pedidos · não em transações
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
