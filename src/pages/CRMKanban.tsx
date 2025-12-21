import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
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
import { CreateContactDialog } from '@/components/crm/CreateContactDialog';

interface KanbanContact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  pipeline_stage_id: string | null;
  total_revenue: number | null;
  total_purchases: number | null;
  last_activity_at: string;
  updated_at: string;
  tags: string[] | null;
  last_transaction_date?: string | null;
}

export default function CRMKanban() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { stages, isLoading: stagesLoading, createDefaultStages } = usePipelineStages();
  const queryClient = useQueryClient();

  // Restore filters from URL params
  const [filters, setFiltersState] = useState<KanbanFilters>(() => {
    const tagsParam = searchParams.get('tags');
    const revenueMinParam = searchParams.get('revenueMin');
    const revenueMaxParam = searchParams.get('revenueMax');
    const lastActivityDaysParam = searchParams.get('lastActivityDays');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const searchParam = searchParams.get('search');

    return {
      search: searchParam || '',
      tags: tagsParam ? tagsParam.split(',').filter(Boolean) : [],
      revenueMin: revenueMinParam ? Number(revenueMinParam) : null,
      revenueMax: revenueMaxParam ? Number(revenueMaxParam) : null,
      lastActivityDays: lastActivityDaysParam ? Number(lastActivityDaysParam) : null,
      dateFrom: dateFromParam ? new Date(dateFromParam) : null,
      dateTo: dateToParam ? new Date(dateToParam) : null,
    };
  });

  // Sync filters to URL params
  const setFilters = useCallback((newFilters: KanbanFilters) => {
    setFiltersState(newFilters);
    
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
    if (newFilters.revenueMin !== null) params.set('revenueMin', String(newFilters.revenueMin));
    if (newFilters.revenueMax !== null) params.set('revenueMax', String(newFilters.revenueMax));
    if (newFilters.lastActivityDays !== null) params.set('lastActivityDays', String(newFilters.lastActivityDays));
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom.toISOString());
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo.toISOString());
    
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const crmEnabled = isModuleEnabled('crm');

  // Fetch contacts for kanban with their last transaction date
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['crm-kanban-contacts', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('crm_contacts')
        .select('id, name, email, phone, pipeline_stage_id, total_revenue, total_purchases, last_activity_at, updated_at, tags')
        .eq('project_id', currentProject.id)
        .order('updated_at', { ascending: false });

      if (contactsError) throw contactsError;
      
      // Fetch last transaction date for each contact (for date filtering)
      // Do this in batches to avoid URL length limits
      const contactIds = contactsData.map(c => c.id);
      const lastTxDateMap = new Map<string, string>();
      
      const batchSize = 50; // Smaller batch size to avoid URL length issues
      for (let i = 0; i < contactIds.length; i += batchSize) {
        const batchIds = contactIds.slice(i, i + batchSize);
        
        const { data: transactionsData, error: txError } = await supabase
          .from('crm_transactions')
          .select('contact_id, transaction_date, created_at')
          .eq('project_id', currentProject.id)
          .in('contact_id', batchIds)
          .order('transaction_date', { ascending: false, nullsFirst: false });

        if (txError) {
          console.error('Error fetching transactions batch:', txError);
          continue; // Continue with other batches even if one fails
        }

        for (const tx of transactionsData || []) {
          if (!lastTxDateMap.has(tx.contact_id)) {
            lastTxDateMap.set(tx.contact_id, tx.transaction_date || tx.created_at);
          }
        }
      }

      return contactsData.map(c => ({
        ...c,
        last_transaction_date: lastTxDateMap.get(c.id) || null,
      })) as KanbanContact[];
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
      
      <CRMSubNav 
        showNewContact 
        onNewContact={() => setShowCreateDialog(true)}
        showSettings
        settingsPath="/crm/pipeline-settings"
        rightContent={
          <Button 
            variant={isSelectionMode ? "default" : "outline"} 
            size="sm"
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
        }
      />
      
      <main className="container mx-auto px-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            {isSelectionMode 
              ? 'Clique nos cards para selecionar' 
              : 'Arraste os leads entre as etapas para atualizar o status'}
          </p>
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
              setFilters({ ...filters, tags: [...filters.tags, tag] });
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
          <div className="flex gap-4 min-w-max h-[calc(100vh-280px)]">
            {/* Unstaged column */}
            <div
              className="min-w-[280px] max-w-[280px] h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="flex flex-col h-full bg-muted/30 rounded-lg border">
                <div
                  className="p-3 border-b shrink-0 flex items-center justify-between"
                  style={{ borderTopColor: '#6b7280', borderTopWidth: 3, borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
                >
                  <div className="flex items-center gap-2">
                    {isSelectionMode && (
                      <Checkbox
                        checked={unstagedContacts.length > 0 && unstagedContacts.every(c => selectedContacts.has(c.id))}
                        onCheckedChange={() => toggleSelectAllInStage(null)}
                      />
                    )}
                    <h3 className="font-semibold">Sem etapa</h3>
                    <Badge variant="secondary" className="text-xs">
                      {unstagedContacts.length}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 min-h-0 space-y-2">
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
                </div>
              </div>
            </div>

            {/* Stage columns */}
            {stages.map((stage) => {
              const stageContacts = getContactsByStage(stage.id);
              const stageRevenue = stageContacts.reduce((sum, c) => sum + (c.total_revenue || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="min-w-[280px] max-w-[280px] h-full"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className={`flex flex-col h-full rounded-lg border ${stage.is_won ? 'bg-green-500/5' : stage.is_lost ? 'bg-red-500/5' : 'bg-muted/30'}`}>
                    <div
                      className="p-3 border-b shrink-0 flex items-center justify-between"
                      style={{ borderTopColor: stage.color, borderTopWidth: 3, borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
                    >
                      <div className="flex items-center gap-2">
                        {isSelectionMode && (
                          <Checkbox
                            checked={stageContacts.length > 0 && stageContacts.every(c => selectedContacts.has(c.id))}
                            onCheckedChange={() => toggleSelectAllInStage(stage.id)}
                          />
                        )}
                        {stage.is_won && <CheckSquare className="h-4 w-4 text-green-500" />}
                        {stage.is_lost && <Square className="h-4 w-4 text-red-500" />}
                        <h3 className="font-semibold">{stage.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {stageContacts.length}
                        </Badge>
                      </div>
                    </div>
                    {stageRevenue > 0 && (
                      <div className="px-3 py-1 border-b">
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(stageRevenue)} em receita
                        </p>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-2 min-h-0 space-y-2">
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
                    </div>
                  </div>
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

      <CreateContactDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(contactId) => {
          navigate(`/crm/contact/${contactId}`);
        }}
      />
    </div>
  );
}

// Map tags to colors for visual identification
const TAG_COLORS: Record<string, string> = {
  'Cliente': 'bg-green-500/10 text-green-600 border-green-200',
  'Recuperado (manual)': 'bg-teal-500/10 text-teal-600 border-teal-200',
  'Recuperado (auto)': 'bg-teal-500/10 text-teal-600 border-teal-200',
  'Carrinho Abandonado': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'Boleto Pendente': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'Pix Pendente': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'Cartão Recusado': 'bg-red-500/10 text-red-600 border-red-200',
  'Chargeback': 'bg-red-500/10 text-red-600 border-red-200',
  'Reembolsado': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Cancelado': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Assinante': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'Lead': 'bg-slate-500/10 text-slate-600 border-slate-200',
  'VIP': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Prospect': 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  'Expirado': 'bg-gray-500/10 text-gray-600 border-gray-200',
  'Lead Expirado': 'bg-gray-500/10 text-gray-600 border-gray-200',
};

// Prefix-based color mappings for contextual tags (comprou:, cancelou:, etc.)
const TAG_PREFIX_COLORS: Record<string, string> = {
  'comprou:': 'bg-green-500/10 text-green-600 border-green-200',
  'abandonou:': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'pendente:': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'cancelou:': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'reembolsou:': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'chargeback:': 'bg-red-500/10 text-red-600 border-red-200',
  'recuperou:': 'bg-teal-500/10 text-teal-600 border-teal-200',
  'funil:': 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
};

function getTagColor(tag: string): string {
  // First check exact match
  if (TAG_COLORS[tag]) {
    return TAG_COLORS[tag];
  }
  
  // Then check prefix match
  for (const [prefix, color] of Object.entries(TAG_PREFIX_COLORS)) {
    if (tag.startsWith(prefix)) {
      return color;
    }
  }
  
  return 'bg-muted text-muted-foreground';
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
      className={`cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group ${
        isSelectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      draggable={!isSelectionMode}
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{contact.name || contact.email}</p>
            {contact.name && (
              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
            )}
          </div>
          {isSelectionMode ? (
            <Checkbox 
              checked={isSelected} 
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </div>
        
        {contact.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Phone className="h-3 w-3" />
            {contact.phone}
          </p>
        )}
        
        <div className="flex items-center gap-2 flex-wrap">
          {contact.tags && contact.tags.length > 0 && (
            <>
              {contact.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className={`text-xs ${getTagColor(tag)}`}>
                  {tag}
                </Badge>
              ))}
              {contact.tags.length > 2 && (
                <Badge variant="outline" className="text-xs bg-muted">
                  +{contact.tags.length - 2}
                </Badge>
              )}
            </>
          )}
          {(contact.total_revenue ?? 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              {formatCurrency(contact.total_revenue)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
