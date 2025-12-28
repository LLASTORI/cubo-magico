import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useMetaAudiences, MetaAdAudience, MetaAudienceSyncLog } from '@/hooks/useMetaAudiences';

interface MetaAudienceSyncLogsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: MetaAdAudience;
  projectId: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
  success: { label: 'Sucesso', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  partial: { label: 'Parcial', variant: 'secondary', icon: <AlertCircle className="h-3 w-3" /> },
  failed: { label: 'Falha', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
};

export function MetaAudienceSyncLogs({
  open,
  onOpenChange,
  audience,
  projectId,
}: MetaAudienceSyncLogsProps) {
  const { useSyncLogs } = useMetaAudiences(projectId);
  const { data: logs, isLoading } = useSyncLogs(audience.id);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Sincronização
          </DialogTitle>
          <DialogDescription>
            Últimas 20 sincronizações do público "{audience.name}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs && logs.length > 0 ? (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {logs.map((log: MetaAudienceSyncLog) => {
                const status = statusConfig[log.status] || statusConfig.success;
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant} className="gap-1">
                          {status.icon}
                          {status.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          +{log.contacts_added} adicionados
                        </span>
                        <span className="text-red-600">
                          -{log.contacts_removed} removidos
                        </span>
                        <span className="text-muted-foreground">
                          Total: {log.contacts_total}
                        </span>
                      </div>

                      {log.errors && (log.errors as any[]).length > 0 && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                          {(log.errors as any[]).map((err: any, i: number) => (
                            <div key={i}>
                              {err.message || JSON.stringify(err)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <span>Duração: {formatDuration(log.duration_ms)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma sincronização realizada ainda</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
