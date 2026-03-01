import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, RefreshCw, Trash2, Building2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MetaAdAccount {
  id: string;
  account_id: string;
  account_name: string | null;
  currency: string | null;
  timezone: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface AvailableAccount {
  id: string;
  name: string;
  currency: string;
}

interface Props {
  projectId: string;
  onAccountsChange?: () => void;
}

export function MetaAccountsManager({ projectId, onAccountsChange }: Props) {
  const [savedAccounts, setSavedAccounts] = useState<MetaAdAccount[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchSavedAccounts = async () => {
    const { data } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('project_id', projectId)
      .order('account_name');

    setSavedAccounts(data || []);
    setLoading(false);
  };

  const fetchAvailableAccounts = async () => {
    setFetching(true);
    const { data } = await supabase.functions.invoke('meta-api', {
      body: { action: 'get_ad_accounts', projectId },
    });
    setAvailableAccounts(data?.accounts || []);
    setFetching(false);
  };

  useEffect(() => {
    fetchSavedAccounts();
  }, [projectId]);

  const handleAddAccount = async (account: AvailableAccount) => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke(
        'meta-save-accounts',
        {
          body: { projectId, accounts: [account] }
        }
      );
      if (error) throw error;

      toast({ title: 'Conta adicionada', description: 'Conta salva com sucesso.' });

      await fetchSavedAccounts();
      onAccountsChange?.();

    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const newAccounts = availableAccounts.filter(
    a => !savedAccounts.some(s => s.account_id === a.id)
  );

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">

      <Button onClick={fetchAvailableAccounts} disabled={fetching}>
        {fetching ? 'Buscando...' : 'Buscar contas'}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Contas do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {savedAccounts.length === 0 && <p>Nenhuma conta vinculada</p>}
          {savedAccounts.map(acc => (
            <div key={acc.id} className="flex justify-between p-2 border-b">
              <span>{acc.account_name}</span>
              <Badge>{acc.currency}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {newAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contas disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {newAccounts.map(acc => (
              <div key={acc.id} className="flex justify-between p-2 border-b">
                <span>{acc.name}</span>
                <Button size="sm" onClick={() => handleAddAccount(acc)} disabled={syncing}>
                  {syncing ? '...' : 'Adicionar'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}