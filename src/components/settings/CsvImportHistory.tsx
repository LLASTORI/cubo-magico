// src/components/settings/CsvImportHistory.tsx

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatMoney } from '@/utils/formatMoney';
import { History, Loader2 } from 'lucide-react';

interface CsvBatch {
  id: string;
  file_name: string | null;
  status: 'importing' | 'active' | 'reverted';
  total_created: number;
  total_complemented: number;
  total_skipped: number;
  total_errors: number;
  total_revenue_brl: number;
  created_at: string;
  reverted_at: string | null;
}

interface Props {
  projectId: string;
}

export function CsvImportHistory({ projectId }: Props) {
  const { userRole } = useProjectMembers(projectId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [revertTarget, setRevertTarget] = useState<CsvBatch | null>(null);
  const [reverting, setReverting] = useState(false);

  const canRevert = userRole === 'owner' || userRole === 'manager';

  const { data: batches, isLoading } = useQuery({
    queryKey: ['csv-import-batches', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_import_batches')
        .select('id, file_name, status, total_created, total_complemented, total_skipped, total_errors, total_revenue_brl, created_at, reverted_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CsvBatch[];
    },
    enabled: !!projectId,
  });

  async function handleRevert() {
    if (!revertTarget) return;
    setReverting(true);

    try {
      const { error } = await supabase.functions.invoke('provider-csv-import-revert', {
        body: { batch_id: revertTarget.id, project_id: projectId },
      });

      if (error) throw error;

      toast({
        title: 'Importação revertida',
        description: `Os dados do import "${revertTarget.file_name ?? revertTarget.id}" foram removidos.`,
      });

      queryClient.invalidateQueries({ queryKey: ['csv-import-batches', projectId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao reverter', description: msg, variant: 'destructive' });
    } finally {
      setReverting(false);
      setRevertTarget(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
        <History className="h-4 w-4" />
        Nenhuma importação realizada ainda.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {batches.map((batch) => (
          <div key={batch.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{batch.file_name ?? 'Arquivo desconhecido'}</span>
                {batch.status === 'importing' && (
                  <Badge variant="outline" className="text-muted-foreground">Incompleto</Badge>
                )}
                {batch.status === 'active' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                )}
                {batch.status === 'reverted' && (
                  <Badge variant="outline" className="text-muted-foreground">Revertido</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(batch.created_at).toLocaleString('pt-BR')}
                {batch.status === 'reverted' && batch.reverted_at && (
                  <> · Revertido em {new Date(batch.reverted_at).toLocaleString('pt-BR')}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {batch.total_created} criados · {batch.total_complemented} complementados · {batch.total_skipped} ignorados
                {batch.total_errors > 0 && ` · ${batch.total_errors} erros`}
                {batch.total_revenue_brl > 0 && ` · ${formatMoney(batch.total_revenue_brl, 'BRL')}`}
              </p>
            </div>

            {batch.status === 'active' && canRevert && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setRevertTarget(batch)}
              >
                Desfazer
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Dialog de confirmação de revert */}
      <AlertDialog open={!!revertTarget} onOpenChange={(open) => !open && setRevertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Isso irá remover todos os pedidos e dados financeiros importados pelo arquivo:
                </p>
                <p className="font-medium text-foreground">
                  {revertTarget?.file_name ?? revertTarget?.id}
                </p>
                <p className="text-sm">
                  <strong>{revertTarget?.total_created}</strong> pedidos criados e seus ledger_events serão deletados.
                  Pedidos que existiam antes do import (via webhook) não serão afetados.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contatos CRM criados durante o import não são revertidos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevert}
              disabled={reverting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Desfazer importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
