import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, MoreHorizontal, Trash2, Edit, ExternalLink, Copy, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSurveys, SURVEY_OBJECTIVES, Survey } from '@/hooks/useSurveys';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  active: { label: 'Ativa', variant: 'default' },
  archived: { label: 'Arquivada', variant: 'outline' },
};

export default function Surveys() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { surveys, isLoading, createSurvey, deleteSurvey } = useSurveys();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSurvey, setNewSurvey] = useState({ name: '', description: '', objective: 'general' });

  const handleCreate = async () => {
    if (!newSurvey.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    const result = await createSurvey.mutateAsync(newSurvey);
    setShowCreateDialog(false);
    setNewSurvey({ name: '', description: '', objective: 'general' });
    navigate(`/surveys/${result.id}`);
  };

  const handleDelete = async (survey: Survey) => {
    if (confirm(`Excluir pesquisa "${survey.name}"? Esta ação não pode ser desfeita.`)) {
      await deleteSurvey.mutateAsync(survey.id);
    }
  };

  const copyPublicLink = (survey: Survey) => {
    if (!survey.slug) {
      toast({ title: 'Pesquisa sem link público', description: 'Defina um slug nas configurações', variant: 'destructive' });
      return;
    }
    const url = `${window.location.origin}/s/${survey.slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Pesquisa Inteligente" />
        <CRMSubNav />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Pesquisa Inteligente" />
      <CRMSubNav
        rightContent={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Pesquisa
          </Button>
        }
      />

      <main className="container mx-auto px-6 py-6">
        {surveys && surveys.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma pesquisa criada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira pesquisa para coletar dados declarados dos seus contatos.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pesquisa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {surveys?.map((survey) => (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{survey.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {survey.description || 'Sem descrição'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/surveys/${survey.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/surveys/${survey.id}/responses`)}>
                          <BarChart2 className="h-4 w-4 mr-2" />
                          Ver Respostas
                        </DropdownMenuItem>
                        {survey.slug && (
                          <>
                            <DropdownMenuItem onClick={() => copyPublicLink(survey)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/s/${survey.slug}`, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir Pesquisa
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(survey)}
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
                    <Badge variant={STATUS_BADGES[survey.status]?.variant || 'secondary'}>
                      {STATUS_BADGES[survey.status]?.label || survey.status}
                    </Badge>
                    <Badge variant="outline">
                      {SURVEY_OBJECTIVES.find(o => o.value === survey.objective)?.label || survey.objective}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criada em {format(new Date(survey.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
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
            <DialogTitle>Nova Pesquisa</DialogTitle>
            <DialogDescription>
              Crie uma pesquisa para coletar dados declarados dos seus contatos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Pesquisa *</Label>
              <Input
                id="name"
                value={newSurvey.name}
                onChange={(e) => setNewSurvey({ ...newSurvey, name: e.target.value })}
                placeholder="Ex: Pesquisa NPS Q1 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Select
                value={newSurvey.objective}
                onValueChange={(value) => setNewSurvey({ ...newSurvey, objective: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SURVEY_OBJECTIVES.map((obj) => (
                    <SelectItem key={obj.value} value={obj.value}>
                      {obj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newSurvey.description}
                onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                placeholder="Descreva o objetivo desta pesquisa..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createSurvey.isPending}>
              {createSurvey.isPending ? 'Criando...' : 'Criar Pesquisa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
