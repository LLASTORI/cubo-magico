import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { BulkActionsBar } from '@/components/crm/BulkActionsBar';
import { KanbanFiltersBar, KanbanFilters, defaultFilters, applyFilters } from '@/components/crm/KanbanFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Lock, 
  Users, 
  Settings,
  GripVertical,
  Mail,
  Phone,
  DollarSign,
  CheckSquare,
  Square
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface KanbanContact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  pipeline_stage_id: string | null;
  total_revenue: number | null;
  total_purchases: number | null;
  last_activity_at: string;
  tags: string[] | null;
}

export default function CRMKanban() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { stages, isLoading: stagesLoading, createDefaultStages } = usePipelineStages();
  const [filters, setFilters] = useState<KanbanFilters>(defaultFilters);
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const crmEnabled = isModuleEnabled('crm');

  // Fetch contacts for kanban
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['crm-kanban-contacts', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('crm_contacts')
        .select('id, name, email, phone, pipeline_stage_id, total_revenue, total_purchases, last_activity_at, tags')
        .eq('project_id', currentProject.id)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data as KanbanContact[];
    },
    enabled: !!currentProject?.id && crmEnabled,
  });

  // Create default stages if none exist
  useEffect(() => {
    if (!stagesLoading && stages.length === 0 && currentProject?.id && crmEnabled) {
      createDefaultStages.mutate();
    }
  }, [stagesLoading, stages.length, currentProject?.id, crmEnabled]);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedContacts(new Set());
    }
  }, [isSelectionMode]);

  // Update contact stage
  const updateContactStage = useMutation({
    mutationFn: async ({ contactId, stageId }: { contactId: string; stageId: string | null }) => {
      const { error } = await supabase
        .from('crm_contacts')
        .update({ pipeline_stage_id: stageId })
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-kanban-contacts'] });
    },
  });

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    if (isSelectionMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('contactId', contactId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string | null) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('contactId');
    updateContactStage.mutate({ contactId, stageId });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Apply filters to contacts
  const filteredContacts = useMemo(() => {
    return applyFilters(contacts, filters);
  }, [contacts, filters]);

  const getContactsByStage = (stageId: string | null) => {
    return filteredContacts.filter(c => c.pipeline_stage_id === stageId);
  };

  const handleSearchSelect = (contactId: string) => {
    navigate(`/crm/contact/${contactId}`);
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const toggleSelectAllInStage = (stageId: string | null) => {
    const stageContacts = getContactsByStage(stageId);
    const allSelected = stageContacts.every(c => selectedContacts.has(c.id));
    
    const newSelected = new Set(selectedContacts);
    if (allSelected) {
      stageContacts.forEach(c => newSelected.delete(c.id));
    } else {
      stageContacts.forEach(c => newSelected.add(c.id));
    }
    setSelectedContacts(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedContacts(new Set());
    setIsSelectionMode(false);
  };

  const isLoading = modulesLoading || stagesLoading || contactsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="CRM - Pipeline" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="CRM - Pipeline" />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline de Vendas</CardTitle>
              <CardDescription>Selecione um projeto para visualizar o pipeline</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!crmEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="CRM - Pipeline" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-muted">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Módulo CRM</CardTitle>
                <CardDescription>Este módulo não está habilitado para o seu projeto.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Get contacts without stage
  const unstagedContacts = getContactsByStage(null);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="CRM - Pipeline" />
      
      <main className="container mx-auto px-6 py-8 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
            <p className="text-muted-foreground">
              {isSelectionMode 
                ? 'Clique nos cards para selecionar' 
                : 'Arraste os leads entre as etapas para atualizar o status'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={isSelectionMode ? "default" : "outline"} 
              onClick={() => setIsSelectionMode(!isSelectionMode)}
            >
              {isSelectionMode ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Selecionando
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Selecionar
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm')}>
              <Users className="h-4 w-4 mr-2" />
              Ver Lista
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/activities')}>
              Atividades
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/cadences')}>
              Cadências
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/pipeline-settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mb-4">
          <KanbanFiltersBar
            contacts={contacts}
            filters={filters}
            onFiltersChange={setFilters}
            onSearchSelect={handleSearchSelect}
            onCreateTag={(tag) => {
              // Add tag to filter immediately
              setFilters(prev => ({ ...prev, tags: [...prev.tags, tag] }));
            }}
            onDeleteTag={async (tag) => {
              if (!currentProject?.id) return;
              
              // Get all contacts that have this tag
              const contactsWithTag = contacts.filter(c => c.tags?.includes(tag));
              
              if (contactsWithTag.length === 0) {
                toast.success(`Tag "${tag}" deletada`);
                return;
              }
              
              // Update each contact to remove the tag
              const updates = contactsWithTag.map(contact => {
                const newTags = (contact.tags || []).filter(t => t !== tag);
                return supabase
                  .from('crm_contacts')
                  .update({ tags: newTags })
                  .eq('id', contact.id);
              });
              
              const results = await Promise.all(updates);
              const errors = results.filter(r => r.error);
              
              if (errors.length > 0) {
                toast.error('Erro ao deletar tag de alguns contatos');
                console.error(errors);
              } else {
                toast.success(`Tag "${tag}" removida de ${contactsWithTag.length} contatos`);
                queryClient.invalidateQueries({ queryKey: ['crm-kanban-contacts'] });
              }
            }}
          />
        </div>

        {/* Results count */}
        {(filters.search || filters.tags.length > 0 || filters.revenueMin !== null || filters.revenueMax !== null || filters.lastActivityDays !== null || filters.dateFrom || filters.dateTo) && (
          <p className="text-sm text-muted-foreground mb-4">
            Mostrando {filteredContacts.length} de {contacts.length} contatos
          </p>
        )}

        <ScrollArea className="w-full pb-4">
          <div className="flex gap-4 min-w-max">
            {/* Unstaged column */}
            <div
              className="w-72 flex-shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
            >
              <Card className="h-full bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {isSelectionMode && (
                        <Checkbox
                          checked={unstagedContacts.length > 0 && unstagedContacts.every(c => selectedContacts.has(c.id))}
                          onCheckedChange={() => toggleSelectAllInStage(null)}
                        />
                      )}
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      Sem etapa
                    </CardTitle>
                    <Badge variant="secondary">{unstagedContacts.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {unstagedContacts.map((contact) => (
                    <KanbanCard 
                      key={contact.id} 
                      contact={contact}
                      isSelected={selectedContacts.has(contact.id)}
                      isSelectionMode={isSelectionMode}
                      onDragStart={handleDragStart}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleContactSelection(contact.id);
                        } else {
                          navigate(`/crm/contact/${contact.id}`);
                        }
                      }}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                  {unstagedContacts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum lead
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stage columns */}
            {stages.map((stage) => {
              const stageContacts = getContactsByStage(stage.id);
              const stageRevenue = stageContacts.reduce((sum, c) => sum + (c.total_revenue || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="w-72 flex-shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <Card className={`h-full ${stage.is_won ? 'bg-green-500/5' : stage.is_lost ? 'bg-red-500/5' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {isSelectionMode && (
                            <Checkbox
                              checked={stageContacts.length > 0 && stageContacts.every(c => selectedContacts.has(c.id))}
                              onCheckedChange={() => toggleSelectAllInStage(stage.id)}
                            />
                          )}
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </CardTitle>
                        <Badge variant="secondary">{stageContacts.length}</Badge>
                      </div>
                      {stageRevenue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(stageRevenue)} em receita
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {stageContacts.map((contact) => (
                        <KanbanCard 
                          key={contact.id} 
                          contact={contact}
                          isSelected={selectedContacts.has(contact.id)}
                          isSelectionMode={isSelectionMode}
                          onDragStart={handleDragStart}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleContactSelection(contact.id);
                            } else {
                              navigate(`/crm/contact/${contact.id}`);
                            }
                          }}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                      {stageContacts.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum lead nesta etapa
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </main>

      <BulkActionsBar
        selectedCount={selectedContacts.size}
        selectedIds={Array.from(selectedContacts)}
        stages={stages}
        onClearSelection={handleClearSelection}
        projectId={currentProject.id}
      />
    </div>
  );
}

interface KanbanCardProps {
  contact: KanbanContact;
  isSelected: boolean;
  isSelectionMode: boolean;
  onDragStart: (e: React.DragEvent, contactId: string) => void;
  onClick: () => void;
  formatCurrency: (value: number | null) => string;
}

function KanbanCard({ contact, isSelected, isSelectionMode, onDragStart, onClick, formatCurrency }: KanbanCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${
        isSelectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      draggable={!isSelectionMode}
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {isSelectionMode ? (
            <Checkbox 
              checked={isSelected} 
              className="mt-0.5 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {contact.name || contact.email.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {contact.email}
            </p>
            {contact.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </p>
            )}
            {(contact.total_revenue ?? 0) > 0 && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(contact.total_revenue)}
              </p>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
                {contact.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    +{contact.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
