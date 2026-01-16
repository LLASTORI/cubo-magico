/**
 * OrderDetailDialog
 * 
 * Shows detailed financial breakdown of an order using ledger_events.
 * Ledger EXPLAINS the order but NEVER changes the canonical values.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Package, 
  User, 
  Calendar, 
  CreditCard,
  ArrowDown,
  ArrowUp,
  Info,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useOrdersCore, OrderRecord, LedgerBreakdown } from "@/hooks/useOrdersCore";

interface OrderDetailDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('pt-BR');
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

export function OrderDetailDialog({ orderId, open, onOpenChange }: OrderDetailDialogProps) {
  const { fetchOrderDetail } = useOrdersCore();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [breakdown, setBreakdown] = useState<LedgerBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      setLoading(true);
      fetchOrderDetail(orderId).then(({ order, breakdown }) => {
        setOrder(order);
        setBreakdown(breakdown);
        setLoading(false);
      });
    } else {
      setOrder(null);
      setBreakdown(null);
    }
  }, [open, orderId, fetchOrderDetail]);

  // Validate ledger breakdown matches order values
  const validateBreakdown = () => {
    if (!order || !breakdown) return null;
    
    const totalDeductions = breakdown.platform_fee + breakdown.coproducer + breakdown.affiliate;
    const calculatedNet = order.customer_paid - totalDeductions;
    const difference = Math.abs(calculatedNet - order.producer_net);
    
    return {
      matches: difference < 0.02, // Allow 2 cents tolerance for rounding
      calculatedNet,
      difference,
    };
  };

  const validation = validateBreakdown();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Detalhes do Pedido
          </DialogTitle>
          <DialogDescription>
            Breakdown financeiro completo baseado no Orders Core
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-lg font-semibold">{order.provider_order_id}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(order.ordered_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase">
                  {order.provider}
                </Badge>
                <Badge variant="outline" className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Cliente</span>
              </div>
              <p className="text-foreground">{order.buyer_name || '-'}</p>
              <p className="text-sm text-muted-foreground">{order.buyer_email || '-'}</p>
            </div>

            <Separator />

            {/* Products List */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Produtos ({order.products.length})</span>
              </div>
              <div className="space-y-2">
                {order.products.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.product_name || 'Produto sem nome'}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.offer_name || item.item_type}
                      </p>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.base_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Financial Breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Decomposição Financeira</span>
              </div>
              
              {/* What customer paid (GROSS) */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Cliente pagou
                    </span>
                  </div>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(order.customer_paid)}
                  </span>
                </div>
                <p className="text-xs text-green-600/70 mt-1">
                  Valor bruto do pedido (customer_paid)
                </p>
              </div>

              {/* Deductions from ledger */}
              {breakdown && (
                <div className="space-y-2 mb-4">
                  {breakdown.platform_fee > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Taxas Hotmart</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.platform_fee)}</span>
                    </div>
                  )}
                  {breakdown.coproducer > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Coprodução</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.coproducer)}</span>
                    </div>
                  )}
                  {breakdown.affiliate > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Afiliados</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.affiliate)}</span>
                    </div>
                  )}
                  {breakdown.tax > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Impostos</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.tax)}</span>
                    </div>
                  )}
                  {breakdown.refund > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Reembolso</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.refund)}</span>
                    </div>
                  )}
                  {breakdown.chargeback > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Chargeback</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.chargeback)}</span>
                    </div>
                  )}
                </div>
              )}

              <Separator className="my-2" />

              {/* What producer receives (NET) */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary">
                      Produtor recebe
                    </span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(order.producer_net)}
                  </span>
                </div>
                <p className="text-xs text-primary/70 mt-1">
                  Valor líquido do produtor (producer_net)
                </p>
              </div>

              {/* Validation indicator */}
              {validation && (
                <div className={`flex items-center gap-2 mt-3 p-2 rounded text-xs ${
                  validation.matches 
                    ? 'bg-green-500/10 text-green-600' 
                    : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {validation.matches ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Ledger valida: breakdown bate com producer_net</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        Diferença de {formatCurrency(validation.difference)} 
                        (calculado: {formatCurrency(validation.calculatedNet)})
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* UTM Attribution */}
            {(order.utm_source || order.utm_campaign) && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Atribuição</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {order.utm_source && (
                      <div>
                        <span className="text-muted-foreground">Source:</span>{' '}
                        <span>{order.utm_source}</span>
                      </div>
                    )}
                    {order.utm_campaign && (
                      <div>
                        <span className="text-muted-foreground">Campaign:</span>{' '}
                        <span className="truncate">{order.utm_campaign}</span>
                      </div>
                    )}
                    {order.utm_adset && (
                      <div>
                        <span className="text-muted-foreground">Adset:</span>{' '}
                        <span className="truncate">{order.utm_adset}</span>
                      </div>
                    )}
                    {order.utm_creative && (
                      <div>
                        <span className="text-muted-foreground">Creative:</span>{' '}
                        <span className="truncate">{order.utm_creative}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Data Source Badge */}
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center pt-2">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Fonte canônica: orders + order_items + ledger_events
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Pedido não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
