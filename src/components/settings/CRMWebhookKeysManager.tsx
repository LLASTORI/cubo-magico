import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebhookTestDashboard } from './WebhookTestDashboard';
import { CRMLeadsCSVImport } from './CRMLeadsCSVImport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCRMWebhookKeys, type CRMWebhookKey } from '@/hooks/useCRMWebhookKeys';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Check, Settings2, FileText, ArrowRight, Play, Loader2, CheckCircle, XCircle, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// All accepted fields with descriptions
const ACCEPTED_FIELDS = [
  { name: 'email', required: true, description: 'Email do contato', aliases: ['e-mail', 'e_mail', 'mail', 'email_address'] },
  { name: 'name', required: false, description: 'Nome completo (ou junta first_name + last_name)', aliases: ['nome', 'nome_completo', 'full_name', 'fullname'] },
  { name: 'first_name', required: false, description: 'Primeiro nome (será juntado com last_name)', aliases: ['firstname', 'primeiro_nome'] },
  { name: 'last_name', required: false, description: 'Sobrenome (será juntado com first_name)', aliases: ['lastname', 'sobrenome', 'surname', 'segundo_nome'] },
  { name: 'phone', required: false, description: 'Telefone', aliases: ['telefone', 'celular', 'whatsapp', 'mobile', 'tel', 'fone'] },
  { name: 'phone_ddd', required: false, description: 'DDD do telefone', aliases: ['ddd', 'area_code'] },
  { name: 'document', required: false, description: 'CPF ou CNPJ', aliases: ['cpf', 'cnpj', 'cpf_cnpj', 'documento'] },
  { name: 'instagram', required: false, description: 'Username do Instagram', aliases: ['insta', 'ig'] },
  { name: 'tags', required: false, description: 'Tags/etiquetas (array ou string separada por vírgula)', aliases: ['tag', 'labels', 'etiquetas'] },
  { name: 'page_name', required: false, description: 'Nome da página de cadastro', aliases: ['pagina', 'page', 'landing_page', 'lp', 'form_name', 'formulario'] },
  { name: 'utm_source', required: false, description: 'Origem do tráfego', aliases: ['source', 'origem'] },
  { name: 'utm_campaign', required: false, description: 'Nome da campanha', aliases: ['campaign', 'campanha'] },
  { name: 'utm_medium', required: false, description: 'Mídia/canal', aliases: ['medium', 'midia'] },
  { name: 'utm_content', required: false, description: 'Conteúdo do anúncio', aliases: ['content', 'conteudo'] },
  { name: 'utm_term', required: false, description: 'Termo de busca', aliases: ['term', 'termo'] },
  { name: 'address', required: false, description: 'Endereço/Rua', aliases: ['endereco', 'rua', 'logradouro', 'street'] },
  { name: 'address_number', required: false, description: 'Número', aliases: ['numero', 'number', 'num'] },
  { name: 'address_complement', required: false, description: 'Complemento', aliases: ['complemento', 'complement', 'apto'] },
  { name: 'neighborhood', required: false, description: 'Bairro', aliases: ['bairro', 'district'] },
  { name: 'city', required: false, description: 'Cidade', aliases: ['cidade', 'municipio'] },
  { name: 'state', required: false, description: 'Estado/UF', aliases: ['estado', 'uf', 'province'] },
  { name: 'country', required: false, description: 'País', aliases: ['pais'] },
  { name: 'cep', required: false, description: 'CEP/Código Postal', aliases: ['zip', 'zipcode', 'zip_code', 'postal_code', 'codigo_postal'] },
  { name: 'custom_fields', required: false, description: 'Campos extras (objeto JSON)', aliases: ['extras', 'dados_extras', 'metadata'] },
];

