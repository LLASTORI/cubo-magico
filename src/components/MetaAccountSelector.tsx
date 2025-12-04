import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MetaAccount {
  id: string;
  account_id: string;
  account_name: string | null;
  currency: string | null;
  is_active: boolean | null;
}

interface MetaAccountSelectorProps {
  projectId: string;
  onAccountsSelected: (accountIds: string[]) => void;
  children: React.ReactNode;
}

export function MetaAccountSelector({ projectId, onAccountsSelected, children }: MetaAccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<MetaAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Filter accounts based on search query
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return availableAccounts;
    const query = searchQuery.toLowerCase();
    return availableAccounts.filter(account => 
      account.name?.toLowerCase().includes(query) || 
      account.id?.toLowerCase().includes(query)
    );
  }, [availableAccounts, searchQuery]);

  // Fetch all available accounts from Meta API when dialog opens
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
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Erro ao buscar contas',
        description: error.message || 'Não foi possível carregar as contas do Meta.',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  // Fetch saved accounts from database
  const fetchSavedAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setSavedAccounts(data || []);
      
      // Pre-select active accounts
      const activeIds = (data || []).filter(a => a.is_active).map(a => a.account_id);
      setSelectedIds(activeIds);
    } catch (error) {
      console.error('Error fetching saved accounts:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableAccounts();
      fetchSavedAccounts();
    }
  }, [open, projectId]);

  const handleToggle = (accountId: string) => {
    setSelectedIds(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === availableAccounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableAccounts.map(a => a.id));
    }
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Selecione ao menos uma conta',
        description: 'É necessário selecionar pelo menos uma conta de anúncios.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_ad_accounts',
          projectId,
          accountIds: selectedIds,
        },
      });

      if (error) throw error;

      toast({
        title: 'Contas salvas!',
        description: `${selectedIds.length} conta(s) selecionada(s) para sincronização.`,
      });

      onAccountsSelected(selectedIds);
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving accounts:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a seleção.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isSaved = (accountId: string) => savedAccounts.some(a => a.account_id === accountId && a.is_active);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Selecionar Contas de Anúncios</DialogTitle>
          <DialogDescription>
            Escolha quais contas do Meta Ads deseja sincronizar neste projeto.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando contas...</span>
          </div>
        ) : availableAccounts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma conta de anúncios encontrada.
          </div>
        ) : (
          <>
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conta por nome ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} de {availableAccounts.length} selecionada(s)
                {searchQuery && ` (${filteredAccounts.length} encontrada(s))`}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedIds.length === availableAccounts.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {filteredAccounts.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    Nenhuma conta encontrada para "{searchQuery}"
                  </div>
                ) : (
                  filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.includes(account.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-card border-border hover:bg-accent'
                      }`}
                      onClick={() => handleToggle(account.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedIds.includes(account.id)}
                          onCheckedChange={() => handleToggle(account.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">{account.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{account.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.currency && (
                          <Badge variant="outline" className="text-xs">
                            {account.currency}
                          </Badge>
                        )}
                        {isSaved(account.id) && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Check className="h-3 w-3" />
                            Ativa
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || fetching}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar e Sincronizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
