import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useCRMContact } from '@/hooks/useCRMContact';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Instagram
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { ContactActivitiesList } from '@/components/crm/ContactActivitiesList';
import { ContactTransactionsList } from '@/components/crm/ContactTransactionsList';
import { CreateActivityDialog } from '@/components/crm/CreateActivityDialog';

export default function CRMContactCard() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { contact, isLoading, updateContact, updateNotes, addTag, removeTag, updatePipelineStage, deleteContact } = useCRMContact(contactId);
  const { stages } = usePipelineStages();
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm/kanban')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{contact.name || contact.email}</h1>
            <p className="text-muted-foreground">{contact.email}</p>
          </div>
          <Badge variant={contact.status === 'customer' ? 'default' : 'secondary'}>
            {contact.status === 'customer' ? 'Cliente' : contact.status === 'prospect' ? 'Prospecto' : 'Lead'}
          </Badge>
          
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

            {/* Tabs for Activities, Transactions, Notes */}
            <Tabs defaultValue="activities">
              <TabsList className="w-full">
                <TabsTrigger value="activities" className="flex-1">Atividades</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1">Transações</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Anotações</TabsTrigger>
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

            {/* UTM Info */}
            {(contact.first_utm_source || contact.first_utm_campaign) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Atribuição
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {contact.first_utm_source && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="truncate max-w-[150px]">{contact.first_utm_source}</span>
                    </div>
                  )}
                  {contact.first_utm_campaign && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign:</span>
                      <span className="truncate max-w-[150px]">{contact.first_utm_campaign}</span>
                    </div>
                  )}
                  {contact.first_utm_medium && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Medium:</span>
                      <span className="truncate max-w-[150px]">{contact.first_utm_medium}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <CreateActivityDialog 
        open={showActivityDialog} 
        onOpenChange={setShowActivityDialog}
        contactId={contactId!}
      />
    </div>
  );
}
