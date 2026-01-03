import { 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Smile,
  HelpCircle,
  DollarSign,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  Zap,
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SurveyAnalysisGuideProps {
  projectId: string;
}

const classificationGuide = [
  {
    key: 'high_intent',
    label: 'Alta Intenção de Compra',
    icon: Target,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    priority: 'ALTA',
    description: 'Respostas que demonstram interesse claro em adquirir o produto ou serviço.',
    action: 'Priorizar para follow-up imediato. Lead quente para conversão.',
    examples: [
      'Quero muito fazer o curso',
      'Como faço para comprar?',
      'Estou decidido a investir',
      'Preciso resolver isso urgente'
    ]
  },
  {
    key: 'pain_point',
    label: 'Dor do Cliente',
    icon: AlertCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    priority: 'ALTA',
    description: 'Respostas que revelam frustrações, problemas ou necessidades não atendidas.',
    action: 'Oportunidade para demonstrar valor. Usar a dor na comunicação.',
    examples: [
      'Já tentei de tudo e não funciona',
      'Estou frustrado com...',
      'Meu maior problema é...',
      'Preciso de ajuda com...'
    ]
  },
  {
    key: 'price_objection',
    label: 'Objeção de Preço',
    icon: DollarSign,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    priority: 'MÉDIA',
    description: 'Respostas que indicam preocupação com valor ou custo.',
    action: 'Trabalhar percepção de valor. Oferecer condições especiais se apropriado.',
    examples: [
      'Acho caro para minha realidade',
      'Não tenho condições agora',
      'O investimento é alto',
      'Preciso de desconto'
    ]
  },
  {
    key: 'confusion',
    label: 'Dúvida/Confusão',
    icon: HelpCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    priority: 'MÉDIA',
    description: 'Respostas que demonstram falta de clareza sobre o produto ou processo.',
    action: 'Esclarecer dúvidas. Melhorar comunicação e FAQ.',
    examples: [
      'Não entendi como funciona',
      'O que está incluído?',
      'Qual a diferença entre...',
      'Não sei se serve para mim'
    ]
  },
  {
    key: 'feature_request',
    label: 'Pedido de Funcionalidade',
    icon: Lightbulb,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    priority: 'BAIXA',
    description: 'Sugestões de melhorias ou funcionalidades desejadas.',
    action: 'Documentar para roadmap. Pode indicar gaps no produto.',
    examples: [
      'Seria legal se tivesse...',
      'Gostaria que vocês oferecessem...',
      'Falta isso no curso',
      'Poderiam incluir...'
    ]
  },
  {
    key: 'satisfaction',
    label: 'Satisfação',
    icon: Smile,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    priority: 'BAIXA',
    description: 'Feedback positivo, elogios e satisfação geral.',
    action: 'Solicitar depoimento/avaliação. Potencial promotor.',
    examples: [
      'Adorei o conteúdo!',
      'Muito satisfeito com o resultado',
      'Excelente qualidade',
      'Recomendo para todos'
    ]
  },
  {
    key: 'neutral',
    label: 'Neutro/Informativo',
    icon: HelpCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    priority: 'BAIXA',
    description: 'Respostas informativas sem clara intenção ou emoção.',
    action: 'Monitorar. Pode necessitar de mais contexto.',
    examples: [
      'Trabalho com marketing',
      'Tenho 3 anos de experiência',
      'Uso principalmente Instagram',
      'Moro em São Paulo'
    ]
  }
];

const workflowSteps = [
  {
    step: 1,
    title: 'Configure a Base de IA',
    description: 'Na aba "Base IA", preencha informações sobre seu negócio e indicadores de classificação.',
    icon: Brain
  },
  {
    step: 2,
    title: 'Crie suas Pesquisas',
    description: 'Use o módulo de Pesquisas para criar formulários com perguntas estratégicas.',
    icon: ClipboardList
  },
  {
    step: 3,
    title: 'Colete Respostas',
    description: 'Compartilhe o link público ou integre via webhook para receber respostas.',
    icon: Users
  },
  {
    step: 4,
    title: 'Classifique com IA',
    description: 'Clique em "Classificar com IA" para processar as respostas automaticamente.',
    icon: Zap
  },
  {
    step: 5,
    title: 'Analise Insights',
    description: 'Use o Dashboard e Análise por Pesquisa para entender padrões e oportunidades.',
    icon: TrendingUp
  },
  {
    step: 6,
    title: 'Tome Ações',
    description: 'Priorize leads quentes, resolva dores e melhore a comunicação baseado nos dados.',
    icon: Target
  }
];

const tips = [
  'Configure as palavras-chave na Base IA para melhorar a precisão da classificação',
  'Use o Intent Score para priorizar: acima de 70 indica alta probabilidade de conversão',
  'Dores detectadas são oportunidades de melhorar sua copy e argumentação de vendas',
  'Respostas de satisfação podem ser transformadas em depoimentos',
  'Analise objeções de preço para ajustar estratégia de precificação ou pagamento',
  'Execute a classificação regularmente para manter os dados atualizados'
];

export function SurveyAnalysisGuide({ projectId }: SurveyAnalysisGuideProps) {
  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Análise de Pesquisas com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O módulo de Análise de Pesquisas usa inteligência artificial para classificar automaticamente 
            as respostas coletadas, identificando intenção de compra, dores, objeções e satisfação dos 
            respondentes. Isso permite priorizar leads e tomar decisões baseadas em dados.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Identifique Leads</h4>
                <p className="text-sm text-muted-foreground">
                  Descubra quem tem alta intenção de compra
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-medium">Entenda Dores</h4>
                <p className="text-sm text-muted-foreground">
                  Mapeie frustrações e problemas do público
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Brain className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">Insights Acionáveis</h4>
                <p className="text-sm text-muted-foreground">
                  Tome decisões baseadas em dados reais
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Fluxo de Trabalho Recomendado
          </CardTitle>
          <CardDescription>
            Siga estes passos para operacionalizar a análise de pesquisas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowSteps.map((item, index) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{item.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Classification Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Entendendo as Classificações
          </CardTitle>
          <CardDescription>
            Cada resposta é classificada automaticamente pela IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {classificationGuide.map((item) => (
              <AccordionItem key={item.key} value={item.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${item.bg}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                    <Badge 
                      variant={
                        item.priority === 'ALTA' ? 'default' :
                        item.priority === 'MÉDIA' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-10 space-y-3">
                    <p className="text-muted-foreground">{item.description}</p>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-1">Ação recomendada:</p>
                      <p className="text-sm text-muted-foreground">{item.action}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Exemplos:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.examples.map((example, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            "{example}"
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Dicas Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Intent Score Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            O que é Intent Score?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O Intent Score é uma pontuação de 0 a 100 que indica a probabilidade do 
            respondente se tornar um cliente. Quanto maior, mais quente é o lead.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-500">70-100</div>
              <div className="text-sm font-medium mt-1">Lead Quente 🔥</div>
              <p className="text-xs text-muted-foreground mt-1">
                Alta intenção de compra. Prioridade máxima.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-500">40-69</div>
              <div className="text-sm font-medium mt-1">Lead Morno</div>
              <p className="text-xs text-muted-foreground mt-1">
                Interesse moderado. Nurturing necessário.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <div className="text-2xl font-bold text-muted-foreground">0-39</div>
              <div className="text-sm font-medium mt-1">Lead Frio</div>
              <p className="text-xs text-muted-foreground mt-1">
                Baixa intenção. Acompanhar se relevante.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
