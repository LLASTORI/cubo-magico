import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wand2, 
  User, 
  Users, 
  Globe, 
  Sparkles,
  MessageSquare,
  Mail,
  Megaphone,
  FileQuestion,
  Layout,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useContactMemories } from '@/hooks/useContactMemory';
import { useContactProfile } from '@/hooks/useContactProfile';
import { useContactPredictions } from '@/hooks/useContactPredictions';
import { 
  useGenerateDirectives, 
  useResolveTokens 
} from '@/hooks/usePersonalization';
import {
  type PersonalizationChannel,
  type PersonalizationDepth,
  type PersonalizationDirectives,
  type ToneStyle,
  type CtaStyle,
  getToneLabel,
  getCtaStyleLabel,
  getContentBlockLabel,
  getAvailableTokens
} from '@/lib/personalizationEngine';
import type { MemoryType } from '@/lib/memoryExtractionEngine';

interface PersonalizationPreviewProps {
  contactId?: string;
  contactName?: string;
}

const CHANNELS: { value: PersonalizationChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { value: 'quiz', label: 'Quiz', icon: <FileQuestion className="h-4 w-4" /> },
  { value: 'landing', label: 'Landing Page', icon: <Layout className="h-4 w-4" /> },
  { value: 'ads', label: 'Anúncios', icon: <Megaphone className="h-4 w-4" /> }
];

const SAMPLE_CONTENT = `Olá {{contact.first_name}}!

Percebemos que você tem interesse em {{intent.primary}}. 

Com base no seu perfil {{trait.dominant}}, preparamos algo especial para você.

{{memory.goal}}

Clique aqui para saber mais!`;

