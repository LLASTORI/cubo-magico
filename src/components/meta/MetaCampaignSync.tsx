import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MetaCampaignSyncProps {
  projectId: string;
  accountIds: string[];
  onSyncComplete?: () => void;
}

export function MetaCampaignSync({ projectId, accountIds, onSyncComplete }: MetaCampaignSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ synced: number; total: number } | null>(null);

  const handleSync = async () => {
    if (accountIds.length === 0) {
      toast.error('Nenhuma conta de ads selecionada');
      return;
    }

    setSyncing(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_campaigns',
          projectId,
          accountIds,
        },
      });

      if (error) throw error;

      setLastResult({ synced: data.synced, total: data.total });
      toast.success(`${data.synced} campanhas sincronizadas`);
      onSyncComplete?.();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar campanhas');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing || accountIds.length === 0}
      >
        {syncing ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Target className="w-4 h-4 mr-2" />
        )}
        {syncing ? 'Sincronizando...' : 'Sincronizar Campanhas'}
      </Button>
      {lastResult && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{lastResult.synced} campanhas</span>
        </div>
      )}
    </div>
  );
}
