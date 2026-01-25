import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Webhook } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HotmartWebhookStatusProps {
  projectId: string;
}

export function HotmartWebhookStatus({ projectId }: HotmartWebhookStatusProps) {
  // Query last webhook event received
  const { data: lastEvent, isLoading } = useQuery({
    queryKey: ['hotmart_last_webhook_event', projectId],
    queryFn: async () => {
      // Check provider_event_log for last Hotmart event
      const { data, error } = await supabase
        .from('provider_event_log')
        .select('received_at, status')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching webhook status:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!projectId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const hasReceivedEvents = !!lastEvent;
  
  // Consider webhook "active" if we received an event in the last 7 days
  const isRecentlyActive = lastEvent?.received_at 
    ? new Date(lastEvent.received_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : false;

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border bg-card animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3" />
      </div>
    );
  }

  // Critical: No webhook events ever received
  if (!hasReceivedEvents) {
    return (
      <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
        <XCircle className="h-5 w-5" />
        <AlertTitle className="flex items-center gap-2">
          ⚠️ ALERTA CRÍTICO: Webhook não configurado
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="font-medium">
            Sem webhook, o Cubo NÃO recebe dados financeiros corretos, não gera ledger e não garante conciliação.
          </p>
          <p className="text-sm opacity-80">
            Configure o webhook na Hotmart para receber vendas em tempo real. 
            A API não substitui o webhook para dados financeiros.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Warning: Webhook configured but no recent events
  if (!isRecentlyActive) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          Webhook inativo há mais de 7 dias
        </AlertTitle>
        <AlertDescription className="mt-2 text-yellow-700/80 dark:text-yellow-400/80">
          <p>
            Último evento recebido: {formatDistanceToNow(new Date(lastEvent.received_at!), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
          <p className="text-sm mt-1">
            Verifique se o webhook ainda está ativo no painel da Hotmart.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Operational: Webhook active and receiving events
  return (
    <Alert className="border-green-500/50 bg-green-500/10">
      <CheckCircle className="h-5 w-5 text-green-600" />
      <AlertTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
        <Webhook className="h-4 w-4" />
        Financeiro Operacional
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 ml-2">
          Ativo
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 text-green-700/80 dark:text-green-400/80">
        <p>
          Último evento: {formatDistanceToNow(new Date(lastEvent.received_at!), { 
            addSuffix: true, 
            locale: ptBR 
          })} (status: {lastEvent.status})
        </p>
      </AlertDescription>
    </Alert>
  );
}
