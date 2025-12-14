import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactTransactionsListProps {
  contactId: string;
}

interface Transaction {
  id: string;
  product_name: string;
  offer_name: string | null;
  status: string;
  total_price_brl: number | null;
  payment_method: string | null;
  transaction_date: string | null;
  platform: string;
}

const statusColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  COMPLETE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REFUNDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CHARGEBACK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  WAITING_PAYMENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  BILLET_PRINTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  STARTED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  UNDER_ANALYSIS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  OVERDUE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DISPUTE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  APPROVED: 'Aprovada',
  COMPLETE: 'Completa',
  REFUNDED: 'Reembolsada',
  CANCELLED: 'Cancelada',
  CHARGEBACK: 'Chargeback',
  PENDING: 'Pendente',
  WAITING_PAYMENT: 'Aguardando Pagamento',
  BILLET_PRINTED: 'Boleto Gerado',
  STARTED: 'Iniciada',
  UNDER_ANALYSIS: 'Em Análise',
  EXPIRED: 'Expirada',
  OVERDUE: 'Vencida',
  DISPUTE: 'Reclamada',
  BLOCKED: 'Bloqueada',
};

export function ContactTransactionsList({ contactId }: ContactTransactionsListProps) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['crm-contact-transactions', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_transactions')
        .select('id, product_name, offer_name, status, total_price_brl, payment_method, transaction_date, platform')
        .eq('contact_id', contactId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!contactId,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma transação registrada
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div 
          key={transaction.id} 
          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
        >
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">
                {transaction.product_name}
              </p>
              <Badge className={statusColors[transaction.status] || 'bg-gray-100 text-gray-800'}>
                {statusLabels[transaction.status] || transaction.status}
              </Badge>
            </div>
            {transaction.offer_name && (
              <p className="text-sm text-muted-foreground">{transaction.offer_name}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {transaction.payment_method || 'N/A'}
              </span>
              {transaction.transaction_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={`font-medium text-sm ${transaction.status === 'APPROVED' || transaction.status === 'COMPLETE' ? 'text-green-600' : ''}`}>
              {formatCurrency(transaction.total_price_brl)}
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              {transaction.platform}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
