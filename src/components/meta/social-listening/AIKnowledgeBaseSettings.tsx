import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Brain, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Building2,
  Users,
  ShoppingBag,
  MessageSquare,
  Sparkles,
  HelpCircle,
  AlertCircle
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIKnowledgeBaseSettingsProps {
  projectId: string;
}

interface CustomCategory {
  key: string;
  label: string;
  description: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface KnowledgeBase {
  id: string;
  project_id: string;
  business_name: string | null;
  business_description: string | null;
  target_audience: string | null;
  products_services: string | null;
  tone_of_voice: string | null;
  custom_categories: CustomCategory[];
  faqs: FAQ[];
  commercial_keywords: string[];
  praise_keywords?: string[];
  spam_keywords: string[];
  auto_classify_new_comments: boolean;
  min_intent_score_for_crm: number;
}

const defaultCategories: CustomCategory[] = [
  { key: 'product_question', label: 'Dúvida de Produto', description: 'Perguntas sobre características, uso ou funcionamento do produto' },
  { key: 'purchase_question', label: 'Dúvida de Compra/Preço', description: 'Perguntas sobre preço, formas de pagamento, frete' },
  { key: 'praise', label: 'Elogio', description: 'Feedback positivo, agradecimentos' },
  { key: 'complaint', label: 'Crítica/Reclamação', description: 'Insatisfação, problemas, reclamações' },
  { key: 'contact_request', label: 'Pedido de Contato', description: 'Solicitação de contato direto, DM, WhatsApp' },
  { key: 'friend_tag', label: 'Marcação de Amigo', description: 'Apenas marcando outras pessoas sem contexto comercial' },
  { key: 'spam', label: 'Spam', description: 'Conteúdo irrelevante, propaganda, bots' },
  { key: 'other', label: 'Outro', description: 'Não se encaixa em nenhuma categoria' },
];

export function AIKnowledgeBaseSettings({ projectId }: AIKnowledgeBaseSettingsProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<KnowledgeBase>>({
    business_name: '',
    business_description: '',
    target_audience: '',
    products_services: '',
    tone_of_voice: 'profissional e amigável',
    custom_categories: defaultCategories,
    faqs: [],
    commercial_keywords: ['preço', 'valor', 'quanto custa', 'comprar', 'quero', 'onde compro', 'link', 'tem disponível'],
    praise_keywords: ['parabéns', 'excelente', 'incrível', 'maravilhoso', 'amei', 'adorei', 'perfeito', 'sensacional'],
    spam_keywords: ['ganhe dinheiro', 'clique aqui', 'sorteio', 'promoção fake'],
    auto_classify_new_comments: false,
    min_intent_score_for_crm: 50,
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newPraiseKeyword, setNewPraiseKeyword] = useState('');
  const [newSpamKeyword, setNewSpamKeyword] = useState('');
  const [newFaq, setNewFaq] = useState<FAQ>({ question: '', answer: '' });

  // Fetch existing knowledge base
  const { data: knowledgeBase, isLoading } = useQuery({
    queryKey: ['ai_knowledge_base', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Parse JSON fields
      return {
        ...data,
        custom_categories: (data.custom_categories as unknown as CustomCategory[]) || defaultCategories,
        faqs: (data.faqs as unknown as FAQ[]) || [],
      } as KnowledgeBase;
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (knowledgeBase) {
      setFormData({
        ...knowledgeBase,
        custom_categories: knowledgeBase.custom_categories || defaultCategories,
        faqs: knowledgeBase.faqs || [],
        commercial_keywords: knowledgeBase.commercial_keywords || [],
        praise_keywords: (knowledgeBase as any).praise_keywords || [],
        spam_keywords: knowledgeBase.spam_keywords || [],
      });
    }
  }, [knowledgeBase]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const dataToSave = {
        project_id: projectId,
        business_name: formData.business_name || null,
        business_description: formData.business_description || null,
        target_audience: formData.target_audience || null,
        products_services: formData.products_services || null,
        tone_of_voice: formData.tone_of_voice || 'profissional e amigável',
        custom_categories: JSON.parse(JSON.stringify(formData.custom_categories || [])),
        faqs: JSON.parse(JSON.stringify(formData.faqs || [])),
        commercial_keywords: formData.commercial_keywords,
        praise_keywords: formData.praise_keywords,
        spam_keywords: formData.spam_keywords,
        auto_classify_new_comments: formData.auto_classify_new_comments,
        min_intent_score_for_crm: formData.min_intent_score_for_crm,
      };

      const { error } = await supabase
        .from('ai_knowledge_base')
        .upsert(dataToSave, { onConflict: 'project_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_knowledge_base', projectId] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving knowledge base:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const addCommercialKeyword = () => {
    if (newKeyword.trim() && !formData.commercial_keywords?.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        commercial_keywords: [...(formData.commercial_keywords || []), newKeyword.trim()],
      });
      setNewKeyword('');
    }
  };

  const removeCommercialKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      commercial_keywords: formData.commercial_keywords?.filter(k => k !== keyword),
    });
  };

  const addPraiseKeyword = () => {
    if (newPraiseKeyword.trim() && !formData.praise_keywords?.includes(newPraiseKeyword.trim())) {
      setFormData({
        ...formData,
        praise_keywords: [...(formData.praise_keywords || []), newPraiseKeyword.trim()],
      });
      setNewPraiseKeyword('');
    }
  };

