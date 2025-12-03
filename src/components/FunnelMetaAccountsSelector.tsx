import { useState, useEffect } from 'react';
import { Check, Loader2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MetaAdAccount {
  id: string;
  account_id: string;
  account_name: string | null;
  currency: string | null;
  is_active: boolean | null;
}

interface FunnelMetaAccount {
  id: string;
  funnel_id: string;
  meta_account_id: string;
}

interface FunnelMetaAccountsSelectorProps {
  projectId: string;
  funnelId: string;
  funnelName: string;
  children: React.ReactNode;
  onAssociationsChange?: () => void;
}

export function FunnelMetaAccountsSelector({
  projectId,
  funnelId,
  funnelName,
  children,
  onAssociationsChange,
}: FunnelMetaAccountsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectAccounts, setProjectAccounts] = useState<MetaAdAccount[]>([]);
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch project's active Meta accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('meta_ad_accounts')
        .select('id, account_id, account_name, currency, is_active')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('account_name');

      if (accountsError) throw accountsError;
      setProjectAccounts(accounts || []);

      // Fetch currently linked accounts for this funnel
      const { data: links, error: linksError } = await supabase
        .from('funnel_meta_accounts')
        .select('meta_account_id')
        .eq('funnel_id', funnelId);

      if (linksError) throw linksError;
      
      const linked = (links || []).map(l => l.meta_account_id);
      setLinkedAccountIds(linked);
      setSelectedIds(linked);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, projectId, funnelId]);

  const handleToggle = (accountId: string) => {
    setSelectedIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find accounts to add and remove
      const toAdd = selectedIds.filter(id => !linkedAccountIds.includes(id));
      const toRemove = linkedAccountIds.filter(id => !selectedIds.includes(id));

      // Remove unselected
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('funnel_meta_accounts')
          .delete()
          .eq('funnel_id', funnelId)
          .in('meta_account_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add new selections
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('funnel_meta_accounts')
          .insert(
            toAdd.map(metaAccountId => ({
              project_id: projectId,
              funnel_id: funnelId,
              meta_account_id: metaAccountId,
            }))
          );

        if (addError) throw addError;
      }

      toast({
        title: 'Associações salvas!',
        description: `${selectedIds.length} conta(s) vinculada(s) ao funil "${funnelName}".`,
      });

      setLinkedAccountIds(selectedIds);
      onAssociationsChange?.();
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving associations:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...linkedAccountIds].sort());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Contas de Anúncio do Funil</DialogTitle>
          <DialogDescription>
            Selecione quais contas de anúncio alimentam o funil <strong>"{funnelName}"</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projectAccounts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Unlink className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta de anúncio ativa no projeto</p>
            <p className="text-sm">Adicione contas na aba "Contas Meta" primeiro</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
              <span>{selectedIds.length} de {projectAccounts.length} selecionada(s)</span>
              {linkedAccountIds.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Link2 className="h-3 w-3" />
                  {linkedAccountIds.length} vinculada(s)
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {projectAccounts.map((account) => {
                  const isSelected = selectedIds.includes(account.id);
                  const wasLinked = linkedAccountIds.includes(account.id);
                  
                  return (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:bg-accent'
                      }`}
                      onClick={() => handleToggle(account.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(account.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">
                            {account.account_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {account.account_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.currency || '-'}
                        </Badge>
                        {wasLinked && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
