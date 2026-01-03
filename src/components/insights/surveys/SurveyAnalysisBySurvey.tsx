import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Target,
  AlertCircle,
  Brain,
  RefreshCw,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSurveyAnalysisResponses, useProcessSurveyAI } from '@/hooks/useSurveyAnalysis';
import { useSurveys } from '@/hooks/useSurveys';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SurveyAnalysisBySurveyProps {
  projectId: string;
}

const classificationConfig: Record<string, { label: string; color: string }> = {
  high_intent: { label: 'Alta Intenção', color: 'text-green-500' },
  pain_point: { label: 'Dor do Cliente', color: 'text-orange-500' },
  price_objection: { label: 'Objeção de Preço', color: 'text-red-500' },
  confusion: { label: 'Dúvida/Confusão', color: 'text-blue-500' },
  feature_request: { label: 'Pedido de Funcionalidade', color: 'text-purple-500' },
  satisfaction: { label: 'Satisfação', color: 'text-green-400' },
  neutral: { label: 'Neutro', color: 'text-gray-500' },
};

const sentimentConfig: Record<string, { label: string; icon: any; color: string }> = {
  positive: { label: 'Positivo', icon: TrendingUp, color: 'text-green-500' },
  neutral: { label: 'Neutro', icon: Minus, color: 'text-gray-500' },
  negative: { label: 'Negativo', icon: TrendingDown, color: 'text-red-500' },
};

export function SurveyAnalysisBySurvey({ projectId }: SurveyAnalysisBySurveyProps) {
  const [filters, setFilters] = useState({
    surveyId: 'all',
    classification: 'all',
    sentiment: 'all',
  });

  const { surveys } = useSurveys();
  const { data: responses, isLoading } = useSurveyAnalysisResponses(projectId, filters);
  const processAI = useProcessSurveyAI(projectId);

  const handleProcessAI = () => {
    processAI.mutate(filters.surveyId !== 'all' ? filters.surveyId : undefined);
  };

  // Calculate stats for selected survey
  const selectedSurveyStats = responses?.reduce((acc, r) => {
    acc.total++;
    if (r.classification) {
      acc.classifications[r.classification] = (acc.classifications[r.classification] || 0) + 1;
    }
    if (r.sentiment) {
      acc.sentiments[r.sentiment] = (acc.sentiments[r.sentiment] || 0) + 1;
    }
    if (r.intent_score !== null) {
      acc.totalIntent += r.intent_score;
      acc.countIntent++;
      if (r.intent_score >= 70) acc.highIntent++;
    }
    return acc;
  }, {
    total: 0,
    classifications: {} as Record<string, number>,
    sentiments: {} as Record<string, number>,
    totalIntent: 0,
    countIntent: 0,
    highIntent: 0,
  });

  const avgIntentScore = selectedSurveyStats?.countIntent 
    ? Math.round(selectedSurveyStats.totalIntent / selectedSurveyStats.countIntent) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise por Pesquisa</h2>
          <p className="text-muted-foreground">
            Visão detalhada das respostas classificadas por IA
          </p>
        </div>
        <Button 
          onClick={handleProcessAI} 
          disabled={processAI.isPending}
          className="gap-2"
        >
          {processAI.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {processAI.isPending ? 'Processando...' : 'Classificar com IA'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.surveyId}
              onValueChange={(value) => setFilters({ ...filters, surveyId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pesquisa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Pesquisas</SelectItem>
                {surveys?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.classification}
              onValueChange={(value) => setFilters({ ...filters, classification: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Classificações</SelectItem>
                {Object.entries(classificationConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sentiment}
              onValueChange={(value) => setFilters({ ...filters, sentiment: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sentimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Sentimentos</SelectItem>
                {Object.entries(sentimentConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              onClick={() => setFilters({ surveyId: 'all', classification: 'all', sentiment: 'all' })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {selectedSurveyStats && selectedSurveyStats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Respostas Analisadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedSurveyStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Intent Score Médio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Target className={`h-5 w-5 ${avgIntentScore >= 70 ? 'text-green-500' : avgIntentScore >= 40 ? 'text-yellow-500' : 'text-gray-500'}`} />
                <span className="text-2xl font-bold">{avgIntentScore}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Alta Intenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {selectedSurveyStats.highIntent}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Dores Detectadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {selectedSurveyStats.classifications.pain_point || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Respostas Analisadas
            {responses && <Badge variant="secondary">{responses.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : responses && responses.length > 0 ? (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Pesquisa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Sentimento</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Intent Score</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response: any) => {
                    const sentiment = response.sentiment ? sentimentConfig[response.sentiment] : null;
                    const classification = response.classification ? classificationConfig[response.classification] : null;
                    const SentimentIcon = sentiment?.icon;

                    return (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium">
                          {response.surveys?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{response.crm_contacts?.name || 'Anônimo'}</p>
                            <p className="text-xs text-muted-foreground">{response.crm_contacts?.email || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sentiment && SentimentIcon ? (
                            <div className={`flex items-center gap-1 ${sentiment.color}`}>
                              <SentimentIcon className="h-4 w-4" />
                              <span className="text-sm">{sentiment.label}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {classification ? (
                            <Badge variant="outline" className={classification.color}>
                              {classification.label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {response.intent_score !== null ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-10 h-2 rounded-full ${
                                  response.intent_score >= 70 ? 'bg-green-500' :
                                  response.intent_score >= 40 ? 'bg-yellow-500' : 'bg-gray-300'
                                }`}
                              />
                              <span className="text-sm font-medium">{response.intent_score}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(response.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma resposta analisada encontrada.</p>
              <p className="text-sm">Clique em "Classificar com IA" para processar as respostas.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
