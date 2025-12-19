import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useAutomationFlows } from '@/hooks/useAutomationFlows';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Loader2, 
  Lock, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Play,
  Pause,
  Workflow,
  MoreVertical,
  Copy,
  Edit,
  FolderPlus,
  Folder,
  Search,
  Zap,
  MessageSquare,
  Clock,
  GitBranch,
  Activity
} from 'lucide-react';

import { ShoppingCart, Tag } from 'lucide-react';

const triggerTypes = [
  { value: 'keyword', label: 'Palavra-chave', icon: MessageSquare, description: 'Quando receber uma mensagem com palavra específica' },
  { value: 'first_contact', label: 'Primeiro contato', icon: Zap, description: 'Quando um contato enviar mensagem pela primeira vez' },
  { value: 'transaction_event', label: 'Evento de Transação', icon: ShoppingCart, description: 'Quando uma transação for criada ou atualizada' },
  { value: 'tag_added', label: 'Tag Adicionada', icon: Tag, description: 'Quando uma tag específica for adicionada ao contato' },
  { value: 'webhook', label: 'Webhook', icon: GitBranch, description: 'Quando receber dados de uma integração externa' },
  { value: 'schedule', label: 'Agendamento', icon: Clock, description: 'Executar em horários específicos' },
];

const transactionStatuses = [
  { value: 'APPROVED', label: 'Compra Aprovada' },
  { value: 'ABANDONED', label: 'Carrinho Abandonado' },
  { value: 'WAITING_PAYMENT', label: 'Aguardando Pagamento' },
  { value: 'REFUNDED', label: 'Reembolso' },
  { value: 'CHARGEBACK', label: 'Chargeback' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'OVERDUE', label: 'Pagamento Atrasado' },
  { value: 'EXPIRED', label: 'Pagamento Expirado' },
];

export default function AutomationFlows() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { 
    flows, 
    folders,
    isLoading: flowsLoading, 
    createFlow, 
    deleteFlow, 
    toggleFlow,
    duplicateFlow,
    createFolder 
  } = useAutomationFlows();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('keyword');
  const [keywords, setKeywords] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [triggerTags, setTriggerTags] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [folderName, setFolderName] = useState('');

  const automationEnabled = isModuleEnabled('automation');
  const isLoading = modulesLoading || flowsLoading;

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === null || flow.folder_id === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleCreate = async () => {
    if (!name.trim()) return;

    const triggerConfig: Record<string, any> = {};
    
    if (triggerType === 'keyword' && keywords.trim()) {
      triggerConfig.keywords = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    }
    
    if (triggerType === 'transaction_event' && selectedStatuses.length > 0) {
      triggerConfig.statuses = selectedStatuses;
    }
    
    if (triggerType === 'tag_added' && triggerTags.trim()) {
      triggerConfig.tags = triggerTags.split(',').map(t => t.trim()).filter(Boolean);
    }

    await createFlow.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      folder_id: folderId || undefined,
    });

    // Reset form
    setName('');
    setDescription('');
    setTriggerType('keyword');
    setKeywords('');
    setSelectedStatuses([]);
    setTriggerTags('');
    setFolderId('');
    setShowCreateDialog(false);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    await createFolder.mutateAsync(folderName.trim());
    setFolderName('');
    setShowFolderDialog(false);
  };

  const getTriggerInfo = (type: string) => {
    return triggerTypes.find(t => t.value === type) || triggerTypes[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Fluxos de Automação" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!automationEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Fluxos de Automação" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-muted">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Módulo de Automações</CardTitle>
                <CardDescription>Este módulo não está habilitado para o projeto atual.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Fluxos de Automação" />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Fluxos de Automação</h1>
            <p className="text-muted-foreground">
              Crie fluxos automatizados para WhatsApp com editor visual
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/automations/executions')}>
            <Activity className="h-4 w-4 mr-2" />
            Execuções
          </Button>
          <Button variant="outline" onClick={() => setShowFolderDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fluxo
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fluxos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={selectedFolder === null ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setSelectedFolder(null)}
            >
              Todos
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedFolder(folder.id)}
              >
                <Folder className="h-4 w-4 mr-1" />
                {folder.name}
              </Button>
            ))}
          </div>
        </div>

        {filteredFlows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhum fluxo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro fluxo de automação para começar
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Fluxo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFlows.map((flow) => {
              const triggerInfo = getTriggerInfo(flow.trigger_type);
              const TriggerIcon = triggerInfo.icon;
              
              return (
                <Card 
                  key={flow.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/automations/${flow.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${flow.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          <Workflow className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base line-clamp-1">{flow.name}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TriggerIcon className="h-3 w-3" />
                            {triggerInfo.label}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/automations/${flow.id}`); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateFlow.mutate(flow.id); }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteFlow.mutate(flow.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {flow.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {flow.description}
                      </p>
                    )}
                    
                    {flow.trigger_type === 'keyword' && flow.trigger_config?.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(flow.trigger_config.keywords as string[]).slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {(flow.trigger_config.keywords as string[]).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(flow.trigger_config.keywords as string[]).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {flow.trigger_type === 'transaction_event' && flow.trigger_config?.statuses?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(flow.trigger_config.statuses as string[]).slice(0, 3).map((status, i) => {
                          const statusInfo = transactionStatuses.find(s => s.value === status);
                          return (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {statusInfo?.label || status}
                            </Badge>
                          );
                        })}
                        {(flow.trigger_config.statuses as string[]).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(flow.trigger_config.statuses as string[]).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {flow.trigger_type === 'tag_added' && flow.trigger_config?.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(flow.trigger_config.tags as string[]).slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {(flow.trigger_config.tags as string[]).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(flow.trigger_config.tags as string[]).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {flow.is_active ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Play className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Pause className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={flow.is_active}
                        onCheckedChange={(checked) => {
                          toggleFlow.mutate({ flowId: flow.id, isActive: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Flow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Fluxo de Automação</DialogTitle>
            <DialogDescription>
              Configure as informações básicas do fluxo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Fluxo *</Label>
              <Input
                placeholder="Ex: Boas-vindas Novos Leads"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo deste fluxo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        <div>
                          <div>{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {triggerType === 'keyword' && (
              <div className="space-y-2">
                <Label>Palavras-chave</Label>
                <Input
                  placeholder="Ex: oi, olá, quero saber mais"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separe as palavras-chave por vírgula
                </p>
              </div>
            )}

            {triggerType === 'transaction_event' && (
              <div className="space-y-2">
                <Label>Status da Transação</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                  {transactionStatuses.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status.value]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione os status que dispararão o fluxo. Variáveis disponíveis: {"{{produto}}"}, {"{{oferta}}"}, {"{{valor}}"}, {"{{status}}"}
                </p>
              </div>
            )}

            {triggerType === 'tag_added' && (
              <div className="space-y-2">
                <Label>Tags que disparam o fluxo</Label>
                <Input
                  placeholder="Ex: abandonou:, comprou:, VIP"
                  value={triggerTags}
                  onChange={(e) => setTriggerTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separe por vírgula. Use prefixos como "abandonou:" para capturar tags contextuais. Deixe vazio para qualquer tag.
                </p>
              </div>
            )}

            {folders.length > 0 && (
              <div className="space-y-2">
                <Label>Pasta (opcional)</Label>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma pasta</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          {f.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createFlow.isPending || !name.trim()}>
              {createFlow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Fluxo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>
              Organize seus fluxos em pastas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Nome da Pasta</Label>
            <Input
              placeholder="Ex: Vendas"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder} disabled={createFolder.isPending || !folderName.trim()}>
              {createFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Pasta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
