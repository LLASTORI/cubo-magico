import { 
  BookOpen, 
  Settings2, 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  ShoppingCart, 
  HelpCircle, 
  AlertCircle, 
  Star, 
  Users, 
  Ban, 
  CheckCircle2,
  Lightbulb,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SocialListeningGuideProps {
  projectId: string;
}

const classificationGuide = [
  {
    key: 'commercial_interest',
    label: 'Interesse Comercial',
    icon: ShoppingCart,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    priority: 'ALTA',
    description: 'Usuário demonstra interesse claro em comprar ou conhecer mais sobre o produto/serviço.',
    action: 'Responder rapidamente com link de compra ou contato direto. Lead quente!',
    examples: [
      'Quanto custa?',
      'Tem parcelamento?',
      'Quero comprar, como faço?',
      'Aceita Pix?'
    ]
  },
  {
    key: 'purchase_question',
    label: 'Dúvida de Compra',
    icon: HelpCircle,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    priority: 'ALTA',
    description: 'Pergunta relacionada ao processo de compra, pagamento ou entrega.',
    action: 'Responder com informações claras sobre como comprar. Direcionar para checkout.',
    examples: [
      'Entrega em quanto tempo?',
      'Aceita cartão de crédito?',
      'Tem frete grátis?',
      'Como funciona a garantia?'
    ]
  },
  {
    key: 'product_question',
    label: 'Dúvida de Produto',
    icon: HelpCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    priority: 'MÉDIA',
    description: 'Pergunta técnica ou de uso sobre o produto/serviço.',
    action: 'Responder com informações detalhadas. Pode converter em lead.',
    examples: [
      'Funciona para iniciantes?',
      'Qual a diferença dos planos?',
      'Tem suporte técnico?',
      'Serve para meu caso?'
    ]
  },
  {
    key: 'contact_request',
    label: 'Pedido de Contato',
    icon: MessageSquare,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    priority: 'ALTA',
    description: 'Usuário quer entrar em contato direto ou receber informações.',
    action: 'Responder com canal de contato (WhatsApp, email). Alta intenção de compra.',
    examples: [
      'Qual o WhatsApp?',
      'Como falo com vocês?',
      'Podem me ligar?',
      'Quero mais informações'
    ]
  },
  {
    key: 'praise',
    label: 'Elogio',
    icon: Star,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    priority: 'BAIXA',
    description: 'Comentário positivo sobre o produto, serviço ou conteúdo.',
    action: 'Agradecer e, se apropriado, pedir depoimento ou avaliação.',
    examples: [
      'Amei o conteúdo!',
      'Vocês são demais!',
      'Melhor compra que fiz',
      '👏👏👏'
    ]
  },
  {
    key: 'complaint',
    label: 'Reclamação',
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    priority: 'URGENTE',
    description: 'Crítica, insatisfação ou problema relatado.',
    action: 'Responder IMEDIATAMENTE com empatia. Resolver em privado.',
    examples: [
      'Péssimo atendimento!',
      'Não recebi meu produto',
      'Vocês são golpistas',
      'Quero meu dinheiro de volta'
    ]
  },
  {
    key: 'friend_tag',
    label: 'Marcação de Amigo',
    icon: Users,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    priority: 'BAIXA',
    description: 'Usuário marcando amigos no comentário.',
    action: 'Geralmente não requer resposta. Bom sinal de engajamento.',
    examples: [
      '@amigo olha isso',
      '@fulano @ciclano',
      'Vem ver @amiga',
      '👆 @usuario'
    ]
  },
  {
    key: 'spam',
    label: 'Spam',
    icon: Ban,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    priority: 'IGNORAR',
    description: 'Conteúdo irrelevante, propaganda ou spam.',
    action: 'Ignorar ou ocultar. Não responder.',
    examples: [
      'Compre meu curso!',
      'Ganhe dinheiro fácil',
      'Clique no link...',
      'Promoção imperdível!!!'
    ]
  }
];

const workflowSteps = [
  {
    step: 1,
    title: 'Configure suas páginas',
    description: 'Na aba "Páginas", conecte as páginas do Facebook e Instagram que deseja monitorar.',
    icon: Settings2
  },
  {
    step: 2,
    title: 'Configure a Base de IA',
    description: 'Na aba "Base IA", preencha informações sobre seu negócio para melhorar as classificações.',
    icon: Brain
  },
  {
    step: 3,
    title: 'Sincronize os comentários',
    description: 'Clique em "Sincronizar Orgânicos" e "Sincronizar Ads" para buscar os comentários.',
    icon: TrendingUp
  },
  {
    step: 4,
    title: 'Classifique com IA',
    description: 'Clique em "Classificar IA" para processar os comentários pendentes automaticamente.',
    icon: Zap
  },
  {
    step: 5,
    title: 'Priorize respostas',
    description: 'Filtre por "Interesse Comercial" e "Dúvidas" para encontrar leads quentes.',
    icon: Target
  },
  {
    step: 6,
    title: 'Gere respostas',
    description: 'Use o botão "Gerar Resposta" para criar respostas personalizadas com IA.',
    icon: MessageSquare
  },
  {
    step: 7,
    title: 'Vincule ao CRM',
    description: 'Clique em "Vincular ao CRM" para criar contatos automaticamente dos comentaristas.',
    icon: Users
  }
];

const tips = [
  'Configure palavras-chave comerciais na Base IA para melhorar a detecção de leads',
  'Use o Intent Score para priorizar: acima de 70 indica alta probabilidade de conversão',
  'Responda reclamações em até 1 hora para evitar crises de imagem',
  'Comentários de Ads geralmente têm maior intenção comercial',
  'Elogios são ótimas oportunidades para pedir depoimentos',
  'Sincronize diariamente para não perder oportunidades'
];

export function SocialListeningGuide({ projectId }: SocialListeningGuideProps) {
  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            O que é Social Listening?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Social Listening é o monitoramento automatizado de comentários nas suas redes sociais. 
            Com inteligência artificial, identificamos automaticamente leads, dúvidas e oportunidades 
            de venda escondidas nos comentários do Instagram e Facebook.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShoppingCart className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Encontre Leads</h4>
                <p className="text-sm text-muted-foreground">
                  Identifique pessoas interessadas em comprar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Brain className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">IA Inteligente</h4>
                <p className="text-sm text-muted-foreground">
                  Classificação automática de comentários
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium">Respostas Rápidas</h4>
                <p className="text-sm text-muted-foreground">
                  Gere respostas personalizadas com IA
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
            Siga estes passos para operacionalizar o Social Listening
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
            Cada comentário é classificado automaticamente pela IA
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
                        item.priority === 'URGENTE' ? 'destructive' :
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
            comentarista se tornar um cliente. Quanto maior, mais quente é o lead.
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
                Baixa intenção. Pode responder se relevante.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
