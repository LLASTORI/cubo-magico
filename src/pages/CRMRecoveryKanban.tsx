import { useState, useMemo, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useRecoveryStages } from '@/hooks/useRecoveryStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  GripVertical,
  UserPlus,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface RecoveryContact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  tags: string[] | null;
  total_revenue: number | null;
  recovery_stage_id: string | null;
  recovery_started_at: string | null;
  recovery_updated_at: string | null;
  last_activity_at: string;
}

// Status que entram no pipeline de recuperação
const RECOVERY_STATUS_MAP = {
  CANCELLED: 'Cancelado',
  CHARGEBACK: 'Chargeback',
  REFUNDED: 'Reembolsado',
  ABANDONED: 'Carrinho Abandonado',
} as const;

// Contact Card Component
function ContactCard({ contact, onClick }: { contact: RecoveryContact; onClick: () => void }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Cores padronizadas (mesmo padrão do CRMKanban)
  const getRecoveryTag = () => {
    if (contact.tags?.includes('Chargeback')) return { label: 'Chargeback', color: 'bg-red-500/10 text-red-600 border-red-200' };
    if (contact.tags?.includes('Reembolsado')) return { label: 'Reembolsado', color: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    if (contact.tags?.includes('Cancelado')) return { label: 'Cancelado', color: 'bg-rose-500/10 text-rose-600 border-rose-200' };
    if (contact.tags?.includes('Carrinho Abandonado')) return { label: 'Carrinho Abandonado', color: 'bg-orange-500/10 text-orange-600 border-orange-200' };
    return null;
  };

  const tag = getRecoveryTag();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
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
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tag && (
            <Badge variant="outline" className={`text-xs ${tag.color}`}>
              {tag.label}
            </Badge>
          )}
          {contact.total_revenue && contact.total_revenue > 0 && (
            <Badge variant="secondary" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              {formatCurrency(contact.total_revenue)}
            </Badge>
          )}
        </div>

        {contact.recovery_updated_at && (
          <p className="text-xs text-muted-foreground mt-2">
            Atualizado {formatDistanceToNow(new Date(contact.recovery_updated_at), { locale: ptBR, addSuffix: true })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Sortable Contact Card
function SortableContactCard({ contact, onClick }: { contact: RecoveryContact; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ContactCard contact={contact} onClick={onClick} />
    </div>
  );
}

// Stage Column Component
function StageColumn({
  stage,
  contacts,
  onContactClick,
}: {
  stage: { id: string; name: string; color: string; is_initial: boolean; is_recovered: boolean; is_lost: boolean };
  contacts: RecoveryContact[];
  onContactClick: (contactId: string) => void;
}) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] h-full bg-muted/30 rounded-lg border">
      <div
        className="p-3 border-b shrink-0 flex items-center justify-between"
        style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-2">
          {stage.is_recovered && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {stage.is_lost && <XCircle className="h-4 w-4 text-red-500" />}
          <h3 className="font-semibold">{stage.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <SortableContactCard
                key={contact.id}
                contact={contact}
                onClick={() => onContactClick(contact.id)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function CRMRecoveryKanban() {
  const { navigateTo } = useProjectNavigation();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { stages, isLoading: stagesLoading, initializeStages } = useRecoveryStages();
  const [search, setSearch] = useState('');
  const [activeContact, setActiveContact] = useState<RecoveryContact | null>(null);

  // Initialize stages if empty
  useEffect(() => {
    if (!stagesLoading && stages.length === 0 && currentProject?.id) {
      initializeStages.mutate();
    }
  }, [stagesLoading, stages.length, currentProject?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Fetch contacts in recovery pipeline
  const { data: contacts = [], isLoading: contactsLoading, isFetching, refetch } = useQuery({
    queryKey: ['recovery-kanban-contacts', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      // Fetch contacts that have recovery tags
      const recoveryStatuses = Object.keys(RECOVERY_STATUS_MAP);

      // First get contact IDs with recovery transactions
      const { data: transactions, error: txError } = await supabase
        .from('crm_transactions')
        .select('contact_id, status')
        .eq('project_id', currentProject.id)
        .in('status', recoveryStatuses);

      if (txError) throw txError;

      const contactIds = [...new Set(transactions?.map((t) => t.contact_id) || [])];
      if (contactIds.length === 0) return [];

      // Build a map of contact -> tags
      const tagMap = new Map<string, Set<string>>();
      for (const tx of transactions || []) {
        const tag = RECOVERY_STATUS_MAP[tx.status as keyof typeof RECOVERY_STATUS_MAP];
        if (tag) {
          const tags = tagMap.get(tx.contact_id) || new Set();
          tags.add(tag);
          tagMap.set(tx.contact_id, tags);
        }
      }

      // Fetch contacts in batches
      let allContacts: any[] = [];
      const batchSize = 100;

      for (let i = 0; i < contactIds.length; i += batchSize) {
        const batchIds = contactIds.slice(i, i + batchSize);
        const { data: contactsData, error: contactsError } = await supabase
          .from('crm_contacts')
          .select('id, name, email, phone, total_revenue, recovery_stage_id, recovery_started_at, recovery_updated_at, last_activity_at')
          .eq('project_id', currentProject.id)
          .in('id', batchIds);

        if (contactsError) throw contactsError;
        if (contactsData) {
          allContacts = [...allContacts, ...contactsData];
        }
      }

      // Add tags to contacts
      return allContacts.map((c) => ({
        ...c,
        tags: Array.from(tagMap.get(c.id) || []),
      })) as RecoveryContact[];
    },
    enabled: !!currentProject?.id,
  });

  // Move contact to stage mutation
  const moveContact = useMutation({
    mutationFn: async ({ contactId, stageId }: { contactId: string; stageId: string | null }) => {
      // Check if target stage is "Recuperado" (is_recovered = true)
      const targetStage = stages.find(s => s.id === stageId);
      const isRecoveredStage = targetStage?.is_recovered === true;
      
      // Get current contact data to update tags
      const { data: currentContact } = await supabase
        .from('crm_contacts')
        .select('tags')
        .eq('id', contactId)
        .single();
      
      let updatedTags = currentContact?.tags || [];
      
      // If moving to recovered stage, add "Recuperado (manual)" tag
      if (isRecoveredStage && !updatedTags.includes('Recuperado (manual)') && !updatedTags.includes('Recuperado (auto)')) {
        updatedTags = [...updatedTags, 'Recuperado (manual)'];
      }
      
      const { error } = await supabase
        .from('crm_contacts')
        .update({
          recovery_stage_id: stageId,
          recovery_started_at: stageId ? new Date().toISOString() : null,
          recovery_updated_at: new Date().toISOString(),
          tags: updatedTags,
        })
        .eq('id', contactId);

      if (error) throw error;
      
      if (isRecoveredStage) {
        toast.success('Cliente marcado como recuperado!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-kanban-contacts', currentProject?.id] });
    },
    onError: (error) => {
      toast.error('Erro ao mover contato: ' + error.message);
    },
  });

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const query = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone?.includes(query)
    );
  }, [contacts, search]);

  // Group contacts by stage
  const contactsByStage = useMemo(() => {
    const grouped: Record<string, RecoveryContact[]> = { unassigned: [] };

    for (const stage of stages) {
      grouped[stage.id] = [];
    }

    for (const contact of filteredContacts) {
      if (contact.recovery_stage_id && grouped[contact.recovery_stage_id]) {
        grouped[contact.recovery_stage_id].push(contact);
      } else {
        grouped.unassigned.push(contact);
      }
    }

    return grouped;
  }, [filteredContacts, stages]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const contact = contacts.find((c) => c.id === event.active.id);
    if (contact) setActiveContact(contact);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContact(null);

    if (!over) return;

    const contactId = active.id as string;
    const overId = over.id as string;

    // Find the stage that contains the over element or is the over element itself
    let targetStageId: string | null = null;

    // Check if dropped on a stage directly
    const stageMatch = stages.find((s) => s.id === overId);
    if (stageMatch) {
      targetStageId = stageMatch.id;
    } else if (overId === 'unassigned') {
      targetStageId = null;
    } else {
      // Dropped on another contact - find which stage that contact is in
      const overContact = contacts.find((c) => c.id === overId);
      if (overContact) {
        targetStageId = overContact.recovery_stage_id;
      }
    }

    const contact = contacts.find((c) => c.id === contactId);
    if (contact && contact.recovery_stage_id !== targetStageId) {
      moveContact.mutate({ contactId, stageId: targetStageId });
    }
  };

  const isLoading = modulesLoading || stagesLoading || contactsLoading;

  // Check if CRM module is enabled
  if (!modulesLoading && !isModuleEnabled('crm')) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Módulo CRM não habilitado</CardTitle>
              <CardDescription>O módulo CRM não está habilitado para este projeto.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
      <AppHeader pageSubtitle="CRM - Recuperação Kanban" />

      <CRMSubNav 
        showSettings
        settingsPath="/crm/recovery/settings"
        rightContent={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => refetch()}
                    disabled={isLoading || isFetching}
                  >
                    <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Recarrega os dados do Kanban</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={() => navigateTo('crm/recovery')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </>
        }
      />

      <main className="flex-1 container px-6 pb-6 overflow-hidden flex flex-col min-h-0">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold">Kanban de Recuperação</h1>
          <p className="text-muted-foreground">Gerencie o fluxo de recuperação de clientes</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline" className="gap-1">
                <UserPlus className="h-3 w-3" />
                {contactsByStage.unassigned?.length || 0} não atribuídos
              </Badge>
            </div>

            {/* Kanban Board */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex-1 overflow-hidden min-h-0">
                <ScrollArea className="h-full w-full">
                  <div className="flex gap-4 pb-4 min-w-max h-full" style={{ minHeight: 'calc(100vh - 240px)' }}>
                    {/* Unassigned Column */}
                    <StageColumn
                      stage={{
                        id: 'unassigned',
                      name: 'Não Iniciados',
                      color: '#6b7280',
                      is_initial: false,
                      is_recovered: false,
                      is_lost: false,
                    }}
                    contacts={contactsByStage.unassigned || []}
                    onContactClick={(id) => navigateTo(`crm/contact/${id}`)}
                  />

                  {/* Stage Columns */}
                  {stages.map((stage) => (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      contacts={contactsByStage[stage.id] || []}
                      onContactClick={(id) => navigateTo(`crm/contact/${id}`)}
                    />
                  ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              <DragOverlay>
                {activeContact && <ContactCard contact={activeContact} onClick={() => {}} />}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </main>
    </div>
  );
}
