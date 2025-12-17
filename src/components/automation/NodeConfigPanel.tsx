import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Save, Trash2, MessageSquare, Clock, GitBranch, Tag, Image, Globe, GitFork, MessageCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

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
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {nodeIcons[nodeType]}
            Configurar {nodeLabels[nodeType] || 'Nó'}
          </SheetTitle>
          <SheetDescription>
            Configure as propriedades deste componente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
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

          {/* Start Node */}
          {nodeType === 'start' && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                As configurações de gatilho são definidas nas propriedades do fluxo.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Message Config
function MessageNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
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
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-medium mb-2">Variáveis disponíveis:</p>
        <div className="flex flex-wrap gap-1.5">
          {['{{nome}}', '{{email}}', '{{telefone}}', '{{cidade}}'].map((v) => (
            <code
              key={v}
              onClick={() => setConfig({ ...config, content: (config.content || '') + ' ' + v })}
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
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Campo a verificar</Label>
        <Select value={config.field || ''} onValueChange={(v) => setConfig({ ...config, field: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tags">Tags</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="city">Cidade</SelectItem>
            <SelectItem value="state">Estado</SelectItem>
            <SelectItem value="total_purchases">Total de compras</SelectItem>
            <SelectItem value="total_revenue">Receita total</SelectItem>
            <SelectItem value="pipeline_stage">Etapa do pipeline</SelectItem>
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
          <Input
            placeholder="Valor para comparar"
            value={config.value || ''}
            onChange={(e) => setConfig({ ...config, value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// Action Config
function ActionNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de ação</Label>
        <Select value={config.action_type || ''} onValueChange={(v) => setConfig({ ...config, action_type: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add_tag">Adicionar tag</SelectItem>
            <SelectItem value="remove_tag">Remover tag</SelectItem>
            <SelectItem value="change_stage">Mudar etapa do pipeline</SelectItem>
            <SelectItem value="change_recovery_stage">Mudar etapa de recuperação</SelectItem>
            <SelectItem value="notify_team">Notificar equipe</SelectItem>
            <SelectItem value="update_contact">Atualizar campo do contato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.action_type && (
        <div className="space-y-2">
          <Label>
            {config.action_type?.includes('tag') ? 'Nome da tag' : 
             config.action_type?.includes('stage') ? 'ID da etapa' : 
             config.action_type === 'notify_team' ? 'Mensagem' : 'Valor'}
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

      <div className="space-y-2">
        <Label>URL da mídia</Label>
        <Input
          placeholder="https://..."
          value={config.media_url || ''}
          onChange={(e) => setConfig({ ...config, media_url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Cole o link direto da mídia ou faça upload no storage
        </p>
      </div>

      <div className="space-y-2">
        <Label>Legenda (opcional)</Label>
        <Textarea
          placeholder="Descrição da mídia..."
          value={config.caption || ''}
          onChange={(e) => setConfig({ ...config, caption: e.target.value })}
          className="min-h-[80px]"
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

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Use variáveis do contato: {'{{nome}}'}, {'{{email}}'}, {'{{telefone}}'}
        </p>
      </div>
    </div>
  );
}

// Split Test Config
function SplitNodeConfig({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de split</Label>
        <Select value={config.splitType || 'percentage'} onValueChange={(v) => setConfig({ ...config, splitType: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Por porcentagem</SelectItem>
            <SelectItem value="random">Aleatório 50/50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.splitType === 'percentage' && (
        <div className="space-y-4">
          <Label>Distribuição: {config.splitPercentage || 50}% / {100 - (config.splitPercentage || 50)}%</Label>
          <Slider
            value={[config.splitPercentage || 50]}
            onValueChange={([v]) => setConfig({ ...config, splitPercentage: v })}
            min={10}
            max={90}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-green-600">Variante A</span>
            <span className="text-blue-600">Variante B</span>
          </div>
        </div>
      )}

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Conecte cada saída (A/B) a diferentes caminhos do fluxo para testar variações.
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
