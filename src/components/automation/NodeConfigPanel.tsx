import { useState, useEffect, useRef } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Save, Trash2, MessageSquare, Clock, GitBranch, Tag, Image, Globe, GitFork, MessageCircle, Users, ListOrdered, Plus, X, Upload, Loader2, FileImage, FileVideo, FileAudio, FileText, FolderOpen } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useProject } from '@/contexts/ProjectContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAutomationMedia, getMediaTypeFromMime, formatFileSize } from '@/hooks/useAutomationMedia';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface NodeConfigPanelProps {
  node: Node | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: Record<string, any>) => void;
  onDelete: () => void;
}

const nodeIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-5 w-5" />,
  delay: <Clock className="h-5 w-5" />,
  condition: <GitBranch className="h-5 w-5" />,
  action: <Tag className="h-5 w-5" />,
  media: <Image className="h-5 w-5" />,
  http_request: <Globe className="h-5 w-5" />,
  split: <GitFork className="h-5 w-5" />,
  wait_reply: <MessageCircle className="h-5 w-5" />,
  tag: <Tag className="h-5 w-5" />,
  menu: <ListOrdered className="h-5 w-5" />,
};

const nodeLabels: Record<string, string> = {
  start: 'Início',
  message: 'Mensagem',
  delay: 'Espera',
  condition: 'Condição',
  action: 'Ação CRM',
  media: 'Mídia',
  http_request: 'HTTP Request',
  split: 'Split Test',
  wait_reply: 'Aguardar Resposta',
  tag: 'Tag Rápida',
  menu: 'Menu de Escolhas',
};

