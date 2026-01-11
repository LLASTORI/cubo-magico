import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useCRMContact } from '@/hooks/useCRMContact';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { useCRMContactJourney } from '@/hooks/useCRMContactJourney';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  Clock,
  Plus,
  Check,
  Trash2,
  Loader2,
  ExternalLink,
  Instagram,
  MessageCircle,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { ContactActivitiesList } from '@/components/crm/ContactActivitiesList';
import { ContactTransactionsList } from '@/components/crm/ContactTransactionsList';
import { ContactWhatsAppHistory } from '@/components/crm/ContactWhatsAppHistory';
import { CreateActivityDialog } from '@/components/crm/CreateActivityDialog';
import { EditContactDialog } from '@/components/crm/EditContactDialog';
import { ContactAttributionCard } from '@/components/crm/ContactAttributionCard';
import { ContactSegmentInsights } from '@/components/crm/ContactSegmentInsights';
import { ContactIdentityTab } from '@/components/crm/ContactIdentityTab';
import { ContactSurveysTab } from '@/components/crm/ContactSurveysTab';
import { ContactSocialTab } from '@/components/crm/ContactSocialTab';
import { ContactQuizzesTab } from '@/components/crm/ContactQuizzesTab';
import { ContactCognitiveProfile } from '@/components/crm/ContactCognitiveProfile';
import { ContactAIRecommendations } from '@/components/crm/ContactAIRecommendations';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { getFullPhoneNumber } from '@/components/ui/international-phone-input';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export default function CRMContactCard() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { contact, isLoading, updateContact, updateNotes, addTag, removeTag, updatePipelineStage, deleteContact } = useCRMContact(contactId);
  const { stages } = usePipelineStages();
  const { segmentInsights, isLoadingInsights } = useCRMContactJourney(contactId, currentProject?.id);
  const { numbers, getPrimaryNumber } = useWhatsAppNumbers();
  const { conversations } = useWhatsAppConversations();
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Verifica se contato tem número de telefone válido para WhatsApp
  const hasWhatsAppNumber = !!(contact?.phone && (contact.phone_country_code || '55') && (contact.phone_ddd || '').length >= 0 && contact.phone.length >= 8);
  
  // Verifica se já existe conversa com este contato
  const existingConversation = conversations?.find(c => c.contact_id === contactId);
  
  // Obter número ativo (com failover)
  const getActiveNumber = () => {
    if (!numbers || numbers.length === 0) return null;
    
    // Ordenar por prioridade e pegar o primeiro conectado
    const sortedNumbers = [...numbers].sort((a, b) => a.priority - b.priority);
    
    for (const num of sortedNumbers) {
      if (num.instance?.status === 'connected' && num.status === 'active') {
        return num;
      }
    }
    
    // Se nenhum conectado, retornar o primeiro ativo
    return sortedNumbers.find(n => n.status === 'active') || null;
  };

  const activeNumber = getActiveNumber();
  const canStartWhatsApp = hasWhatsAppNumber && activeNumber;

  // Função para iniciar/abrir conversa WhatsApp
  const handleOpenWhatsApp = async () => {
    if (!contact || !contactId || !currentProject?.id) return;
    
    // Se já existe conversa, navegar direto para ela
    if (existingConversation) {
      navigate(`/whatsapp?conversation=${existingConversation.id}`);
      return;
    }

    // Se não existe, criar nova conversa
    setIsStartingChat(true);
    try {
      const phoneNumber = getFullPhoneNumber(
        contact.phone_country_code || '55',
        contact.phone_ddd || '',
        contact.phone || ''
      );
      
      const remoteJid = `${phoneNumber}@s.whatsapp.net`;

      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          project_id: currentProject.id,
          contact_id: contactId,
          remote_jid: remoteJid,
          whatsapp_number_id: activeNumber?.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Navegar para a conversa recém-criada
      navigate(`/whatsapp?conversation=${data.id}`);
    } catch (error: any) {
      console.error('Erro ao iniciar conversa:', error);
    } finally {
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    if (contact?.notes) {
      setNotes(contact.notes);
    }
  }, [contact?.notes]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesChanged(value !== (contact?.notes || ''));
  };

  const handleSaveNotes = () => {
    updateNotes.mutate(notes);
    setNotesChanged(false);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag.mutate(newTag.trim());
      setNewTag('');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatPhone = (ddd: string | null, phone: string | null) => {
    if (!phone) return '-';
    const fullPhone = ddd ? `(${ddd}) ${phone}` : phone;
    return fullPhone;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Carregando..." />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Contato não encontrado" />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Contato não encontrado</p>
              <Button onClick={() => navigate('/crm')} className="mt-4">
                Voltar ao CRM
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const currentStage = stages.find(s => s.id === contact.pipeline_stage_id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Cartão do Lead" />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header with Back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Avatar */}
          {contact.avatar_url ? (
            <img 
              src={contact.avatar_url} 
              alt={contact.name || 'Contato'}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-medium">
              {(contact.name || contact.email).charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{contact.name || contact.email}</h1>
            <p className="text-muted-foreground">{contact.email}</p>
          </div>
          <Badge variant={contact.status === 'customer' ? 'default' : 'secondary'}>
            {contact.status === 'customer' ? 'Cliente' : contact.status === 'prospect' ? 'Prospecto' : 'Lead'}
          </Badge>

          {/* Botão Editar */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>

          {/* Botão WhatsApp */}
          {canStartWhatsApp && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={handleOpenWhatsApp}
              disabled={isStartingChat}
            >
              {isStartingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              {existingConversation ? 'Abrir Chat' : 'Iniciar Chat'}
            </Button>
          )}
          
          {/* Only show delete button if not a customer */}
          {contact.status !== 'customer' && !(contact.tags || []).includes('Cliente') ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O contato "{contact.name || contact.email}" 
                    e todos os dados relacionados serão excluídos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteContact.mutate(undefined, {
                        onSuccess: () => navigate('/crm/kanban')
                      });
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteContact.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Excluir'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Protegido
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pipeline Stage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Etapa do Funil</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={contact.pipeline_stage_id || 'none'} 
                  onValueChange={(value) => updatePipelineStage.mutate(value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa">
                      {currentStage ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: currentStage.color }}
                          />
                          {currentStage.name}
                        </div>
                      ) : (
                        'Sem etapa definida'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem etapa</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Tabs for Activities, Transactions, WhatsApp, Notes, Identity, Surveys, Social */}
            <Tabs defaultValue="activities">
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="activities">Atividades</TabsTrigger>
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="identity">Identidade</TabsTrigger>
                <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                <TabsTrigger value="surveys">Pesquisas</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="notes">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Atividades</CardTitle>
                      <Button size="sm" onClick={() => setShowActivityDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Atividade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ContactActivitiesList contactId={contactId!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Histórico de Transações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ContactTransactionsList contactId={contactId!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="whatsapp" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Histórico de WhatsApp
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ContactWhatsAppHistory contactId={contactId!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="identity" className="mt-4">
                <ContactIdentityTab contactId={contactId!} />
              </TabsContent>

              <TabsContent value="surveys" className="mt-4">
                <ContactSurveysTab contactId={contactId!} />
              </TabsContent>

              <TabsContent value="quizzes" className="mt-4">
                <ContactQuizzesTab contactId={contactId!} />
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <ContactSocialTab contactId={contactId!} />
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Anotações</CardTitle>
                      {notesChanged && (
                        <Button size="sm" onClick={handleSaveNotes} disabled={updateNotes.isPending}>
                          {updateNotes.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Salvar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Adicione notas sobre este contato..."
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Contact Details */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações de Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPhone(contact.phone_ddd, contact.phone)}</span>
                </div>
                {contact.instagram && (
                  <div className="flex items-center gap-2 text-sm">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`https://instagram.com/${contact.instagram.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {contact.instagram}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {(contact.city || contact.state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[contact.city, contact.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cognitive Profile */}
            <ContactCognitiveProfile contactId={contactId!} />

            {/* Financial Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de compras:</span>
                  <span className="font-medium">{contact.total_purchases || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Receita total:</span>
                  <span className="font-medium text-green-600">{formatCurrency(contact.total_revenue)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Primeira compra:</span>
                  <span>{contact.first_purchase_at ? format(new Date(contact.first_purchase_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Última compra:</span>
                  <span>{contact.last_purchase_at ? format(new Date(contact.last_purchase_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(contact.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button 
                        onClick={() => removeTag.mutate(tag)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {(!contact.tags || contact.tags.length === 0) && (
                    <span className="text-sm text-muted-foreground">Nenhuma tag</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1"
                  />
                  <Button size="icon" variant="secondary" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Origem:</span>
                  <Badge variant="outline">{contact.source}</Badge>
                </div>
                {contact.first_page_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Página de entrada:</span>
                    <span className="truncate max-w-[150px]" title={contact.first_page_name}>
                      {contact.first_page_name}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Primeiro contato:</span>
                  <span>{formatDate(contact.first_seen_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Última atividade:</span>
                  <span>{formatDate(contact.last_activity_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* UTM Attribution - Expanded */}
            <ContactAttributionCard contact={contact} />

            {/* AI Recommendations */}
            <ContactAIRecommendations contactId={contactId!} />

            {/* Segment Insights */}
            <ContactSegmentInsights 
              insights={segmentInsights}
              isLoading={isLoadingInsights}
              contactLTV={contact.total_revenue || 0}
              contactPurchases={contact.total_purchases || 0}
            />
          </div>
        </div>
      </main>

      <CreateActivityDialog 
        open={showActivityDialog} 
        onOpenChange={setShowActivityDialog}
        contactId={contactId!}
      />

      {contact && (
        <EditContactDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          contact={contact}
          onSave={(data) => {
            updateContact.mutate(data, {
              onSuccess: () => {
                setShowEditDialog(false);
              }
            });
          }}
          isPending={updateContact.isPending}
        />
      )}
    </div>
  );
}