export function CRMWebhookKeysManager() {
  const { webhookKeys, isLoading, createKey, updateKey, deleteKey, isCreating } = useCRMWebhookKeys();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedKeyForMapping, setSelectedKeyForMapping] = useState<CRMWebhookKey | null>(null);
  const [newMappingFrom, setNewMappingFrom] = useState('');
  const [newMappingTo, setNewMappingTo] = useState('');
  
  // Create key state - tags and funnel
  const [newKeyTags, setNewKeyTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newKeyFunnelId, setNewKeyFunnelId] = useState<string>('');
  
  // Test webhook state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedKeyForTest, setSelectedKeyForTest] = useState<CRMWebhookKey | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-webhook`;

  // Fetch funnels for selection
  const { data: funnels } = useQuery({
    queryKey: ['funnels', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', currentProject.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  const handleCopyKey = async (apiKey: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({
        title: 'Copiado!',
        description: 'API Key copiada para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a chave.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyExample = async () => {
    const example = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_API_KEY" \\
  -d '{
    "email": "lead@exemplo.com",
    "first_name": "João",
    "last_name": "Silva",
    "phone": "11999999999",
    "tags": ["campanha-x"],
    "page_name": "LP Vendas",
    "utm_source": "facebook",
    "utm_campaign": "lancamento"
  }'`;
    try {
      await navigator.clipboard.writeText(example);
      toast({
        title: 'Copiado!',
        description: 'Exemplo copiado para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o exemplo.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para a API Key.',
        variant: 'destructive',
      });
      return;
    }

    createKey({ 
      name: newKeyName.trim(),
      defaultTags: newKeyTags.length > 0 ? newKeyTags : undefined,
      defaultFunnelId: newKeyFunnelId || null,
    });
    setNewKeyName('');
    setNewKeyTags([]);
    setNewTagInput('');
    setNewKeyFunnelId('');
    setDialogOpen(false);
  };

  const handleAddNewKeyTag = () => {
    if (!newTagInput.trim()) return;
    if (newKeyTags.includes(newTagInput.trim())) return;
    setNewKeyTags([...newKeyTags, newTagInput.trim()]);
    setNewTagInput('');
  };

  const handleRemoveNewKeyTag = (tag: string) => {
    setNewKeyTags(newKeyTags.filter(t => t !== tag));
  };

  const toggleShowKey = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}${'•'.repeat(40)}${key.slice(-8)}`;
  };

  const openMappingDialog = (key: CRMWebhookKey) => {
    setSelectedKeyForMapping(key);
    setNewMappingFrom('');
    setNewMappingTo('');
    setMappingDialogOpen(true);
  };

  const handleAddMapping = () => {
    if (!selectedKeyForMapping || !newMappingFrom.trim() || !newMappingTo.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o campo de origem e destino.',
        variant: 'destructive',
      });
      return;
    }

    const currentMappings = (selectedKeyForMapping.field_mappings as Record<string, string>) || {};
    const updatedMappings = {
      ...currentMappings,
      [newMappingFrom.trim()]: newMappingTo.trim(),
    };

    updateKey({ 
      id: selectedKeyForMapping.id, 
      field_mappings: updatedMappings 
    });

    setNewMappingFrom('');
    setNewMappingTo('');
    
    // Update local state
    setSelectedKeyForMapping({
      ...selectedKeyForMapping,
      field_mappings: updatedMappings,
    });
  };

  const handleRemoveMapping = (fieldFrom: string) => {
    if (!selectedKeyForMapping) return;

    const currentMappings = (selectedKeyForMapping.field_mappings as Record<string, string>) || {};
    const { [fieldFrom]: _, ...updatedMappings } = currentMappings;

    updateKey({ 
      id: selectedKeyForMapping.id, 
      field_mappings: updatedMappings 
    });

    setSelectedKeyForMapping({
      ...selectedKeyForMapping,
      field_mappings: updatedMappings,
    });
  };

  // Test webhook function
  const openTestDialog = (key: CRMWebhookKey) => {
    setSelectedKeyForTest(key);
    setTestResult(null);
    setTestDialogOpen(true);
  };

  const handleTestWebhook = async () => {
    if (!selectedKeyForTest) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    // Generate random email to avoid duplicates
    const randomId = Math.random().toString(36).substring(2, 8);
    const testPayload = {
      // Using Portuguese field names to test aliases
      email: `teste.webhook.${randomId}@exemplo.com`,
      primeiro_nome: 'João',
      sobrenome: 'da Silva',
      telefone: '11999887766',
      pagina: 'LP Teste Webhook',
      utm_source: 'teste_interno',
      utm_campaign: 'verificacao_aliases',
      tags: ['teste', 'webhook-verificacao'],
    };
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': selectedKeyForTest.api_key,
        },
        body: JSON.stringify(testPayload),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({ 
          success: true, 
          data: {
            sent: testPayload,
            received: data,
          }
        });
        toast({
          title: 'Teste bem-sucedido!',
          description: `Lead "${data.contact?.name || data.contact?.email}" criado no CRM.`,
        });
      } else {
        setTestResult({ 
          success: false, 
          error: data.error || 'Erro desconhecido',
          data: { sent: testPayload, received: data }
        });
      }
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        error: error.message || 'Erro de conexão' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys do Webhook CRM
            </CardTitle>
            <CardDescription>
              Gerencie as chaves de API para receber leads de ferramentas externas.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar nova API Key</DialogTitle>
                <DialogDescription>
                  Crie uma nova chave de API para integrar ferramentas externas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Nome da chave</Label>
                  <Input
                    id="keyName"
                    placeholder="Ex: ActiveCampaign, Typeform, etc"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                
                {/* Default tags */}
                <div className="space-y-2">
                  <Label>Tags Padrão (opcional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Serão adicionadas automaticamente a todos os leads recebidos
                  </p>
                  {newKeyTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newKeyTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button onClick={() => handleRemoveNewKeyTag(tag)} type="button">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewKeyTag())}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={handleAddNewKeyTag} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Default funnel */}
                <div className="space-y-2">
                  <Label>Funil Padrão (opcional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Uma tag "funil:nome" será adicionada a todos os leads
                  </p>
                    <Select value={newKeyFunnelId || "__none__"} onValueChange={(val) => setNewKeyFunnelId(val === "__none__" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funil..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {funnels?.map(funnel => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          {funnel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKey} disabled={isCreating}>
                  {isCreating ? 'Criando...' : 'Criar API Key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="import">Importar CSV</TabsTrigger>
            <TabsTrigger value="test">Testar</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="keys" className="space-y-6 mt-4">
            {/* API Keys list */}
            {webhookKeys && webhookKeys.length > 0 ? (
              <div className="space-y-3">
                {webhookKeys.map((key) => (
                  <div
                    key={key.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{key.name}</h4>
                        <Badge variant={key.is_active ? 'default' : 'secondary'}>
                          {key.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        {key.field_mappings && Object.keys(key.field_mappings as object).length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {Object.keys(key.field_mappings as object).length} mapeamentos
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTestDialog(key)}
                          title="Testar webhook"
                          disabled={!key.is_active}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMappingDialog(key)}
                          title="Configurar mapeamentos"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={(checked) => updateKey({ id: key.id, is_active: checked })}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todas as integrações que usam esta chave deixarão de funcionar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteKey(key.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded bg-muted text-xs font-mono break-all">
                        {showKey[key.id] ? key.api_key : maskApiKey(key.api_key)}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => toggleShowKey(key.id)}>
                        {showKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCopyKey(key.api_key, key.id)}
                      >
                        {copiedKey === key.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Usos: {key.usage_count}</span>
                      {key.last_used_at && (
                        <span>
                          Último uso: {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                      <span>
                        Criada: {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma API Key criada</p>
                <p className="text-sm">Crie uma chave para começar a receber leads.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <CRMLeadsCSVImport />
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            {webhookKeys && webhookKeys.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>Selecione a API Key:</Label>
                  <select
                    className="border rounded px-3 py-1.5 text-sm bg-background"
                    value={selectedKeyForTest?.id || ''}
                    onChange={(e) => {
                      const key = webhookKeys.find(k => k.id === e.target.value);
                      setSelectedKeyForTest(key || null);
                    }}
                  >
                    <option value="">Selecione...</option>
                    {webhookKeys.filter(k => k.is_active).map(key => (
                      <option key={key.id} value={key.id}>{key.name}</option>
                    ))}
                  </select>
                </div>
                {selectedKeyForTest && (
                  <WebhookTestDashboard 
                    apiKey={selectedKeyForTest.api_key}
                    webhookUrl={webhookUrl}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Crie uma API Key primeiro para testar o webhook.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-6 mt-4">
            {/* Quick example */}
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Exemplo de Requisição
                </h5>
                <Button variant="outline" size="sm" onClick={handleCopyExample}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <pre className="p-3 rounded bg-background text-xs overflow-x-auto">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_API_KEY" \\
  -d '{
    "email": "lead@exemplo.com",
    "first_name": "João",
    "last_name": "Silva",
    "phone": "11999999999",
    "tags": ["campanha-x"],
    "page_name": "LP Vendas",
    "utm_source": "facebook",
    "utm_campaign": "lancamento"
  }'`}
              </pre>
            </div>

            {/* Accepted fields */}
            <div className="space-y-4">
              <h5 className="font-medium">Campos Aceitos</h5>
              <p className="text-sm text-muted-foreground">
                O webhook aceita automaticamente variações de nomes de campos. Campos não reconhecidos são salvos em <code className="bg-muted px-1 rounded">custom_fields</code>.
              </p>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="required">
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2">
                      Campos Obrigatórios
                      <Badge variant="destructive" className="text-xs">1</Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {ACCEPTED_FIELDS.filter(f => f.required).map(field => (
                        <div key={field.name} className="p-3 rounded bg-muted/50 space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-semibold text-primary">{field.name}</code>
                            <Badge variant="destructive" className="text-xs">obrigatório</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">Aceita também:</span>
                            {field.aliases.map(alias => (
                              <code key={alias} className="text-xs bg-background px-1 rounded">{alias}</code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact">
                  <AccordionTrigger className="text-sm">
                    Dados do Contato
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {/* Special note about name joining */}
                      <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-semibold text-blue-700 dark:text-blue-400">first_name + last_name</code>
                          <Badge variant="outline" className="text-xs text-blue-600">automático</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Se você enviar <code className="bg-background px-1 rounded">first_name</code> e <code className="bg-background px-1 rounded">last_name</code> separados, 
                          eles serão automaticamente concatenados no campo <code className="bg-background px-1 rounded">name</code>.
                        </p>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Ex: {`{ "primeiro_nome": "João", "sobrenome": "Silva" }`} → name: "João Silva"
                        </div>
                      </div>
                      
                      {ACCEPTED_FIELDS.filter(f => !f.required && ['name', 'first_name', 'last_name', 'phone', 'phone_ddd', 'document', 'instagram'].includes(f.name)).map(field => (
                        <div key={field.name} className="p-3 rounded bg-muted/50 space-y-1">
                          <code className="text-sm font-semibold">{field.name}</code>
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">Aceita também:</span>
                            {field.aliases.map(alias => (
                              <code key={alias} className="text-xs bg-background px-1 rounded">{alias}</code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tracking">
                  <AccordionTrigger className="text-sm">
                    Tracking (UTMs e Página)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {ACCEPTED_FIELDS.filter(f => f.name.startsWith('utm_') || f.name === 'page_name' || f.name === 'tags').map(field => (
                        <div key={field.name} className="p-3 rounded bg-muted/50 space-y-1">
                          <code className="text-sm font-semibold">{field.name}</code>
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">Aceita também:</span>
                            {field.aliases.map(alias => (
                              <code key={alias} className="text-xs bg-background px-1 rounded">{alias}</code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="address">
                  <AccordionTrigger className="text-sm">
                    Endereço
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {ACCEPTED_FIELDS.filter(f => ['address', 'address_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'cep'].includes(f.name)).map(field => (
                        <div key={field.name} className="p-3 rounded bg-muted/50 space-y-1">
                          <code className="text-sm font-semibold">{field.name}</code>
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">Aceita também:</span>
                            {field.aliases.map(alias => (
                              <code key={alias} className="text-xs bg-background px-1 rounded">{alias}</code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="custom">
                  <AccordionTrigger className="text-sm">
                    Campos Personalizados
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 rounded bg-muted/50 space-y-2">
                      <code className="text-sm font-semibold">custom_fields</code>
                      <p className="text-sm text-muted-foreground">
                        Objeto JSON para armazenar dados extras. Campos não reconhecidos automaticamente são salvos aqui.
                      </p>
                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "custom_fields": {
    "interesse": "produto-x",
    "origem_especifica": "webinar-maio"
  }
}`}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* API Key features info */}
            <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/20">
              <h5 className="font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Configurações por API Key
              </h5>
              <p className="text-sm text-muted-foreground mb-3">
                Cada API Key pode ter configurações específicas que são aplicadas automaticamente a todos os leads recebidos:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Tags Padrão</Badge>
                  <span className="text-muted-foreground">
                    Tags definidas na API Key são mescladas com as tags enviadas na requisição.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Funil Padrão</Badge>
                  <span className="text-muted-foreground">
                    Se configurado, adiciona automaticamente uma tag <code className="bg-background px-1 rounded">funil:nome-do-funil</code> ao lead.
                  </span>
                </div>
              </div>
            </div>

            {/* Custom mappings info */}
            <div className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/20">
              <h5 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Mapeamento Customizado
              </h5>
              <p className="text-sm text-muted-foreground">
                Se sua ferramenta usa nomes de campos diferentes, você pode configurar mapeamentos personalizados 
                clicando no ícone <Settings2 className="h-3 w-3 inline" /> em cada API Key.
              </p>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Exemplo:</span>
                <code className="ml-2 bg-background px-2 py-1 rounded">
                  "lead_email" <ArrowRight className="h-3 w-3 inline mx-1" /> "email"
                </code>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Mapping Dialog */}
        <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Mapeamento de Campos</DialogTitle>
              <DialogDescription>
                Configure mapeamentos personalizados para a API Key "{selectedKeyForMapping?.name}".
                Campos não reconhecidos serão convertidos para os campos padrão do CRM.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Current mappings */}
              {selectedKeyForMapping?.field_mappings && Object.keys(selectedKeyForMapping.field_mappings as object).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mapeamentos Atuais</Label>
                  <div className="space-y-1">
                    {Object.entries(selectedKeyForMapping.field_mappings as Record<string, string>).map(([from, to]) => (
                      <div key={from} className="flex items-center gap-2 p-2 rounded bg-muted">
                        <code className="text-sm">{from}</code>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm text-primary">{to}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto text-destructive"
                          onClick={() => handleRemoveMapping(from)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new mapping */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Adicionar Mapeamento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Campo de origem"
                    value={newMappingFrom}
                    onChange={(e) => setNewMappingFrom(e.target.value)}
                    className="flex-1"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="Campo destino"
                    value={newMappingTo}
                    onChange={(e) => setNewMappingTo(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleAddMapping}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex: "lead_email" → "email", "telefone_celular" → "phone"
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Testar Webhook
              </DialogTitle>
              <DialogDescription>
                Enviar um lead de teste usando a API Key "{selectedKeyForTest?.name}" para verificar aliases e mapeamentos.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Test payload preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dados de Teste (usando campos em português)</Label>
                <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
{`{
  "email": "teste.webhook.xxx@exemplo.com",
  "primeiro_nome": "João",        // → name
  "sobrenome": "da Silva",        // → name (concatenado)
  "telefone": "11999887766",      // → phone
  "pagina": "LP Teste Webhook",   // → page_name
  "utm_source": "teste_interno",
  "tags": ["teste", "webhook-verificacao"]
}`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  O webhook vai converter automaticamente os campos em português para os campos padrão do CRM.
                </p>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.success ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-400">Teste bem-sucedido!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="font-medium text-destructive">Erro no teste</span>
                      </>
                    )}
                  </div>
                  
                  {testResult.success && testResult.data?.received?.contact && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Contato criado:</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nome:</span>{' '}
                          <code className="bg-background px-1 rounded">{testResult.data.received.contact.name}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          <code className="bg-background px-1 rounded">{testResult.data.received.contact.email}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>{' '}
                          <code className="bg-background px-1 rounded">{testResult.data.received.contact.status}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tags:</span>{' '}
                          <code className="bg-background px-1 rounded">{testResult.data.received.contact.tags?.join(', ') || '-'}</code>
                        </div>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        ✓ Os aliases funcionaram! "primeiro_nome" + "sobrenome" foram concatenados em "name".
                      </p>
                    </div>
                  )}
                  
                  {!testResult.success && testResult.error && (
                    <p className="text-sm text-destructive">{testResult.error}</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={handleTestWebhook} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Enviar Lead de Teste
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
