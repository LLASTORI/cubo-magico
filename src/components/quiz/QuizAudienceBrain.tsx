import { 
  Brain, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Lightbulb,
  Heart,
  Sparkles,
  Copy,
  Check,
  Users,
  BarChart3,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CubeLoader } from '@/components/CubeLoader';
import { 
  useQuizAudienceIntelligence,
  type AudienceIntelligence,
  type ProfileDistribution,
  type DimensionDistribution,
  type CopySuggestion
} from '@/hooks/useQuizAudienceIntelligence';

interface QuizAudienceBrainProps {
  quizId: string;
}

export function QuizAudienceBrain({ quizId }: QuizAudienceBrainProps) {
  const { data: intelligence, isLoading, error } = useQuizAudienceIntelligence(quizId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CubeLoader size="lg" />
      </div>
    );
  }

  if (error || !intelligence) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {intelligence === null 
              ? 'Nenhuma resposta ainda. A inteligência será gerada quando houver dados.'
              : 'Erro ao carregar inteligência do público.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          value={intelligence.completedResponses}
          label="Respostas Completas"
          secondary={`${intelligence.totalResponses} total`}
        />
        <StatCard
          icon={Target}
          value={intelligence.identifiedLeads}
          label="Leads Identificados"
          secondary={`${Math.round((intelligence.identifiedLeads / Math.max(1, intelligence.completedResponses)) * 100)}% taxa`}
        />
        <StatCard
          icon={BarChart3}
          value={`${Math.round(intelligence.avgScore * 100)}%`}
          label="Score Médio"
        />
        <StatCard
          icon={Brain}
          value={intelligence.primaryProfile || '-'}
          label="Perfil Dominante"
          isText
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <Brain className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="psychology" className="gap-2">
            <Heart className="h-4 w-4" />
            Psicologia
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Linguagem
          </TabsTrigger>
          <TabsTrigger value="copy" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Copy
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Semantic Profiles Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Perfis Semânticos
                </CardTitle>
                <CardDescription>
                  Distribuição dos arquétipos do público
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileDistributionBars profiles={intelligence.semanticProfiles} />
              </CardContent>
            </Card>

            {/* Decision Styles Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Estilos de Decisão
                </CardTitle>
                <CardDescription>
                  Como o público decide
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileDistributionBars profiles={intelligence.decisionStyles} />
              </CardContent>
            </Card>
          </div>

          {/* Trait and Intent Distributions */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Traços Dominantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DimensionDistributionBars dimensions={intelligence.traitDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Intenções Dominantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DimensionDistributionBars dimensions={intelligence.intentDistribution} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Psychology Tab */}
        <TabsContent value="psychology" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Dominant Pain */}
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Heart className="h-5 w-5" />
                  Dor Principal
                </CardTitle>
                <CardDescription>
                  O que mais incomoda este público
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-foreground">
                  "{intelligence.dominantPain}"
                </p>
              </CardContent>
            </Card>

            {/* Dominant Desire */}
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Sparkles className="h-5 w-5" />
                  Desejo Principal
                </CardTitle>
                <CardDescription>
                  O que este público mais quer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-foreground">
                  "{intelligence.dominantDesire}"
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo Psicológico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Este público é predominantemente <strong>{intelligence.primaryProfile}</strong>, 
                com uma abordagem <strong>{intelligence.decisionStyles[0]?.name.toLowerCase()}</strong> para decisões.
                O traço mais forte é <strong>{intelligence.traitDistribution[0]?.label}</strong> ({intelligence.traitDistribution[0]?.percentage}%), 
                e a principal intenção é <strong>{intelligence.intentDistribution[0]?.label}</strong> ({intelligence.intentDistribution[0]?.percentage}%).
              </p>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-2">✅ Esse público responde bem a:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Provas e garantias</li>
                    <li>Passo a passo claro</li>
                    <li>Resultados comprovados</li>
                    <li>Suporte e acompanhamento</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">❌ O que evitar:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Promessas exageradas</li>
                    <li>Pressão excessiva</li>
                    <li>Informações vagas</li>
                    <li>Falta de clareza</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language Tab */}
        <TabsContent value="language" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Language Style */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Estilo de Linguagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {intelligence.languageInsights.dominantStyle}
                </Badge>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tom recomendado:</p>
                  <p className="text-sm">{intelligence.languageInsights.toneRecommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Palavras-Chave
                </CardTitle>
                <CardDescription>
                  Termos que ressoam com este público
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {intelligence.languageInsights.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expanded Keywords from traits/intents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapa de Vocabulário</CardTitle>
              <CardDescription>
                Baseado nos traços e intenções dominantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium mb-2 text-green-600">✓ Use</p>
                  <div className="flex flex-wrap gap-1">
                    {['segurança', 'garantia', 'comprovado', 'resultado', 'clareza', 'confiança'].map(word => (
                      <Badge key={word} variant="outline" className="bg-green-50 border-green-200 text-green-700">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 text-blue-600">◐ Moderado</p>
                  <div className="flex flex-wrap gap-1">
                    {['urgente', 'exclusivo', 'limitado', 'rápido'].map(word => (
                      <Badge key={word} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 text-red-600">✕ Evite</p>
                  <div className="flex flex-wrap gap-1">
                    {['fácil', 'milagre', 'sem esforço', 'instantâneo'].map(word => (
                      <Badge key={word} variant="outline" className="bg-red-50 border-red-200 text-red-700">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Copy Tab */}
        <TabsContent value="copy" className="space-y-4">
          <CopySuggestionsGrid suggestions={intelligence.copySuggestions} />
        </TabsContent>
      </Tabs>

      {/* AI Data Section - Collapsible */}
      <AIDataSection intelligence={intelligence} />
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  secondary?: string;
  isText?: boolean;
}

function StatCard({ icon: Icon, value, label, secondary, isText }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className={isText ? "font-medium text-sm truncate max-w-[150px]" : "text-2xl font-bold"}>
              {value}
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {secondary && (
              <p className="text-xs text-muted-foreground">{secondary}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Profile Distribution Bars
function ProfileDistributionBars({ profiles }: { profiles: ProfileDistribution[] }) {
  if (profiles.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem dados suficientes</p>;
  }

  return (
    <div className="space-y-3">
      {profiles.slice(0, 5).map((profile, index) => (
        <div key={profile.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[180px]">{profile.name}</span>
            <span className="text-muted-foreground">{profile.percentage}%</span>
          </div>
          <Progress value={profile.percentage} className="h-2" />
        </div>
      ))}
    </div>
  );
}

// Dimension Distribution Bars
function DimensionDistributionBars({ dimensions }: { dimensions: DimensionDistribution[] }) {
  if (dimensions.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem dados suficientes</p>;
  }

  return (
    <div className="space-y-3">
      {dimensions.slice(0, 5).map((dim) => (
        <div key={dim.key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{dim.label}</span>
            <span className="text-muted-foreground">{dim.percentage}%</span>
          </div>
          <Progress value={dim.percentage} className="h-2" />
        </div>
      ))}
    </div>
  );
}

// Copy Suggestions Grid
function CopySuggestionsGrid({ suggestions }: { suggestions: CopySuggestion[] }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) acc[suggestion.type] = [];
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, CopySuggestion[]>);

  const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    headline: { label: 'Headlines', icon: Sparkles, color: 'text-purple-500' },
    promise: { label: 'Promessas', icon: Heart, color: 'text-pink-500' },
    angle: { label: 'Ângulos', icon: Target, color: 'text-blue-500' },
    pain: { label: 'Frases de Dor', icon: Heart, color: 'text-red-500' },
    desire: { label: 'Frases de Desejo', icon: Sparkles, color: 'text-green-500' },
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(groupedSuggestions).map(([type, items]) => {
        const config = typeLabels[type] || { label: type, icon: Lightbulb, color: 'text-gray-500' };
        const Icon = config.icon;

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-base flex items-center gap-2 ${config.color}`}>
                <Icon className="h-4 w-4" />
                {config.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((suggestion, index) => {
                const globalIndex = suggestions.indexOf(suggestion);
                return (
                  <div 
                    key={index} 
                    className="group flex items-start justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <p className="text-sm flex-1 pr-2">{suggestion.text}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(suggestion.text, globalIndex)}
                    >
                      {copiedIndex === globalIndex ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// AI Data Section (Collapsible)
function AIDataSection({ intelligence }: { intelligence: AudienceIntelligence }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-dashed">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="text-sm flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Dados para IA (vetores e métricas)
          </span>
          <span>{isOpen ? '▼' : '▶'}</span>
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Vetor de Traços Médio</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(intelligence.aggregatedVectors.traits, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Vetor de Intenções Médio</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(intelligence.aggregatedVectors.intents, null, 2)}
              </pre>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Endpoint para IA</p>
            <code className="text-xs bg-muted p-2 rounded block">
              GET /api/quiz-audience-intelligence?quiz_id={'{quiz_id}'}&project_id={'{project_id}'}
            </code>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
