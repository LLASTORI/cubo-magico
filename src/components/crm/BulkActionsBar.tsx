import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  X, 
  ArrowRight, 
  Tag, 
  Download, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { PipelineStage } from '@/hooks/usePipelineStages';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  stages: PipelineStage[];
  onClearSelection: () => void;
  projectId: string;
}

export function BulkActionsBar({ 
  selectedCount, 
  selectedIds, 
  stages, 
  onClearSelection,
  projectId 
}: BulkActionsBarProps) {
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleMoveToStage = async () => {
    if (!selectedStage) return;
    
    setIsLoading(true);
    try {
      const stageId = selectedStage === 'null' ? null : selectedStage;
      
      const { error } = await supabase
        .from('crm_contacts')
        .update({ pipeline_stage_id: stageId })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedCount} contatos movidos com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['crm-kanban-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      onClearSelection();
      setIsMoveDialogOpen(false);
    } catch (error) {
      console.error('Error moving contacts:', error);
      toast.error('Erro ao mover contatos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTag = async () => {
    if (!newTag.trim()) return;
    
    setIsLoading(true);
    try {
      // First, get current tags for selected contacts
      const { data: contacts, error: fetchError } = await supabase
        .from('crm_contacts')
        .select('id, tags')
        .in('id', selectedIds);

      if (fetchError) throw fetchError;

      // Update each contact with the new tag
      const updates = contacts?.map(contact => {
        const currentTags = contact.tags || [];
        if (currentTags.includes(newTag.trim())) {
          return null; // Skip if tag already exists
        }
        return supabase
          .from('crm_contacts')
          .update({ tags: [...currentTags, newTag.trim()] })
          .eq('id', contact.id);
      }).filter(Boolean);

      if (updates && updates.length > 0) {
        await Promise.all(updates);
      }

      toast.success(`Tag "${newTag}" aplicada a ${selectedCount} contatos`);
      queryClient.invalidateQueries({ queryKey: ['crm-kanban-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      onClearSelection();
      setIsTagDialogOpen(false);
      setNewTag('');
    } catch (error) {
      console.error('Error applying tag:', error);
      toast.error('Erro ao aplicar tag');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const { data: contacts, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .in('id', selectedIds);

      if (error) throw error;

      if (!contacts || contacts.length === 0) {
        toast.error('Nenhum contato para exportar');
        return;
      }

      // Create CSV content
      const headers = [
        'Nome',
        'Email',
        'Telefone',
        'DDD',
        'Documento',
        'Instagram',
        'Cidade',
        'Estado',
        'País',
        'Status',
        'Tags',
        'Total Compras',
        'Receita Total',
        'Primeira Compra',
        'Última Compra',
        'Primeiro Contato',
        'Última Atividade',
        'UTM Source',
        'UTM Campaign',
        'UTM Medium'
      ];

      const rows = contacts.map(contact => [
        contact.name || '',
        contact.email,
        contact.phone || '',
        contact.phone_ddd || '',
        contact.document || '',
        contact.instagram || '',
        contact.city || '',
        contact.state || '',
        contact.country || '',
        contact.status,
        (contact.tags || []).join('; '),
        contact.total_purchases || 0,
        contact.total_revenue || 0,
        contact.first_purchase_at || '',
        contact.last_purchase_at || '',
        contact.first_seen_at || '',
        contact.last_activity_at || '',
        contact.first_utm_source || '',
        contact.first_utm_campaign || '',
        contact.first_utm_medium || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contatos_crm_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${contacts.length} contatos exportados`);
      onClearSelection();
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast.error('Erro ao exportar contatos');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
        </div>
        
        <div className="h-6 w-px bg-primary-foreground/20" />
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => setIsMoveDialogOpen(true)}
            disabled={isLoading}
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Mover
          </Button>
          
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => setIsTagDialogOpen(true)}
            disabled={isLoading}
          >
            <Tag className="h-4 w-4 mr-1" />
            Tag
          </Button>
          
          <Button 
            size="sm" 
            variant="secondary"
            onClick={handleExport}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Exportar
          </Button>
        </div>
        
        <div className="h-6 w-px bg-primary-foreground/20" />
        
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Contatos</DialogTitle>
            <DialogDescription>
              Selecione a etapa para onde deseja mover {selectedCount} contato{selectedCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  Sem etapa
                </span>
              </SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <span className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveToStage} disabled={!selectedStage || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Tag</DialogTitle>
            <DialogDescription>
              Digite a tag que deseja aplicar a {selectedCount} contato{selectedCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <Input
            placeholder="Nome da tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyTag()}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyTag} disabled={!newTag.trim() || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
