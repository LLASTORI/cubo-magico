import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X, Loader2, ChevronDown, ChevronRight, ArrowRightLeft, Link2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FunnelMetaAccountsSelector } from './FunnelMetaAccountsSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Funnel {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

interface OfferMapping {
  id: string;
  nome_produto: string;
  nome_oferta: string | null;
  codigo_oferta: string | null;
  valor: number | null;
  nome_posicao: string | null;
  tipo_posicao: string | null;
  id_funil: string;
}

interface FunnelManagerProps {
  projectId: string | null;
  onFunnelChange?: () => void;
}

const POSITION_COLORS: Record<string, string> = {
  FRONT: 'bg-blue-500 text-white',
  OB: 'bg-amber-500 text-white',
  US: 'bg-green-500 text-white',
  DS: 'bg-purple-500 text-white',
};

const getPositionBadgeClass = (tipo: string | null) => {
  if (!tipo) return 'bg-muted text-muted-foreground';
  return POSITION_COLORS[tipo] || 'bg-muted text-muted-foreground';
};

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function FunnelManager({ projectId, onFunnelChange }: FunnelManagerProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [offersByFunnel, setOffersByFunnel] = useState<Record<string, OfferMapping[]>>({});
  const [expandedFunnels, setExpandedFunnels] = useState<Set<string>>(new Set());
  const [loadingOffers, setLoadingOffers] = useState<Set<string>>(new Set());
  
  // Move offer dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [offerToMove, setOfferToMove] = useState<OfferMapping | null>(null);
  const [targetFunnelName, setTargetFunnelName] = useState('');
  
  const [legacyFunnels, setLegacyFunnels] = useState<string[]>([]);
  const [syncingLegacy, setSyncingLegacy] = useState(false);
  
  // Meta accounts linked to funnels
  const [metaAccountsByFunnel, setMetaAccountsByFunnel] = useState<Record<string, number>>({});
  
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

  const fetchOffersForFunnel = async (funnelName: string) => {
    if (!projectId) return;
    
    setLoadingOffers(prev => new Set(prev).add(funnelName));
    
    try {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id, nome_produto, nome_oferta, codigo_oferta, valor, nome_posicao, tipo_posicao, id_funil')
        .eq('project_id', projectId)
        .eq('id_funil', funnelName)
        .order('tipo_posicao')
        .order('ordem_posicao');

      if (error) throw error;
      
      setOffersByFunnel(prev => ({
        ...prev,
        [funnelName]: data || []
      }));
    } catch (error: any) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoadingOffers(prev => {
        const next = new Set(prev);
        next.delete(funnelName);
        return next;
      });
    }
  };

  const fetchLegacyFunnels = async () => {
    if (!projectId) return;
    
    try {
      // Get distinct funnel names from offer_mappings that don't exist in funnels table
      const { data: mappingFunnels, error: mappingError } = await supabase
        .from('offer_mappings')
        .select('id_funil')
        .eq('project_id', projectId)
        .not('id_funil', 'is', null);

      if (mappingError) throw mappingError;

      const { data: existingFunnels, error: funnelError } = await supabase
        .from('funnels')
        .select('name')
        .eq('project_id', projectId);

      if (funnelError) throw funnelError;

      const existingNames = new Set(existingFunnels?.map(f => f.name) || []);
      const uniqueMappingFunnels = [...new Set(mappingFunnels?.map(m => m.id_funil) || [])];
      const legacy = uniqueMappingFunnels.filter(name => name && !existingNames.has(name));
      
      setLegacyFunnels(legacy);
    } catch (error) {
      console.error('Error fetching legacy funnels:', error);
    }
  };

  const syncLegacyFunnels = async () => {
    if (!projectId || legacyFunnels.length === 0) return;
    
    setSyncingLegacy(true);
    try {
      const funnelsToInsert = legacyFunnels.map(name => ({
        name,
        project_id: projectId,
      }));

      const { error } = await supabase
        .from('funnels')
        .insert(funnelsToInsert);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `${legacyFunnels.length} funis importados com sucesso`,
      });

      setLegacyFunnels([]);
      fetchFunnels();
      onFunnelChange?.();
    } catch (error: any) {
      console.error('Error syncing legacy funnels:', error);
      toast({
        title: 'Erro ao importar funis',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncingLegacy(false);
    }
  };

  const fetchMetaAccountsCounts = async () => {
    if (!projectId) return;
    
    try {
      const { data: funnelsList } = await supabase
        .from('funnels')
        .select('id')
        .eq('project_id', projectId);

      if (!funnelsList) return;

      const { data: links } = await supabase
        .from('funnel_meta_accounts')
        .select('funnel_id')
        .eq('project_id', projectId);

      const counts: Record<string, number> = {};
      funnelsList.forEach(f => {
        counts[f.id] = (links || []).filter(l => l.funnel_id === f.id).length;
      });
      
      setMetaAccountsByFunnel(counts);
    } catch (error) {
      console.error('Error fetching meta accounts counts:', error);
    }
  };

  useEffect(() => {
    fetchFunnels();
    fetchLegacyFunnels();
    fetchMetaAccountsCounts();
  }, [projectId]);

  const toggleFunnel = async (funnelName: string) => {
    const newExpanded = new Set(expandedFunnels);
    
    if (newExpanded.has(funnelName)) {
      newExpanded.delete(funnelName);
    } else {
      newExpanded.add(funnelName);
      if (!offersByFunnel[funnelName]) {
        await fetchOffersForFunnel(funnelName);
      }
    }
    
    setExpandedFunnels(newExpanded);
  };

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

  const handleSaveEdit = async (oldName: string) => {
    if (!editingId || !editingName.trim()) return;

    try {
      // Update funnel name
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

      // Update all offer mappings that reference this funnel
      const { error: updateOffersError } = await supabase
        .from('offer_mappings')
        .update({ id_funil: editingName.trim() })
        .eq('id_funil', oldName)
        .eq('project_id', projectId);

      if (updateOffersError) {
        console.error('Error updating offers:', updateOffersError);
      }

      toast({
        title: 'Sucesso!',
        description: 'Nome do funil atualizado',
      });

      setEditingId(null);
      setEditingName('');
      setOffersByFunnel({});
      setExpandedFunnels(new Set());
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

  const handleMoveOfferClick = (offer: OfferMapping) => {
    setOfferToMove(offer);
    setTargetFunnelName('');
    setMoveDialogOpen(true);
  };

  const handleMoveOffer = async () => {
    if (!offerToMove || !targetFunnelName) return;

    try {
      const { error } = await supabase
        .from('offer_mappings')
        .update({ id_funil: targetFunnelName })
        .eq('id', offerToMove.id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `Oferta movida para o funil "${targetFunnelName}"`,
      });

      // Refresh offers for both funnels
      const oldFunnel = offerToMove.id_funil;
      setOffersByFunnel({});
      
      if (expandedFunnels.has(oldFunnel)) {
        fetchOffersForFunnel(oldFunnel);
      }
      if (expandedFunnels.has(targetFunnelName)) {
        fetchOffersForFunnel(targetFunnelName);
      }
      
      onFunnelChange?.();
    } catch (error: any) {
      console.error('Error moving offer:', error);
      toast({
        title: 'Erro ao mover oferta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setMoveDialogOpen(false);
      setOfferToMove(null);
      setTargetFunnelName('');
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

  const getOfferCount = (funnelName: string) => {
    return offersByFunnel[funnelName]?.length ?? '...';
  };

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

      {legacyFunnels.length > 0 && (
        <Card className="p-4 border-amber-500/50 bg-amber-500/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {legacyFunnels.length} funis encontrados nas ofertas cadastradas
              </p>
              <p className="text-sm text-muted-foreground">
                Funis: {legacyFunnels.slice(0, 3).join(', ')}{legacyFunnels.length > 3 ? ` e mais ${legacyFunnels.length - 3}...` : ''}
              </p>
            </div>
            <Button 
              onClick={syncLegacyFunnels} 
              disabled={syncingLegacy}
              variant="outline"
              className="border-amber-500/50 hover:bg-amber-500/20"
            >
              {syncingLegacy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Importar Funis
            </Button>
          </div>
        </Card>
      )}

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
          <div className="space-y-2">
            {funnels.map((funnel) => (
              <Collapsible
                key={funnel.id}
                open={expandedFunnels.has(funnel.name)}
                onOpenChange={() => toggleFunnel(funnel.name)}
              >
                <div className="border rounded-lg">
                  <div className="flex items-center p-3 hover:bg-muted/50 transition-colors">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        {expandedFunnels.has(funnel.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <div className="flex-1 ml-2">
                      {editingId === funnel.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(funnel.name);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="h-8 max-w-md"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(funnel.name)} className="h-8 w-8">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <CollapsibleTrigger asChild>
                          <button className="text-left font-medium hover:underline cursor-pointer">
                            {funnel.name}
                          </button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    
                    <Badge variant="secondary" className="mr-2">
                      {offersByFunnel[funnel.name]?.length ?? '?'} ofertas
                    </Badge>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FunnelMetaAccountsSelector
                            projectId={projectId!}
                            funnelId={funnel.id}
                            funnelName={funnel.name}
                            onAssociationsChange={fetchMetaAccountsCounts}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 mr-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link2 className="h-3 w-3" />
                              <span className="text-xs">
                                {metaAccountsByFunnel[funnel.id] || 0} contas
                              </span>
                            </Button>
                          </FunnelMetaAccountsSelector>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Vincular contas Meta Ads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {editingId !== funnel.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(funnel);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(funnel);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 bg-muted/30">
                      {loadingOffers.has(funnel.name) ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Carregando ofertas...</span>
                        </div>
                      ) : offersByFunnel[funnel.name]?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma oferta neste funil
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Posição</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Oferta</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead className="w-[100px] text-right">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {offersByFunnel[funnel.name]?.map((offer) => (
                              <TableRow key={offer.id}>
                                <TableCell>
                                  {offer.nome_posicao ? (
                                    <Badge className={getPositionBadgeClass(offer.tipo_posicao)}>
                                      {offer.nome_posicao}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium max-w-[200px] truncate">
                                  {offer.nome_produto}
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">
                                  {offer.nome_oferta || '-'}
                                </TableCell>
                                <TableCell>{formatCurrency(offer.valor)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveOfferClick(offer)}
                                    className="gap-1"
                                  >
                                    <ArrowRightLeft className="h-4 w-4" />
                                    Mover
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Funnel Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o funil "{funnelToDelete?.name}"?
              {(offersByFunnel[funnelToDelete?.name || '']?.length || 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Este funil possui {offersByFunnel[funnelToDelete?.name || '']?.length} ofertas vinculadas que ficarão sem funil.
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

      {/* Move Offer Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Oferta para Outro Funil</DialogTitle>
            <DialogDescription>
              Selecione o funil de destino para a oferta "{offerToMove?.nome_oferta || offerToMove?.nome_produto}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={targetFunnelName} onValueChange={setTargetFunnelName}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funil de destino" />
              </SelectTrigger>
              <SelectContent>
                {funnels
                  .filter(f => f.name !== offerToMove?.id_funil)
                  .map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.name}>
                      {funnel.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveOffer} disabled={!targetFunnelName}>
              Mover Oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
