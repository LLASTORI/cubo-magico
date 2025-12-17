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
