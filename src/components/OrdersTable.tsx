/**
 * OrdersTable
 * 
 * Canonical table for displaying orders from Orders Core.
 * Each row = 1 order (NOT 1 transaction event)
 * 
 * FORBIDDEN:
 * ❌ Using finance_ledger_summary
 * ❌ Showing ledger events as rows
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
import { Info, Eye, Package } from "lucide-react";
import { OrderRecord } from "@/hooks/useOrdersCore";
import { OrderDetailDialog } from "@/components/OrderDetailDialog";

interface OrdersTableProps {
  orders: OrderRecord[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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

export function OrdersTable({ orders }: OrdersTableProps) {
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Pedido</TableHead>
                  <TableHead className="text-muted-foreground">Plataforma</TableHead>
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
                      Valor Bruto
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>customer_paid</p>
                            <p className="text-xs text-muted-foreground">O que o cliente pagou</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Valor Líquido
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>producer_net</p>
                            <p className="text-xs text-muted-foreground">O que o produtor recebe</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
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
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(order.customer_paid)}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(order.producer_net)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
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
