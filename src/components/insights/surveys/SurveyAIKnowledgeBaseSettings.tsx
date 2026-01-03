import { useState, useEffect } from 'react';
import { 
  Brain, 
  Save, 
  Plus, 
  Trash2, 
  Building2,
  Users,
  ShoppingBag,
  Target,
  AlertCircle,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { useSurveyAIKnowledgeBase, SurveyAIKnowledgeBase } from '@/hooks/useSurveyAnalysis';

interface SurveyAIKnowledgeBaseSettingsProps {
  projectId: string;
}

export function SurveyAIKnowledgeBaseSettings({ projectId }: SurveyAIKnowledgeBaseSettingsProps) {
  const { knowledgeBase, isLoading, save, isSaving } = useSurveyAIKnowledgeBase(projectId);

  const [formData, setFormData] = useState<Partial<SurveyAIKnowledgeBase>>({
    business_name: '',
    business_description: '',
    target_audience: '',
    products_services: '',
    high_intent_indicators: '',
    pain_point_indicators: '',
    satisfaction_indicators: '',
    objection_patterns: '',
    high_intent_keywords: [],
    pain_keywords: [],
    satisfaction_keywords: [],
    auto_classify_responses: false,
    min_intent_score_for_action: 50,
  });

  const [newHighIntentKeyword, setNewHighIntentKeyword] = useState('');
  const [newPainKeyword, setNewPainKeyword] = useState('');
  const [newSatisfactionKeyword, setNewSatisfactionKeyword] = useState('');

  useEffect(() => {
    if (knowledgeBase) {
      setFormData(knowledgeBase);
    }
  }, [knowledgeBase]);

  const handleSave = () => {
    save(formData);
  };

  const addKeyword = (type: 'high_intent' | 'pain' | 'satisfaction', keyword: string) => {
    if (!keyword.trim()) return;
    
    const fieldKey = type === 'high_intent' ? 'high_intent_keywords' : 
                     type === 'pain' ? 'pain_keywords' : 'satisfaction_keywords';
    
    const currentKeywords = formData[fieldKey] || [];
    if (!currentKeywords.includes(keyword.trim())) {
      setFormData({
        ...formData,
        [fieldKey]: [...currentKeywords, keyword.trim()],
      });
    }
    
    if (type === 'high_intent') setNewHighIntentKeyword('');
    else if (type === 'pain') setNewPainKeyword('');
    else setNewSatisfactionKeyword('');
  };

  const removeKeyword = (type: 'high_intent' | 'pain' | 'satisfaction', keyword: string) => {
    const fieldKey = type === 'high_intent' ? 'high_intent_keywords' : 
                     type === 'pain' ? 'pain_keywords' : 'satisfaction_keywords';
    
    setFormData({
      ...formData,
      [fieldKey]: (formData[fieldKey] || []).filter(k => k !== keyword),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Base de Conhecimento para Pesquisas
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure o contexto do seu negócio para classificação mais precisa das respostas
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={['business', 'indicators']} className="space-y-4">
        {/* Business Context */}
        <AccordionItem value="business" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Contexto do Negócio</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nome do Negócio</Label>
                <Input
                  id="business_name"
                  placeholder="Ex: Cubo Mágico Academy"
                  value={formData.business_name || ''}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="products_services" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Produtos/Serviços
                </Label>
                <Input
                  id="products_services"
                  placeholder="Ex: Cursos de marketing digital, mentorias"
                  value={formData.products_services || ''}
                  onChange={(e) => setFormData({ ...formData, products_services: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_description">Descrição do Negócio</Label>
              <Textarea
                id="business_description"
                placeholder="Descreva o que sua empresa faz..."
                value={formData.business_description || ''}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Público-Alvo
              </Label>
              <Textarea
                id="target_audience"
                placeholder="Quem são seus clientes ideais?"
                value={formData.target_audience || ''}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Intent Indicators */}
        <AccordionItem value="indicators" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Indicadores de Classificação</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="high_intent_indicators" className="flex items-center gap-2 text-green-600">
                <Target className="h-4 w-4" />
                O que caracteriza Alta Intenção de Compra?
              </Label>
              <Textarea
                id="high_intent_indicators"
                placeholder="Ex: Perguntas sobre preço, formas de pagamento, como adquirir..."
                value={formData.high_intent_indicators || ''}
                onChange={(e) => setFormData({ ...formData, high_intent_indicators: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pain_point_indicators" className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                O que caracteriza Dor do Cliente?
              </Label>
              <Textarea
                id="pain_point_indicators"
                placeholder="Ex: Frustrações com resultados, dificuldades específicas, problemas recorrentes..."
                value={formData.pain_point_indicators || ''}
                onChange={(e) => setFormData({ ...formData, pain_point_indicators: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="satisfaction_indicators" className="flex items-center gap-2 text-blue-600">
                <Smile className="h-4 w-4" />
                O que caracteriza Satisfação?
              </Label>
              <Textarea
                id="satisfaction_indicators"
                placeholder="Ex: Elogios, resultados positivos alcançados, recomendações..."
                value={formData.satisfaction_indicators || ''}
                onChange={(e) => setFormData({ ...formData, satisfaction_indicators: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objection_patterns" className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Padrões de Objeção Esperados
              </Label>
              <Textarea
                id="objection_patterns"
                placeholder="Ex: Preço alto, falta de tempo, já tentei e não funcionou..."
                value={formData.objection_patterns || ''}
                onChange={(e) => setFormData({ ...formData, objection_patterns: e.target.value })}
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Keywords */}
        <AccordionItem value="keywords" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Palavras-Chave</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* High Intent Keywords */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-green-600">
                <Target className="h-4 w-4" />
                Palavras de Alta Intenção
              </Label>
              <p className="text-xs text-muted-foreground">
                Palavras que indicam interesse em comprar (aumentam o Intent Score)
              </p>
              <div className="flex flex-wrap gap-2">
                {(formData.high_intent_keywords || []).map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button onClick={() => removeKeyword('high_intent', keyword)}>
                      <Trash2 className="h-3 w-3 hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra-chave..."
                  value={newHighIntentKeyword}
                  onChange={(e) => setNewHighIntentKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword('high_intent', newHighIntentKeyword)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={() => addKeyword('high_intent', newHighIntentKeyword)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Pain Keywords */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                Palavras de Dor
              </Label>
              <p className="text-xs text-muted-foreground">
                Palavras que indicam frustração ou problema
              </p>
              <div className="flex flex-wrap gap-2">
                {(formData.pain_keywords || []).map((keyword) => (
                  <Badge key={keyword} variant="outline" className="gap-1 border-orange-500/50">
                    {keyword}
                    <button onClick={() => removeKeyword('pain', keyword)}>
                      <Trash2 className="h-3 w-3 hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra de dor..."
                  value={newPainKeyword}
                  onChange={(e) => setNewPainKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword('pain', newPainKeyword)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={() => addKeyword('pain', newPainKeyword)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Satisfaction Keywords */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-blue-600">
                <Smile className="h-4 w-4" />
                Palavras de Satisfação
              </Label>
              <p className="text-xs text-muted-foreground">
                Palavras que indicam feedback positivo
              </p>
              <div className="flex flex-wrap gap-2">
                {(formData.satisfaction_keywords || []).map((keyword) => (
                  <Badge key={keyword} variant="outline" className="gap-1 border-blue-500/50">
                    {keyword}
                    <button onClick={() => removeKeyword('satisfaction', keyword)}>
                      <Trash2 className="h-3 w-3 hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra de satisfação..."
                  value={newSatisfactionKeyword}
                  onChange={(e) => setNewSatisfactionKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword('satisfaction', newSatisfactionKeyword)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={() => addKeyword('satisfaction', newSatisfactionKeyword)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Settings */}
        <AccordionItem value="settings" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Configurações de IA</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Classificação Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Classificar automaticamente novas respostas recebidas
                </p>
              </div>
              <Switch
                checked={formData.auto_classify_responses || false}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_classify_responses: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_intent_score">Intent Score Mínimo para Ação</Label>
              <p className="text-xs text-muted-foreground">
                Respostas com score acima deste valor serão destacadas para follow-up
              </p>
              <Input
                id="min_intent_score"
                type="number"
                min={0}
                max={100}
                value={formData.min_intent_score_for_action || 50}
                onChange={(e) => setFormData({ ...formData, min_intent_score_for_action: parseInt(e.target.value) })}
                className="max-w-[100px]"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