export function NodeConfigPanel({ node, open, onOpenChange, onSave, onDelete }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (node) {
      setConfig(node.data || {});
    }
  }, [node]);

  if (!node) return null;

  const nodeType = node.data?.type as string;

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {nodeIcons[nodeType]}
            Configurar {nodeLabels[nodeType] || 'Nó'}
          </SheetTitle>
          <SheetDescription>
            Configure as propriedades deste componente
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6 -mr-4 pr-4">
          <div className="space-y-6 pb-4">
            {/* Message Node */}
            {nodeType === 'message' && (
              <MessageNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Delay Node */}
            {nodeType === 'delay' && (
              <DelayNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Condition Node */}
            {nodeType === 'condition' && (
              <ConditionNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Action Node */}
            {nodeType === 'action' && (
              <ActionNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Media Node */}
            {nodeType === 'media' && (
              <MediaNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* HTTP Request Node */}
            {nodeType === 'http_request' && (
              <HttpRequestNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Split Test Node */}
            {nodeType === 'split' && (
              <SplitNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Wait Reply Node */}
            {nodeType === 'wait_reply' && (
              <WaitReplyNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Tag Node */}
            {nodeType === 'tag' && (
              <TagNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Menu Node */}
            {nodeType === 'menu' && (
              <MenuNodeConfig config={config} setConfig={setConfig} />
            )}

            {/* Start Node */}
            {nodeType === 'start' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  As configurações de gatilho são definidas nas propriedades do fluxo.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions - Fixed at bottom */}
        <div className="flex gap-2 pt-4 border-t mt-auto">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          {nodeType !== 'start' && (
            <Button variant="destructive" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Message Config
function MessageNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const contactVariables = [
    { key: '{{nome}}', label: 'Nome Completo' },
    { key: '{{primeiro_nome}}', label: 'Primeiro Nome' },
    { key: '{{sobrenome}}', label: 'Sobrenome' },
    { key: '{{email}}', label: 'Email' },
    { key: '{{telefone}}', label: 'Telefone' },
    { key: '{{cidade}}', label: 'Cidade' },
    { key: '{{estado}}', label: 'Estado' },
    { key: '{{pais}}', label: 'País' },
    { key: '{{documento}}', label: 'Documento' },
    { key: '{{instagram}}', label: 'Instagram' },
    { key: '{{status}}', label: 'Status' },
    { key: '{{total_compras}}', label: 'Total Compras' },
    { key: '{{receita_total}}', label: 'Receita Total' },
    { key: '{{tags}}', label: 'Tags' },
    { key: '{{utm_source}}', label: 'UTM Source' },
    { key: '{{utm_campaign}}', label: 'UTM Campaign' },
    { key: '{{notas}}', label: 'Notas' },
  ];

  const insertVariable = (variable: string) => {
    const currentValue = config.content || '';
    setConfig({ ...config, content: currentValue + ' ' + variable });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          className="min-h-[150px] resize-none"
          placeholder="Digite a mensagem que será enviada..."
          value={config.content || ''}
          onChange={(e) => setConfig({ ...config, content: e.target.value })}
        />
      </div>
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <p className="text-xs font-medium">Variáveis do contato:</p>
        <ScrollArea className="h-[80px]">
          <div className="flex flex-wrap gap-1.5">
            {contactVariables.map((v) => (
              <code
                key={v.key}
                onClick={() => insertVariable(v.key)}
                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-pointer hover:bg-primary/20"
                title={v.label}
              >
                {v.key}
              </code>
            ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">Clique para inserir</p>
      </div>
    </div>
  );
}

// Delay Config
function DelayNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const [delayType, setDelayType] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [delayValue, setDelayValue] = useState(config.delay_minutes || 5);

  useEffect(() => {
    const mins = config.delay_minutes || 0;
    if (mins >= 1440) {
      setDelayType('days');
      setDelayValue(Math.floor(mins / 1440));
    } else if (mins >= 60) {
      setDelayType('hours');
      setDelayValue(Math.floor(mins / 60));
    } else {
      setDelayType('minutes');
      setDelayValue(mins || 5);
    }
  }, []);

  const handleChange = (value: number, type: 'minutes' | 'hours' | 'days') => {
    setDelayValue(value);
    setDelayType(type);
    
    let minutes = value;
    if (type === 'hours') minutes = value * 60;
    if (type === 'days') minutes = value * 1440;
    
    setConfig({ ...config, delay_minutes: minutes });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Unidade de tempo</Label>
        <Select value={delayType} onValueChange={(v: any) => handleChange(delayValue, v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutos</SelectItem>
            <SelectItem value="hours">Horas</SelectItem>
            <SelectItem value="days">Dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-4">
        <Label>Quantidade: {delayValue} {delayType === 'minutes' ? 'min' : delayType === 'hours' ? 'h' : 'd'}</Label>
        <Slider
          value={[delayValue]}
          onValueChange={([v]) => handleChange(v, delayType)}
          min={1}
          max={delayType === 'minutes' ? 60 : delayType === 'hours' ? 24 : 30}
          step={1}
        />
      </div>
    </div>
  );
}

// Condition Config
function ConditionNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const { currentProject } = useProject();
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Fetch unique tags from contacts when "tags" field is selected
  useEffect(() => {
    const fetchTags = async () => {
      if (config.field !== 'tags' || !currentProject?.id) return;
      
      setLoadingTags(true);
      try {
        const { data: contacts } = await supabase
          .from('crm_contacts')
          .select('tags')
          .eq('project_id', currentProject.id)
          .not('tags', 'is', null);
        
        if (contacts) {
          const allTags = contacts.flatMap((c) => (c.tags as string[]) || []);
          const uniqueTags = [...new Set(allTags)].filter(Boolean).sort() as string[];
          setAvailableTags(uniqueTags);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, [config.field, currentProject?.id]);

  // Show tags as selectable options when field is "tags"
  const showTagSelector = config.field === 'tags' && !['is_empty', 'is_not_empty'].includes(config.operator);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Campo a verificar</Label>
        <Select value={config.field || ''} onValueChange={(v) => setConfig({ ...config, field: v, value: '' })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tags">Tags</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="city">Cidade</SelectItem>
            <SelectItem value="state">Estado</SelectItem>
            <SelectItem value="country">País</SelectItem>
            <SelectItem value="source">Origem</SelectItem>
            <SelectItem value="total_purchases">Total de compras</SelectItem>
            <SelectItem value="total_revenue">Receita total</SelectItem>
            <SelectItem value="pipeline_stage">Etapa do pipeline</SelectItem>
            <SelectItem value="subscription_status">Status de assinatura</SelectItem>
            <SelectItem value="has_pending_payment">Tem pagamento pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Operador</Label>
        <Select value={config.operator || 'equals'} onValueChange={(v) => setConfig({ ...config, operator: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="not_equals">Diferente de</SelectItem>
            <SelectItem value="contains">Contém</SelectItem>
            <SelectItem value="not_contains">Não contém</SelectItem>
            <SelectItem value="greater_than">Maior que</SelectItem>
            <SelectItem value="less_than">Menor que</SelectItem>
            <SelectItem value="is_empty">É vazio</SelectItem>
            <SelectItem value="is_not_empty">Não é vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!['is_empty', 'is_not_empty'].includes(config.operator) && (
        <div className="space-y-2">
          <Label>Valor</Label>
          {showTagSelector ? (
            <div className="space-y-2">
              <Select value={config.value || ''} onValueChange={(v) => setConfig({ ...config, value: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingTags ? 'Carregando tags...' : 'Selecione uma tag'} />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      {loadingTags ? 'Carregando...' : 'Nenhuma tag encontrada'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Input
                placeholder="Ou digite manualmente..."
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
              />
            </div>
          ) : (
            <Input
              placeholder="Valor para comparar"
              value={config.value || ''}
              onChange={(e) => setConfig({ ...config, value: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
}


// Action Config
function ActionNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const { currentProject } = useProject();
  const { members, loading: membersLoading } = useProjectMembers(currentProject?.id || null);
  
  // Contact field variables for templates
  const contactVariables = [
    { key: '{{nome}}', label: 'Nome Completo' },
    { key: '{{primeiro_nome}}', label: 'Primeiro Nome' },
    { key: '{{sobrenome}}', label: 'Sobrenome' },
    { key: '{{email}}', label: 'Email' },
    { key: '{{telefone}}', label: 'Telefone' },
    { key: '{{cidade}}', label: 'Cidade' },
    { key: '{{estado}}', label: 'Estado' },
    { key: '{{pais}}', label: 'País' },
    { key: '{{cep}}', label: 'CEP' },
    { key: '{{documento}}', label: 'Documento' },
    { key: '{{instagram}}', label: 'Instagram' },
    { key: '{{status}}', label: 'Status' },
    { key: '{{total_compras}}', label: 'Total Compras' },
    { key: '{{receita_total}}', label: 'Receita Total' },
    { key: '{{tags}}', label: 'Tags' },
    { key: '{{utm_source}}', label: 'UTM Source' },
    { key: '{{utm_campaign}}', label: 'UTM Campaign' },
    { key: '{{utm_medium}}', label: 'UTM Medium' },
    { key: '{{primeira_compra}}', label: 'Data Primeira Compra' },
    { key: '{{ultima_compra}}', label: 'Data Última Compra' },
    { key: '{{notas}}', label: 'Notas' },
  ];

  const handleToggleMember = (memberId: string) => {
    const currentMembers = config.notify_members || [];
    if (currentMembers.includes(memberId)) {
      setConfig({ 
        ...config, 
        notify_members: currentMembers.filter((id: string) => id !== memberId) 
      });
    } else {
      setConfig({ 
        ...config, 
        notify_members: [...currentMembers, memberId] 
      });
    }
  };

  const handleSelectAllMembers = () => {
    const allMemberIds = members.map(m => m.user_id);
    setConfig({ ...config, notify_members: allMemberIds });
  };

  const handleClearMembers = () => {
    setConfig({ ...config, notify_members: [] });
  };

  const insertVariable = (variable: string) => {
    const currentValue = config.action_value || '';
    setConfig({ ...config, action_value: currentValue + ' ' + variable });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de ação</Label>
        <Select value={config.action_type || ''} onValueChange={(v) => setConfig({ ...config, action_type: v, notify_members: [], action_value: '' })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add_tag">Adicionar tag</SelectItem>
            <SelectItem value="remove_tag">Remover tag</SelectItem>
            <SelectItem value="change_stage">Mudar etapa do pipeline</SelectItem>
            <SelectItem value="change_recovery_stage">Mudar etapa de recuperação</SelectItem>
            <SelectItem value="notify_team">Notificar membro(s)</SelectItem>
            <SelectItem value="update_contact">Atualizar campo do contato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notify Team - Member Selection */}
      {config.action_type === 'notify_team' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Selecionar membros
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllMembers}>
                  Todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearMembers}>
                  Limpar
                </Button>
              </div>
            </div>
            
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Carregando membros...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
            ) : (
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.user_id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleMember(member.user_id)}
                    >
                      <Checkbox 
                        checked={(config.notify_members || []).includes(member.user_id)}
                        onCheckedChange={() => handleToggleMember(member.user_id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || member.profile?.email || 'Usuário'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile?.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {member.role === 'owner' ? 'Dono' : member.role === 'manager' ? 'Gerente' : 'Operador'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {(config.notify_members || []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                {(config.notify_members || []).length} membro(s) selecionado(s)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mensagem da notificação</Label>
            <Textarea
              className="min-h-[120px] resize-none"
              placeholder="Digite a mensagem para notificar os membros selecionados..."
              value={config.action_value || ''}
              onChange={(e) => setConfig({ ...config, action_value: e.target.value })}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-medium">Variáveis do contato:</p>
            <ScrollArea className="h-[100px]">
              <div className="flex flex-wrap gap-1.5">
                {contactVariables.map((v) => (
                  <code
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-pointer hover:bg-primary/20"
                    title={v.label}
                  >
                    {v.key}
                  </code>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-2">
              Clique para inserir variáveis na mensagem
            </p>
          </div>
        </div>
      )}

      {/* Other action types */}
      {config.action_type && config.action_type !== 'notify_team' && (
        <div className="space-y-2">
          <Label>
            {config.action_type?.includes('tag') ? 'Nome da tag' : 
             config.action_type?.includes('stage') ? 'ID da etapa' : 'Valor'}
          </Label>
          <Input
            placeholder={
              config.action_type?.includes('tag') ? 'Ex: lead-quente' : 
              config.action_type?.includes('stage') ? 'ID da etapa' : 
              'Digite o valor'
            }
            value={config.action_value || ''}
            onChange={(e) => setConfig({ ...config, action_value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// Media Config
function MediaNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mediaList, isLoading, uploadMedia, deleteMedia, maxFileSize, allowedTypes } = useAutomationMedia();
  const [activeTab, setActiveTab] = useState<string>(config.media_url ? 'url' : 'upload');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadMedia.mutateAsync(file);
    if (result) {
      setConfig({ 
        ...config, 
        media_url: result.public_url,
        media_type: getMediaTypeFromMime(result.mime_type),
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFromLibrary = (media: typeof mediaList[0]) => {
    setConfig({
      ...config,
      media_url: media.public_url,
      media_type: getMediaTypeFromMime(media.mime_type),
    });
  };

  const getMediaIcon = (mimeType: string) => {
    const type = getMediaTypeFromMime(mimeType);
    switch (type) {
      case 'image': return <FileImage className="h-4 w-4" />;
      case 'video': return <FileVideo className="h-4 w-4" />;
      case 'audio': return <FileAudio className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de mídia</Label>
        <Select value={config.media_type || 'image'} onValueChange={(v) => setConfig({ ...config, media_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Imagem</SelectItem>
            <SelectItem value="audio">Áudio</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="document">Documento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-3">
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            {uploadMedia.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Clique para enviar</p>
                <p className="text-xs text-muted-foreground">
                  Máx. {maxFileSize / 1024 / 1024}MB • JPG, PNG, GIF, MP4, MP3, PDF
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : mediaList.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma mídia na biblioteca</p>
              <p className="text-xs">Faça upload para começar</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 gap-2">
                {mediaList.map((media) => (
                  <div
                    key={media.id}
                    className={`
                      group relative p-2 border rounded-lg transition-all
                      ${config.media_url === media.public_url 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'}
                    `}
                  >
                    <div 
                      onClick={() => handleSelectFromLibrary(media)}
                      className="cursor-pointer"
                    >
                      {getMediaTypeFromMime(media.mime_type) === 'image' ? (
                        <img 
                          src={media.public_url} 
                          alt={media.file_name}
                          className="w-full h-16 object-cover rounded mb-1"
                        />
                      ) : (
                        <div className="w-full h-16 bg-muted rounded mb-1 flex items-center justify-center">
                          {getMediaIcon(media.mime_type)}
                        </div>
                      )}
                      <p className="text-xs truncate">{media.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(media.file_size)}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Excluir esta mídia?')) {
                          deleteMedia.mutate(media);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-3">
          <div className="space-y-2">
            <Label>URL da mídia</Label>
            <Input
              placeholder="https://..."
              value={config.media_url || ''}
              onChange={(e) => setConfig({ ...config, media_url: e.target.value })}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {config.media_url && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="border rounded-lg p-2">
            {config.media_type === 'image' ? (
              <img 
                src={config.media_url} 
                alt="Preview" 
                className="max-h-32 mx-auto rounded"
              />
            ) : config.media_type === 'video' ? (
              <video 
                src={config.media_url} 
                controls 
                className="max-h-32 mx-auto rounded"
              />
            ) : config.media_type === 'audio' ? (
              <audio src={config.media_url} controls className="w-full" />
            ) : (
              <div className="flex items-center gap-2 justify-center py-2">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Documento</span>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-destructive"
            onClick={() => setConfig({ ...config, media_url: '' })}
          >
            Remover mídia
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label>Legenda (opcional)</Label>
        <Textarea
          placeholder="Descrição da mídia..."
          value={config.caption || ''}
          onChange={(e) => setConfig({ ...config, caption: e.target.value })}
          className="min-h-[60px]"
        />
      </div>
    </div>
  );
}

// HTTP Request Config
function HttpRequestNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Método HTTP</Label>
        <Select value={config.method || 'GET'} onValueChange={(v) => setConfig({ ...config, method: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>URL</Label>
        <Input
          placeholder="https://api.exemplo.com/endpoint"
          value={config.url || ''}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Headers (JSON)</Label>
        <Textarea
          placeholder='{"Authorization": "Bearer token"}'
          value={config.headers || ''}
          onChange={(e) => setConfig({ ...config, headers: e.target.value })}
          className="min-h-[60px] font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label>Body (JSON)</Label>
        <Textarea
          placeholder='{"key": "value"}'
          value={config.body || ''}
          onChange={(e) => setConfig({ ...config, body: e.target.value })}
          className="min-h-[80px] font-mono text-xs"
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <p className="text-xs font-medium">Variáveis do contato:</p>
        <div className="flex flex-wrap gap-1.5">
          {['{{nome}}', '{{email}}', '{{telefone}}', '{{cidade}}', '{{estado}}', '{{documento}}'].map((v) => (
            <code
              key={v}
              onClick={() => setConfig({ ...config, body: (config.body || '') + ' ' + v })}
              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-pointer hover:bg-primary/20"
            >
              {v}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
// Split Test Config (Randomizar)
function SplitNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const defaultVariants = [
    { name: 'A', percentage: 50 },
    { name: 'B', percentage: 50 }
  ];
  
  const variants = config.variants || defaultVariants;
  const variantNames = ['A', 'B', 'C', 'D', 'E'];
  const variantColors = ['text-green-600', 'text-blue-600', 'text-purple-600', 'text-orange-600', 'text-pink-600'];
  
  const totalPercentage = variants.reduce((sum: number, v: { percentage: number }) => sum + v.percentage, 0);
  const isValid = totalPercentage === 100;

  const handleAddVariant = () => {
    if (variants.length < 5) {
      const newVariants = [...variants];
      const newName = variantNames[newVariants.length];
      // Redistribute percentages evenly
      const evenPercentage = Math.floor(100 / (newVariants.length + 1));
      const remainder = 100 - (evenPercentage * (newVariants.length + 1));
      
      newVariants.forEach((v: { name: string; percentage: number }, i: number) => {
        v.percentage = evenPercentage + (i === 0 ? remainder : 0);
      });
      newVariants.push({ name: newName, percentage: evenPercentage });
      
      setConfig({ ...config, variants: newVariants });
    }
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 2) {
      const newVariants = variants.filter((_: any, i: number) => i !== index);
      // Rename variants sequentially
      newVariants.forEach((v: { name: string; percentage: number }, i: number) => {
        v.name = variantNames[i];
      });
      // Redistribute removed percentage
      const removedPercentage = variants[index].percentage;
      const perVariant = Math.floor(removedPercentage / newVariants.length);
      const remainder = removedPercentage - (perVariant * newVariants.length);
      newVariants.forEach((v: { name: string; percentage: number }, i: number) => {
        v.percentage += perVariant + (i === 0 ? remainder : 0);
      });
      setConfig({ ...config, variants: newVariants });
    }
  };

  const handlePercentageChange = (index: number, value: number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], percentage: value };
    setConfig({ ...config, variants: newVariants });
  };

  const handleDistributeEvenly = () => {
    const count = variants.length;
    const evenPercentage = Math.floor(100 / count);
    const remainder = 100 - (evenPercentage * count);
    
    const newVariants = variants.map((v: { name: string; percentage: number }, i: number) => ({
      ...v,
      percentage: evenPercentage + (i === 0 ? remainder : 0)
    }));
    setConfig({ ...config, variants: newVariants });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Variantes ({variants.length}/5)</Label>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleDistributeEvenly}
          >
            Distribuir igual
          </Button>
          {variants.length < 5 && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddVariant}
            >
              + Variante
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {variants.map((variant: { name: string; percentage: number }, index: number) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className={`font-bold ${variantColors[index]}`}>
              {variant.name}
            </span>
            <div className="flex-1">
              <Slider
                value={[variant.percentage]}
                onValueChange={([v]) => handlePercentageChange(index, v)}
                min={5}
                max={95}
                step={5}
              />
            </div>
            <span className="w-12 text-right text-sm font-medium">
              {variant.percentage}%
            </span>
            {variants.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => handleRemoveVariant(index)}
              >
                ×
              </Button>
            )}
          </div>
        ))}
      </div>

      {!isValid && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-xs text-destructive font-medium">
            Total: {totalPercentage}% — deve ser exatamente 100%
          </p>
        </div>
      )}

      {isValid && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-green-600 font-medium">
            ✓ Distribuição válida (100%)
          </p>
        </div>
      )}

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Conecte cada saída a diferentes caminhos do fluxo para testar variações. 
          Os contatos serão distribuídos aleatoriamente conforme as porcentagens definidas.
        </p>
      </div>
    </div>
  );
}

// Wait Reply Config
function WaitReplyNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tempo de espera</Label>
        <Input
          type="number"
          min={1}
          placeholder="Ex: 30"
          value={config.timeout || ''}
          onChange={(e) => setConfig({ ...config, timeout: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Unidade</Label>
        <Select value={config.timeoutUnit || 'minutes'} onValueChange={(v) => setConfig({ ...config, timeoutUnit: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutos</SelectItem>
            <SelectItem value="hours">Horas</SelectItem>
            <SelectItem value="days">Dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <p className="text-xs font-medium">Saídas:</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            Respondeu
          </Badge>
          <span className="text-xs text-muted-foreground">Quando o cliente responde</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
            Timeout
          </Badge>
          <span className="text-xs text-muted-foreground">Quando o tempo expira</span>
        </div>
      </div>
    </div>
  );
}

// Tag Config
function TagNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = config.tags || [];
      setConfig({ ...config, tags: [...currentTags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const currentTags = [...(config.tags || [])];
    currentTags.splice(index, 1);
    setConfig({ ...config, tags: currentTags });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Ação</Label>
        <Select value={config.action || 'add'} onValueChange={(v) => setConfig({ ...config, action: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Adicionar tags</SelectItem>
            <SelectItem value="remove">Remover tags</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Nome da tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <Button type="button" onClick={handleAddTag}>Adicionar</Button>
        </div>
        {(config.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(config.tags || []).map((tag: string, index: number) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveTag(index)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Menu Node Config
function MenuNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const [optionInput, setOptionInput] = useState('');

  const contactVariables = [
    { key: '{{nome}}', label: 'Nome Completo' },
    { key: '{{primeiro_nome}}', label: 'Primeiro Nome' },
    { key: '{{sobrenome}}', label: 'Sobrenome' },
    { key: '{{email}}', label: 'Email' },
    { key: '{{telefone}}', label: 'Telefone' },
  ];

  const options = config.options || [];

  const handleAddOption = () => {
    if (optionInput.trim()) {
      const newOptions = [...options, { text: optionInput.trim(), value: String(options.length + 1) }];
      setConfig({ ...config, options: newOptions });
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_: any, i: number) => i !== index);
    // Reindex values
    const reindexed = newOptions.map((opt: any, i: number) => ({ ...opt, value: String(i + 1) }));
    setConfig({ ...config, options: reindexed });
  };

  const handleUpdateOptionText = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    setConfig({ ...config, options: newOptions });
  };

  const insertVariable = (variable: string) => {
    const currentValue = config.message || '';
    setConfig({ ...config, message: currentValue + ' ' + variable });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
        <p className="text-sm text-teal-800 dark:text-teal-200">
          O cliente receberá uma mensagem com opções numeradas e poderá responder com o número da escolha.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Mensagem do menu</Label>
        <Textarea
          className="min-h-[100px] resize-none"
          placeholder="Ex: Olá! Como posso te ajudar hoje? Escolha uma opção abaixo:"
          value={config.message || ''}
          onChange={(e) => setConfig({ ...config, message: e.target.value })}
        />
        <div className="flex flex-wrap gap-1">
          {contactVariables.map((v) => (
            <code
              key={v.key}
              onClick={() => insertVariable(v.key)}
              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-pointer hover:bg-primary/20"
            >
              {v.key}
            </code>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Opções de escolha (máx. 6)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Já sou aluno(a)"
            value={optionInput}
            onChange={(e) => setOptionInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
            disabled={options.length >= 6}
          />
          <Button 
            type="button" 
            onClick={handleAddOption}
            disabled={options.length >= 6 || !optionInput.trim()}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {options.length > 0 && (
          <div className="space-y-2 mt-3">
            {options.map((opt: { text: string; value: string }, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {index + 1}
                </div>
                <Input
                  className="flex-1"
                  value={opt.text}
                  onChange={(e) => handleUpdateOptionText(index, e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleRemoveOption(index)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Adicione pelo menos 2 opções para criar o menu
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Timeout (opcional)</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={config.timeout_minutes || ''}
            onChange={(e) => setConfig({ ...config, timeout_minutes: parseInt(e.target.value) || 0 })}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">minutos</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Se o cliente não responder dentro do tempo, seguirá pela saída de timeout (lado direito). Deixe 0 para esperar indefinidamente.
        </p>
      </div>

      {/* Preview */}
      {config.message && options.length > 0 && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <p className="text-xs font-medium">Prévia da mensagem:</p>
          <div className="text-sm whitespace-pre-wrap">
            {config.message}
            {'\n\n'}
            {options.map((opt: { text: string; value: string }, index: number) => (
              <span key={index}>
                {index + 1}️⃣ {opt.text}
                {'\n'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
