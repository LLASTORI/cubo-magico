/**
 * OrdersTable
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGRA CANÔNICA DE PEDIDO (OBRIGATÓRIA - NÃO NEGOCIÁVEL)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UM PEDIDO = TODOS OS PRODUTOS DO MESMO provider_order_id
 * 
 * Cada linha desta tabela = 1 pedido completo (NÃO 1 evento de transação)
 * 
 * A coluna "Produtos" mostra TODOS os items do pedido:
 * - Produto principal (main)
 * - Order bumps
 * - Upsells
 * - Downsells
 * - Combos
 * 
 * FORBIDDEN:
 * ❌ Using finance_ledger_summary
 * ❌ Showing ledger events as rows
 * ❌ Rendering products by isolated transaction_id
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Eye, Package, Signal, SignalZero, CreditCard } from "lucide-react";
import { OrderRecord } from "@/hooks/useOrdersCore";
import { OrderDetailDialog } from "@/components/OrderDetailDialog";
import { PaymentMethodBadge } from "@/components/PaymentMethodBadge";
import { formatMoney } from "@/utils/formatMoney";
import { getCountryFlag } from "@/utils/countryUtils";

interface OrdersTableProps {
  orders: OrderRecord[];
  utmFilterActive?: boolean;
  ordersWithoutUtmCount?: number;
}

// Helper to check if order has any UTM
const hasUtm = (order: OrderRecord): boolean => {
  return !!(order.utm_source || order.utm_campaign || order.utm_adset || order.utm_placement || order.utm_creative);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'complete':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'refunded':
    case 'cancelled':
    case 'chargeback':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'approved': 'Aprovado',
    'complete': 'Completo',
    'pending': 'Pendente',
    'refunded': 'Reembolsado',
    'cancelled': 'Cancelado',
    'chargeback': 'Chargeback',
  };
  return labels[status.toLowerCase()] || status;
};

export function OrdersTable({ orders, utmFilterActive, ordersWithoutUtmCount }: OrdersTableProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="border-border shadow-[var(--shadow-card)]">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">Pedidos</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dados do Orders Core</p>
                  <p className="text-xs text-muted-foreground">Cada linha = 1 pedido completo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* UTM Filter Warning - Task 1 */}
          {utmFilterActive && ordersWithoutUtmCount !== undefined && ordersWithoutUtmCount > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-sm">
              <SignalZero className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-700 dark:text-amber-400 font-medium">
                  Alguns pedidos não possuem UTM e foram ocultados pelo filtro.
                </p>
                <p className="text-amber-600/70 dark:text-amber-400/70 text-xs mt-0.5">
                  {ordersWithoutUtmCount} pedido{ordersWithoutUtmCount > 1 ? 's' : ''} sem UTM neste período
                </p>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Pedido</TableHead>
                  <TableHead className="text-muted-foreground">Plataforma</TableHead>
                  <TableHead className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      UTM
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Indica se o pedido possui parâmetros UTM</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Produtos
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Package className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Lista de produtos no pedido</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Produtor recebeu
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Valor creditado ao produtor conforme informado pelo provider</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Pagamento
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <CreditCard className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Método de pagamento e parcelas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewOrder(order.id)}
                  >
                    <TableCell className="font-mono text-sm text-foreground">
                      {order.provider_order_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {order.provider}
                      </Badge>
                    </TableCell>
                    {/* UTM Badge - Task 2 */}
                    <TableCell>
                      {hasUtm(order) ? (
                        <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          <Signal className="w-3 h-3" />
                          Com UTM
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 bg-muted text-muted-foreground">
                          <SignalZero className="w-3 h-3" />
                          Sem UTM
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground max-w-[150px] truncate" title={order.buyer_name || ''}>
                      {order.buyer_name || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-col gap-0.5">
                        {order.products.slice(0, 2).map((product, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs text-muted-foreground truncate"
                            title={product.product_name || ''}
                          >
                            {product.product_name || 'Sem nome'}
                          </span>
                        ))}
                        {order.products.length > 2 && (
                          <span className="text-xs text-primary">
                            +{order.products.length - 2} mais
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      <div className="flex items-center gap-1.5">
                        {order.currency && order.currency !== 'BRL' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm">{getCountryFlag(
                                  order.currency === 'MXN' ? 'MX' :
                                  order.currency === 'ARS' ? 'AR' :
                                  order.currency === 'CLP' ? 'CL' :
                                  order.currency === 'COP' ? 'CO' :
                                  order.currency === 'PEN' ? 'PE' :
                                  order.currency === 'USD' ? 'US' :
                                  order.currency === 'EUR' ? 'EU' :
                                  null
                                )}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Pedido em moeda estrangeira convertido para BRL</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <span>{formatMoney(order.producer_net_brl ?? order.producer_net, 'BRL')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    {/* Payment Method (PROMPT 2) */}
                    <TableCell>
                      <PaymentMethodBadge 
                        paymentMethod={order.payment_method} 
                        installments={order.installments}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.ordered_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOrder(order.id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <OrderDetailDialog
        orderId={selectedOrderId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