  const removePraiseKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      praise_keywords: formData.praise_keywords?.filter(k => k !== keyword),
    });
  };

  const addSpamKeyword = () => {
    if (newSpamKeyword.trim() && !formData.spam_keywords?.includes(newSpamKeyword.trim())) {
      setFormData({
        ...formData,
        spam_keywords: [...(formData.spam_keywords || []), newSpamKeyword.trim()],
      });
      setNewSpamKeyword('');
    }
  };

  const removeSpamKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      spam_keywords: formData.spam_keywords?.filter(k => k !== keyword),
    });
  };

  const addFaq = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      setFormData({
        ...formData,
        faqs: [...(formData.faqs || []), newFaq],
      });
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    setFormData({
      ...formData,
      faqs: formData.faqs?.filter((_, i) => i !== index),
    });
  };

  const updateCategory = (index: number, field: keyof CustomCategory, value: string) => {
    const updated = [...(formData.custom_categories || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, custom_categories: updated });
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
            Base de Conhecimento da IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure o contexto do seu negócio para classificação mais precisa dos comentários
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={['business', 'categories']} className="space-y-4">
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
                  placeholder="Ex: Alice Salazar Maquiagem"
                  value={formData.business_name || ''}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone_of_voice">Tom de Voz</Label>
                <Input
                  id="tone_of_voice"
                  placeholder="Ex: profissional e amigável"
                  value={formData.tone_of_voice || ''}
                  onChange={(e) => setFormData({ ...formData, tone_of_voice: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_description">Descrição do Negócio</Label>
              <Textarea
                id="business_description"
                placeholder="Descreva o que sua empresa faz, principais produtos/serviços..."
                value={formData.business_description || ''}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_audience" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Público-Alvo
                </Label>
                <Textarea
                  id="target_audience"
                  placeholder="Quem são seus clientes ideais? Faixa etária, interesses..."
                  value={formData.target_audience || ''}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="products_services" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Produtos/Serviços
                </Label>
                <Textarea
                  id="products_services"
                  placeholder="Liste seus principais produtos e serviços..."
                  value={formData.products_services || ''}
                  onChange={(e) => setFormData({ ...formData, products_services: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Categories */}
        <AccordionItem value="categories" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Categorias de Classificação</span>
              <Badge variant="secondary" className="ml-2">
                {formData.custom_categories?.length || 0}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Personalize as categorias usadas pela IA para classificar os comentários.
            </p>
            {formData.custom_categories?.map((cat, index) => (
              <div key={cat.key} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-2 cursor-grab" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Chave (ex: praise)"
                    value={cat.key}
                    onChange={(e) => updateCategory(index, 'key', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Input
                    placeholder="Label (ex: Elogio)"
                    value={cat.label}
                    onChange={(e) => updateCategory(index, 'label', e.target.value)}
                  />
                  <Input
                    placeholder="Descrição"
                    value={cat.description}
                    onChange={(e) => updateCategory(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* Keywords */}
        <AccordionItem value="keywords" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Palavras-Chave</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* Commercial Keywords */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-green-600">
                <ShoppingBag className="h-4 w-4" />
                Interesse Comercial
              </Label>
              <p className="text-xs text-muted-foreground">
                Palavras que indicam intenção de compra (aumentam o intent_score)
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.commercial_keywords?.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button onClick={() => removeCommercialKeyword(keyword)}>
                      <Trash2 className="h-3 w-3 hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra-chave..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCommercialKeyword()}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={addCommercialKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Praise Keywords */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-amber-500">
                <Sparkles className="h-4 w-4" />
                Elogio / Feedback Positivo
              </Label>
              <p className="text-xs text-muted-foreground">
                Palavras que indicam elogios ou feedback positivo
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.praise_keywords?.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="gap-1 border-amber-500 text-amber-500">
                    {keyword}
                    <button onClick={() => removePraiseKeyword(keyword)}>
                      <Trash2 className="h-3 w-3 hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra de elogio..."
                  value={newPraiseKeyword}
                  onChange={(e) => setNewPraiseKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPraiseKeyword()}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={addPraiseKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Spam Keywords */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Spam / Irrelevante
              </Label>
              <p className="text-xs text-muted-foreground">
                Palavras que indicam spam ou conteúdo irrelevante
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.spam_keywords?.map((keyword) => (
                  <Badge key={keyword} variant="destructive" className="gap-1">
                    {keyword}
                    <button onClick={() => removeSpamKeyword(keyword)}>
                      <Trash2 className="h-3 w-3 hover:text-white" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra de spam..."
                  value={newSpamKeyword}
                  onChange={(e) => setNewSpamKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSpamKeyword()}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={addSpamKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* FAQs */}
        <AccordionItem value="faqs" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>FAQs e Informações</span>
              <Badge variant="secondary" className="ml-2">
                {formData.faqs?.length || 0}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Adicione perguntas frequentes para a IA usar como referência (útil para futuras auto-respostas).
            </p>
            
            {formData.faqs?.map((faq, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-sm">{faq.question}</p>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFaq(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            <Card className="p-4 border-dashed">
              <div className="space-y-3">
                <Input
                  placeholder="Pergunta frequente..."
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                />
                <Textarea
                  placeholder="Resposta..."
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  rows={2}
                />
                <Button variant="outline" size="sm" onClick={addFaq} disabled={!newFaq.question || !newFaq.answer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar FAQ
                </Button>
              </div>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Settings */}
        <AccordionItem value="settings" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Configurações de Processamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Classificação Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Processar novos comentários automaticamente com IA
                </p>
              </div>
              <Switch
                checked={formData.auto_classify_new_comments}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_classify_new_comments: checked })}
              />
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <Label>Score Mínimo para CRM</Label>
              <p className="text-sm text-muted-foreground">
                Comentários com intent_score acima deste valor serão automaticamente vinculados ao CRM
              </p>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.min_intent_score_for_crm || 50}
                  onChange={(e) => setFormData({ ...formData, min_intent_score_for_crm: parseInt(e.target.value) || 50 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">de 0 a 100</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