export function PersonalizationPreview({ contactId, contactName }: PersonalizationPreviewProps) {
  const { currentProject } = useProject();
  const [mode, setMode] = useState<'contact' | 'hypothetical' | 'anonymous'>('contact');
  const [channel, setChannel] = useState<PersonalizationChannel>('whatsapp');
  const [depth, setDepth] = useState<PersonalizationDepth>('standard');
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hypothetical profile state
  const [hypotheticalProfile, setHypotheticalProfile] = useState({
    dominant_trait: 'analytical',
    primary_intent: 'learn',
    confidence: 0.7
  });

  // Real data hooks (only for contact mode)
  const { data: memories = [] } = useContactMemories(mode === 'contact' ? contactId : undefined);
  const { profile } = useContactProfile(mode === 'contact' ? contactId : undefined);
  const { predictions = [] } = useContactPredictions(mode === 'contact' ? contactId : undefined);

  // Personalization hooks
  const generateDirectives = useGenerateDirectives();
  const resolveTokens = useResolveTokens();

  const [directives, setDirectives] = useState<PersonalizationDirectives | null>(null);
  const [resolvedContent, setResolvedContent] = useState<string | null>(null);

  const handleGenerate = async () => {
    const profileData = mode === 'contact' 
      ? profile 
      : mode === 'hypothetical'
        ? {
            trait_vector: { [hypotheticalProfile.dominant_trait]: hypotheticalProfile.confidence },
            intent_vector: { [hypotheticalProfile.primary_intent]: hypotheticalProfile.confidence },
            confidence_score: hypotheticalProfile.confidence,
            entropy_score: 0.3
          }
        : undefined;

    const memoryData = mode === 'contact' ? memories : [];
    const predictionData = mode === 'contact' ? predictions : [];

    // Generate directives
    const newDirectives = await generateDirectives.mutateAsync({
      profile: profileData,
      memories: memoryData,
      predictions: predictionData,
      channel,
      depth
    });
    setDirectives(newDirectives);

    // Resolve tokens
    const resolved = await resolveTokens.mutateAsync({
      content,
      profile: profileData,
      memories: memoryData,
      predictions: predictionData,
      channel,
      contactName: mode === 'contact' ? contactName : mode === 'hypothetical' ? 'João' : undefined
    });
    setResolvedContent(resolved.resolved);
  };

  const handleCopy = () => {
    if (resolvedContent) {
      navigator.clipboard.writeText(resolvedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const availableTokens = getAvailableTokens(channel);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Preview de Personalização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Contato Real
            </TabsTrigger>
            <TabsTrigger value="hypothetical" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Hipotético
            </TabsTrigger>
            <TabsTrigger value="anonymous" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Anônimo
            </TabsTrigger>
          </TabsList>

          {/* Contact Mode */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            {contactId ? (
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{contactName || 'Contato'}</p>
                    <p className="text-sm text-muted-foreground">
                      {memories.length} memórias • {predictions.length} previsões
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selecione um contato para ver a personalização real</p>
              </div>
            )}
          </TabsContent>

          {/* Hypothetical Mode */}
          <TabsContent value="hypothetical" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Traço Dominante</Label>
                <Select
                  value={hypotheticalProfile.dominant_trait}
                  onValueChange={(v) => setHypotheticalProfile(p => ({ ...p, dominant_trait: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analytical">Analítico</SelectItem>
                    <SelectItem value="creative">Criativo</SelectItem>
                    <SelectItem value="practical">Prático</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="ambitious">Ambicioso</SelectItem>
                    <SelectItem value="cautious">Cauteloso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Intenção Primária</Label>
                <Select
                  value={hypotheticalProfile.primary_intent}
                  onValueChange={(v) => setHypotheticalProfile(p => ({ ...p, primary_intent: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Comprar</SelectItem>
                    <SelectItem value="learn">Aprender</SelectItem>
                    <SelectItem value="compare">Comparar</SelectItem>
                    <SelectItem value="explore">Explorar</SelectItem>
                    <SelectItem value="solve">Resolver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Confiança do Perfil: {Math.round(hypotheticalProfile.confidence * 100)}%</Label>
              <Slider
                value={[hypotheticalProfile.confidence * 100]}
                onValueChange={([v]) => setHypotheticalProfile(p => ({ ...p, confidence: v / 100 }))}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
          </TabsContent>

          {/* Anonymous Mode */}
          <TabsContent value="anonymous" className="mt-4">
            <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Modo anônimo usa apenas configurações padrão do canal</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Channel & Depth Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as PersonalizationChannel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map(ch => (
                  <SelectItem key={ch.value} value={ch.value}>
                    <div className="flex items-center gap-2">
                      {ch.icon}
                      {ch.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profundidade</Label>
            <Select value={depth} onValueChange={(v) => setDepth(v as PersonalizationDepth)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Mínima</SelectItem>
                <SelectItem value="standard">Padrão</SelectItem>
                <SelectItem value="deep">Profunda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Conteúdo com Tokens</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Tokens disponíveis
              {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          
          {showAdvanced && (
            <div className="mb-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Clique para inserir:</p>
              <div className="flex flex-wrap gap-1">
                {availableTokens.map(token => (
                  <Badge
                    key={token}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setContent(c => c + ' ' + token)}
                  >
                    {token}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Digite seu conteúdo com tokens {{...}}"
            className="font-mono text-sm"
          />
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={generateDirectives.isPending}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {generateDirectives.isPending ? 'Gerando...' : 'Gerar Personalização'}
        </Button>

        {/* Results */}
        {directives && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Diretivas Geradas
              <Badge variant="secondary">
                {Math.round(directives.confidence * 100)}% confiança
              </Badge>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Tom</p>
                <p className="font-medium">{getToneLabel(directives.tone)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Urgência</p>
                <p className="font-medium capitalize">{directives.urgency === 'high' ? 'Alta' : directives.urgency === 'medium' ? 'Média' : 'Baixa'}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Ângulo</p>
                <p className="font-medium capitalize">{directives.angle}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">CTA</p>
                <p className="font-medium">{getCtaStyleLabel(directives.cta_style)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Blocos:</span>
              {directives.content_blocks.map(block => (
                <Badge key={block} variant="outline">
                  {getContentBlockLabel(block)}
                </Badge>
              ))}
            </div>

            {directives.avoid.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Evitar:</span>
                {directives.avoid.map(item => (
                  <Badge key={item} variant="destructive">
                    {item}
                  </Badge>
                ))}
              </div>
            )}

            {directives.reasoning.length > 0 && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Raciocínio:</p>
                <ul className="text-sm space-y-1">
                  {directives.reasoning.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Resolved Content */}
        {resolvedContent && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Conteúdo Personalizado</h4>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
              {resolvedContent}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
