import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { ArrowLeft, Download, User, Calendar, BarChart3, Filter, Search, Lock, ExternalLink, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppHeader } from '@/components/AppHeader';
import { InsightsSubNav } from '@/components/insights/InsightsSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuiz } from '@/hooks/useQuizzes';
import { useQuizSessions } from '@/hooks/useQuizResults';
import { QuizVectorBars } from '@/components/crm/QuizVectorBars';
import { QuizAudienceBrain } from '@/components/quiz/QuizAudienceBrain';
import { CubeLoader } from '@/components/CubeLoader';
import { useProjectModules } from '@/hooks/useProjectModules';

const STATUS_LABELS: Record<string, string> = {
  started: 'Iniciado',
  in_progress: 'Em Progresso',
  completed: 'Completo',
  abandoned: 'Abandonado',
  identified: 'Identificado',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  started: 'secondary',
  in_progress: 'secondary',
  completed: 'default',
  abandoned: 'destructive',
  identified: 'default',
};

export default function QuizResults() {
  const { quizId } = useParams();
  const { navigateTo, navigate } = useProjectNavigation();
  const { quiz } = useQuiz(quizId);
  const { data: sessions, isLoading } = useQuizSessions(quizId);
  const { isModuleEnabled, isLoading: isLoadingModules } = useProjectModules();
  const [activeTab, setActiveTab] = useState('sessions');

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    minScore: '',
    maxScore: '',
    intent: 'all',
  });

  const insightsEnabled = isModuleEnabled('insights');

  // Filter sessions
  const filteredSessions = sessions?.filter(session => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const contactName = (session.crm_contacts as any)?.name?.toLowerCase() || '';
      const contactEmail = (session.crm_contacts as any)?.email?.toLowerCase() || '';
      if (!contactName.includes(searchLower) && !contactEmail.includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'all' && session.status !== filters.status) {
      return false;
    }

    // Score filter
    const result = (session.quiz_results as any)?.[0];
    if (result && filters.minScore) {
      if ((result.normalized_score || 0) < parseFloat(filters.minScore)) {
        return false;
      }
    }
    if (result && filters.maxScore) {
      if ((result.normalized_score || 0) > parseFloat(filters.maxScore)) {
        return false;
      }
    }

    // Intent filter
    if (filters.intent !== 'all' && result?.summary?.primary_intent) {
      if (result.summary.primary_intent !== filters.intent) {
        return false;
      }
    }

    return true;
  }) || [];

  // Get unique intents for filter
  const uniqueIntents = [...new Set(
    sessions?.map(s => (s.quiz_results as any)?.[0]?.summary?.primary_intent).filter(Boolean) || []
  )];

  // Stats
  const completedCount = sessions?.filter(s => s.status === 'completed').length || 0;
  const identifiedCount = sessions?.filter(s => s.contact_id).length || 0;
  const avgScore = sessions?.length 
    ? sessions.reduce((sum, s) => sum + ((s.quiz_results as any)?.[0]?.normalized_score || 0), 0) / sessions.length 
    : 0;

  const exportCSV = () => {
    if (!sessions || !quiz) return;

    const headers = ['Contato', 'Email', 'Status', 'Score', 'Intent Principal', 'Data Início', 'Data Conclusão'];
    
    const rows = sessions.map(s => {
      const contact = s.crm_contacts as any;
      const result = (s.quiz_results as any)?.[0];
      return [
        contact?.name || 'Anônimo',
        contact?.email || '',
        STATUS_LABELS[s.status] || s.status,
        result?.normalized_score?.toFixed(2) || '',
        result?.summary?.primary_intent || '',
        format(new Date(s.started_at), 'dd/MM/yyyy HH:mm'),
        s.completed_at ? format(new Date(s.completed_at), 'dd/MM/yyyy HH:mm') : '',
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-${quiz.name}.csv`;
    a.click();
  };

  if (!isLoadingModules && !insightsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Resultados do Quiz" />
        <InsightsSubNav />
        <main className="container mx-auto px-6 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Módulo não habilitado</h3>
              <p className="text-muted-foreground">
                O módulo de Insights não está ativo para este projeto.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading || isLoadingModules) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Resultados do Quiz" />
        <InsightsSubNav />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Resultados do Quiz" />
      <InsightsSubNav />
      
      {/* Header bar */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/quizzes/${quizId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{quiz?.name}</span>
            <Badge variant="secondary">{sessions?.length || 0} sessões</Badge>
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={!sessions?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{sessions?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Total de Sessões</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-sm text-muted-foreground">Completados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{identifiedCount}</div>
              <p className="text-sm text-muted-foreground">Leads Identificados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{(avgScore * 100).toFixed(0)}%</div>
              <p className="text-sm text-muted-foreground">Score Médio</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-2">
              <Brain className="h-4 w-4" />
              Inteligência do Público
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6 mt-4">

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou email..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="completed">Completo</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="abandoned">Abandonado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score Mínimo</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minScore}
                  onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Score Máximo</Label>
                <Input
                  type="number"
                  placeholder="1"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.maxScore}
                  onChange={(e) => setFilters({ ...filters, maxScore: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Intent Dominante</Label>
                <Select
                  value={filters.intent}
                  onValueChange={(value) => setFilters({ ...filters, intent: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueIntents.map(intent => (
                      <SelectItem key={intent} value={intent}>
                        {intent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sessões ({filteredSessions.length})</CardTitle>
            <CardDescription>Lista de todas as sessões do quiz</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {sessions?.length === 0 ? 'Nenhuma sessão ainda' : 'Nenhum resultado encontrado com os filtros aplicados'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Vetores</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => {
                    const contact = session.crm_contacts as any;
                    const result = (session.quiz_results as any)?.[0];
                    const summary = result?.summary;

                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{contact?.name || 'Anônimo'}</p>
                              <p className="text-xs text-muted-foreground">{contact?.email}</p>
                            </div>
                          </div>
                          {session.contact_id && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => navigate(`/crm/contact/${session.contact_id}`)}
                            >
                              Ver no CRM →
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_COLORS[session.status] || 'secondary'}>
                            {STATUS_LABELS[session.status] || session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result?.normalized_score !== undefined ? (
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{(result.normalized_score * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {summary?.primary_intent ? (
                            <Badge variant="outline">{summary.primary_intent}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {summary?.top_intents && Object.keys(summary.top_intents).length > 0 ? (
                            <div className="w-48">
                              <QuizVectorBars 
                                vector={summary.top_intents} 
                                type="intent" 
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(session.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.contact_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/crm/contact/${session.contact_id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="intelligence" className="mt-4">
            <QuizAudienceBrain quizId={quizId!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
