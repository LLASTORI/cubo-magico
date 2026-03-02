import { useState, useEffect, useMemo } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] = useState<MetaAdAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchSavedAccounts = async () => {
    const { data } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
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

  const filteredSavedAccounts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return savedAccounts;

    return savedAccounts.filter((account) => {
      const accountName = account.account_name?.toLowerCase() || '';
      const accountId = account.account_id?.toLowerCase() || '';

      return accountName.includes(term) || accountId.includes(term);
    });
  }, [savedAccounts, searchTerm]);

  const handleDisconnectAccount = async (account: MetaAdAccount) => {
    setDisconnectingId(account.id);
    try {
      const { error } = await supabase
        .from('meta_ad_accounts')
        .update({ is_active: false })
        .eq('id', account.id)
        .eq('project_id', projectId);

      if (error) throw error;

      setSavedAccounts((prev) => prev.filter((saved) => saved.id !== account.id));
      setAccountToDisconnect(null);
      onAccountsChange?.();

      toast({
        title: 'Conta desconectada',
        description: 'A conta foi desativada com sucesso e permanece registrada.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDisconnectingId(null);
    }
  };

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
          <div className="mb-3">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome ou ID da conta"
            />
          </div>

          {savedAccounts.length === 0 && <p>Nenhuma conta vinculada</p>}
          {savedAccounts.length > 0 && filteredSavedAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma conta encontrada para a busca.</p>
          )}

          {filteredSavedAccounts.map(acc => (
            <div key={acc.id} className="flex justify-between p-2 border-b">
              <div>
                <span>{acc.account_name || 'Sem nome'}</span>
                <p className="text-xs text-muted-foreground font-mono">{acc.account_id}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge>{acc.currency}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setAccountToDisconnect(acc)}
                  disabled={disconnectingId === acc.id}
                >
                  {disconnectingId === acc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Desconectar
                    </>
                  )}
                </Button>
              </div>
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

      <AlertDialog
        open={!!accountToDisconnect}
        onOpenChange={(isOpen) => {
          if (!isOpen) setAccountToDisconnect(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apenas desativa a conta no projeto. O registro continuará salvo no banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!disconnectingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!accountToDisconnect || !!disconnectingId}
              onClick={(event) => {
                event.preventDefault();
                if (accountToDisconnect) {
                  handleDisconnectAccount(accountToDisconnect);
                }
              }}
            >
              {disconnectingId ? 'Desconectando...' : 'Desconectar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
