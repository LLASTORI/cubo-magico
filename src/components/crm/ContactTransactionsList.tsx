import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, CreditCard, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * 🚫 LEGACY TABLES FORBIDDEN
 * This component uses ONLY Orders Core views:
 * - crm_orders_view
 * - crm_order_items_view
 * 
 * DO NOT USE: crm_transactions, hotmart_sales, crm_contacts.total_revenue
 */

interface ContactTransactionsListProps {
  contactEmail: string;
  projectId: string;
}

interface Order {
  order_id: string;
  provider_order_id: string;
  ordered_at: string | null;
  approved_at: string | null;
  status: string;
  customer_paid: number;
  producer_net: number;
  item_count: number;
  has_bump: boolean;
  funnel_name: string | null;
}

interface OrderItem {
  item_id: string;
  order_id: string;
  item_type: string;
  product_name: string;
  base_price: number;
}

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  chargeback: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  abandoned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusLabels: Record<string, string> = {
  approved: 'Aprovada',
  completed: 'Completa',
  refunded: 'Reembolsada',
  cancelled: 'Cancelada',
  chargeback: 'Chargeback',
  pending: 'Pendente',
  abandoned: 'Abandonada',
  expired: 'Expirada',
};

const itemTypeLabels: Record<string, string> = {
  main: 'Principal',
  bump: 'Order Bump',
  upsell: 'Upsell',
  downsell: 'Downsell',
  addon: 'Addon',
};

export function ContactTransactionsList({ contactEmail, projectId }: ContactTransactionsListProps) {
  // Fetch orders from crm_orders_view
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['crm-orders-core', contactEmail, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_orders_view')
        .select('order_id, provider_order_id, ordered_at, approved_at, status, customer_paid, producer_net, item_count, has_bump, funnel_name')
        .eq('project_id', projectId)
        .ilike('buyer_email', contactEmail)
        .order('ordered_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!contactEmail && !!projectId,
  });

  // Fetch order items from crm_order_items_view
  const { data: allItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['crm-order-items-core', contactEmail, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_order_items_view')
        .select('item_id, order_id, item_type, product_name, base_price')
        .eq('project_id', projectId)
        .ilike('buyer_email', contactEmail);

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!contactEmail && !!projectId,
  });

  // Group items by order_id
  const itemsByOrder = allItems.reduce((acc, item) => {
    if (!acc[item.order_id]) {
      acc[item.order_id] = [];
    }
    acc[item.order_id].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const isLoading = ordersLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma transação registrada
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const items = itemsByOrder[order.order_id] || [];
        const status = order.status.toLowerCase();
        
        return (
          <div 
            key={order.order_id} 
            className="rounded-lg border bg-card overflow-hidden"
          >
            {/* Order Header */}
            <div className="flex items-start gap-3 p-3 border-b bg-muted/30">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">
                    Pedido #{order.provider_order_id}
                  </p>
                  <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
                    {statusLabels[status] || order.status}
                  </Badge>
                  {order.has_bump && (
                    <Badge variant="outline" className="text-xs">
                      +bumps
                    </Badge>
                  )}
                </div>
                {order.funnel_name && (
                  <p className="text-xs text-primary mt-0.5">{order.funnel_name}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {order.ordered_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(order.ordered_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="space-y-0.5">
                  <p className={`font-semibold text-sm ${status === 'approved' || status === 'completed' ? 'text-green-600' : ''}`}>
                    {formatCurrency(order.customer_paid)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Líquido: {formatCurrency(order.producer_net)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Order Items */}
            {items.length > 0 && (
              <div className="p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {items.length} {items.length === 1 ? 'produto' : 'produtos'}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item.item_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {itemTypeLabels[item.item_type] || item.item_type}
                        </Badge>
                        <span className="truncate">{item.product_name}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {formatCurrency(item.base_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
