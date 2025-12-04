import { useState, useEffect } from 'react';
import { Check, Loader2, RefreshCw, Trash2, Building2 } from 'lucide-react';
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
  timezone_name: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface AvailableAccount {
  id: string;
  name: string;
  currency: string;
  business_name?: string;
}

interface MetaAccountsManagerProps {
  projectId: string;
  onAccountsChange?: () => void;
}

export function MetaAccountsManager({ projectId, onAccountsChange }: MetaAccountsManagerProps) {
  const [savedAccounts, setSavedAccounts] = useState<MetaAdAccount[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<MetaAdAccount | null>(null);
  const { toast } = useToast();

  const fetchSavedAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('project_id', projectId)
        .order('account_name');

      if (error) throw error;
      setSavedAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching saved accounts:', error);
      toast({
        title: 'Erro ao carregar contas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAccounts = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'get_ad_accounts',
          projectId,
        },
      });

      if (error) throw error;
      
      if (data?.accounts) {
        setAvailableAccounts(data.accounts);
      }
    } catch (error: any) {
      console.error('Error fetching available accounts:', error);
      toast({
        title: 'Erro ao buscar contas do Meta',
        description: error.message || 'Verifique se o Meta está conectado.',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    // Reset state when project changes
    setSavedAccounts([]);
    setAvailableAccounts([]);
    setLoading(true);
    fetchSavedAccounts();
  }, [projectId]);

  const handleToggleActive = async (account: MetaAdAccount) => {
    try {
      const { error } = await supabase
        .from('meta_ad_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id);

      if (error) throw error;

      setSavedAccounts(prev =>
        prev.map(a => a.id === account.id ? { ...a, is_active: !a.is_active } : a)
      );

      toast({
        title: account.is_active ? 'Conta desativada' : 'Conta ativada',
        description: `${account.account_name || account.account_id} foi ${account.is_active ? 'desativada' : 'ativada'}.`,
      });

      onAccountsChange?.();
    } catch (error: any) {
      console.error('Error toggling account:', error);
      toast({
        title: 'Erro ao atualizar conta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddAccount = async (account: AvailableAccount) => {
    // Check if already exists
    if (savedAccounts.some(a => a.account_id === account.id)) {
      toast({
        title: 'Conta já adicionada',
        description: 'Esta conta já está vinculada ao projeto.',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      const { error } = await supabase
        .from('meta_ad_accounts')
        .insert({
          project_id: projectId,
          account_id: account.id,
          account_name: account.name,
          currency: account.currency,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Conta adicionada!',
        description: `${account.name} foi vinculada ao projeto.`,
      });

      fetchSavedAccounts();
      onAccountsChange?.();
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast({
        title: 'Erro ao adicionar conta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteClick = (account: MetaAdAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      // First remove from funnel associations
      await supabase
        .from('funnel_meta_accounts')
        .delete()
        .eq('meta_account_id', accountToDelete.id);

      // Then delete the account
      const { error } = await supabase
        .from('meta_ad_accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;

      toast({
        title: 'Conta removida',
        description: `${accountToDelete.account_name || accountToDelete.account_id} foi removida do projeto.`,
      });

      fetchSavedAccounts();
      onAccountsChange?.();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Erro ao remover conta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  // Filter available accounts to show only those not yet added
  const newAccounts = availableAccounts.filter(
    a => !savedAccounts.some(s => s.account_id === a.id)
  );

  const activeCount = savedAccounts.filter(a => a.is_active).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Contas de Anúncio do Projeto</CardTitle>
              <CardDescription>
                {savedAccounts.length} conta(s) vinculada(s) • {activeCount} ativa(s)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAvailableAccounts}
              disabled={fetching}
            >
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Buscar Novas</span>
            </Button>
          </div>
        </CardHeader>

        {savedAccounts.length > 0 && (
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead className="text-center">Ativa</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.account_name || 'Sem nome'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {account.account_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.currency || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={account.is_active ?? false}
                        onCheckedChange={() => handleToggleActive(account)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(account)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}

        {savedAccounts.length === 0 && (
          <CardContent className="pt-0">
            <div className="text-center py-6 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conta vinculada a este projeto</p>
              <p className="text-sm">Clique em "Buscar Novas" para adicionar contas</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Available accounts to add */}
      {newAccounts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contas Disponíveis para Adicionar</CardTitle>
            <CardDescription>
              {newAccounts.length} conta(s) encontrada(s) no Meta Business
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {newAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{account.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{account.id}</p>
                      {account.business_name && (
                        <p className="text-xs text-muted-foreground">
                          BM: {account.business_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{account.currency}</Badge>
                    <Button
                      size="sm"
                      onClick={() => handleAddAccount(account)}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span className="ml-2">Adicionar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta "{accountToDelete?.account_name || accountToDelete?.account_id}" será removida do projeto.
              Os dados históricos de insights serão mantidos, mas ela será desvinculada de todos os funis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
