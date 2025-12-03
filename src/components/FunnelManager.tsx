import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface Funnel {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

interface FunnelManagerProps {
  projectId: string | null;
  onFunnelChange?: () => void;
}

export function FunnelManager({ projectId, onFunnelChange }: FunnelManagerProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const fetchFunnels = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setFunnels(data || []);

      // Fetch offer counts per funnel
      const { data: mappings } = await supabase
        .from('offer_mappings')
        .select('funnel_id')
        .eq('project_id', projectId)
        .not('funnel_id', 'is', null);

      if (mappings) {
        const counts: Record<string, number> = {};
        mappings.forEach(m => {
          if (m.funnel_id) {
            counts[m.funnel_id] = (counts[m.funnel_id] || 0) + 1;
          }
        });
        setOfferCounts(counts);
      }
    } catch (error: any) {
      console.error('Error fetching funnels:', error);
      toast({
        title: 'Erro ao carregar funis',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnels();
  }, [projectId]);

  const handleCreate = async () => {
    if (!projectId || !newFunnelName.trim()) return;

    try {
      const { error } = await supabase
        .from('funnels')
        .insert({
          name: newFunnelName.trim(),
          project_id: projectId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Erro',
            description: 'Já existe um funil com esse nome neste projeto',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Sucesso!',
        description: 'Funil criado com sucesso',
      });

      setNewFunnelName('');
      fetchFunnels();
      onFunnelChange?.();
    } catch (error: any) {
      console.error('Error creating funnel:', error);
      toast({
        title: 'Erro ao criar funil',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (funnel: Funnel) => {
    setEditingId(funnel.id);
    setEditingName(funnel.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      const { error } = await supabase
        .from('funnels')
        .update({ name: editingName.trim() })
        .eq('id', editingId);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Erro',
            description: 'Já existe um funil com esse nome neste projeto',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Sucesso!',
        description: 'Nome do funil atualizado',
      });

      setEditingId(null);
      setEditingName('');
      fetchFunnels();
      onFunnelChange?.();
    } catch (error: any) {
      console.error('Error updating funnel:', error);
      toast({
        title: 'Erro ao atualizar funil',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteClick = (funnel: Funnel) => {
    setFunnelToDelete(funnel);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!funnelToDelete) return;

    try {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', funnelToDelete.id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Funil excluído com sucesso',
      });

      fetchFunnels();
      onFunnelChange?.();
    } catch (error: any) {
      console.error('Error deleting funnel:', error);
      toast({
        title: 'Erro ao excluir funil',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setFunnelToDelete(null);
    }
  };

  if (!projectId) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Selecione um projeto para gerenciar os funis
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-3">
          <Input
            placeholder="Ex: FACE | SKINCARE 35+ ou GOOGLE | EBOOK GRÁTIS"
            value={newFunnelName}
            onChange={(e) => setNewFunnelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={!newFunnelName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Funil
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Sugestão: ORIGEM | NOME DO FUNIL (ex: FACE | SKINCARE 35+, GOOGLE | EBOOK GRÁTIS)
        </p>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando funis...</p>
          </div>
        ) : funnels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum funil cadastrado. Crie um funil acima para começar.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Funil</TableHead>
                <TableHead className="w-[120px]">Ofertas</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.map((funnel) => (
                <TableRow key={funnel.id}>
                  <TableCell>
                    {editingId === funnel.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-medium">{funnel.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {offerCounts[funnel.id] || 0} ofertas
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId !== funnel.id && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(funnel)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(funnel)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o funil "{funnelToDelete?.name}"?
              {(offerCounts[funnelToDelete?.id || ''] || 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Este funil possui {offerCounts[funnelToDelete?.id || '']} ofertas vinculadas que ficarão sem funil.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
