import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileQuestion, MoreHorizontal, Trash2, Edit, ExternalLink, Copy, BarChart2, Files, Lock, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuizzes, QUIZ_TYPES } from '@/hooks/useQuizzes';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { useProject } from '@/contexts/ProjectContext';

export default function Quizzes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProject } = useProject();
  const { quizzes, isLoading, questionCounts, responseCounts, createQuiz, deleteQuiz, updateQuiz } = useQuizzes();
  const { isModuleEnabled, isLoading: isLoadingModules } = useProjectModules();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ 
    name: '', 
    description: '', 
    type: 'lead',
    requires_identification: true,
    allow_anonymous: false,
  });

  const insightsEnabled = isModuleEnabled('insights');

  // Show module disabled state
  if (!isLoadingModules && !insightsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Quizzes" />
        <CRMSubNav />
        <main className="container mx-auto px-6 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Módulo não habilitado</h3>
              <p className="text-muted-foreground mb-4">
                O módulo de Insights não está ativo para este projeto.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador para ativar este módulo.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newQuiz.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    const result = await createQuiz.mutateAsync(newQuiz);
    setShowCreateDialog(false);
    setNewQuiz({ name: '', description: '', type: 'lead', requires_identification: true, allow_anonymous: false });
    navigate(`/quizzes/${result.id}`);
  };

  const handleDelete = async (quiz: any) => {
    if (confirm(`Excluir quiz "${quiz.name}"? Esta ação não pode ser desfeita.`)) {
      await deleteQuiz.mutateAsync(quiz.id);
    }
  };

  const handleToggleActive = async (quiz: any) => {
    await updateQuiz.mutateAsync({ id: quiz.id, is_active: !quiz.is_active });
  };

  const copyPublicLink = (quiz: any) => {
    const url = `${window.location.origin}/q/${quiz.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  if (isLoading || isLoadingModules) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Quizzes" />
        <CRMSubNav />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Quizzes" />
      <CRMSubNav 
        rightContent={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Quiz
          </Button>
        }
      />

      <main className="container mx-auto px-6 py-6">
        {quizzes && quizzes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum quiz criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro quiz para qualificar leads e entender o perfil dos seus contatos.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes?.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{quiz.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {quiz.description || 'Sem descrição'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/quizzes/${quiz.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/quizzes/${quiz.id}/results`)}>
                          <BarChart2 className="h-4 w-4 mr-2" />
                          Ver Resultados
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyPublicLink(quiz)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/q/${quiz.id}`, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir Quiz
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(quiz)}>
                          {quiz.is_active ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(quiz)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                      {quiz.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">
                      {QUIZ_TYPES.find(t => t.value === quiz.type)?.label || quiz.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{questionCounts[quiz.id] || 0} perguntas</span>
                    <span>{responseCounts[quiz.id] || 0} respostas</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em {format(new Date(quiz.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Quiz</DialogTitle>
            <DialogDescription>
              Crie um quiz para qualificar leads e entender o perfil dos seus contatos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Quiz *</Label>
              <Input
                id="name"
                value={newQuiz.name}
                onChange={(e) => setNewQuiz({ ...newQuiz, name: e.target.value })}
                placeholder="Ex: Quiz de Qualificação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={newQuiz.type}
                onValueChange={(value) => setNewQuiz({ ...newQuiz, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newQuiz.description}
                onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                placeholder="Descreva o objetivo deste quiz..."
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requer Identificação</Label>
                <p className="text-xs text-muted-foreground">Solicitar dados do lead antes de finalizar</p>
              </div>
              <Switch
                checked={newQuiz.requires_identification}
                onCheckedChange={(checked) => setNewQuiz({ ...newQuiz, requires_identification: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir Anônimo</Label>
                <p className="text-xs text-muted-foreground">Permitir respostas sem identificação</p>
              </div>
              <Switch
                checked={newQuiz.allow_anonymous}
                onCheckedChange={(checked) => setNewQuiz({ ...newQuiz, allow_anonymous: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createQuiz.isPending}>
              {createQuiz.isPending ? 'Criando...' : 'Criar Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
