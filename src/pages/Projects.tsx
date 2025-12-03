import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, Project } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen, Settings, Trash2, LogOut, ArrowRight, Loader2, Key } from 'lucide-react';

const Projects = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { projects, currentProject, setCurrentProject, createProject, deleteProject, saveCredentials, loading } = useProject();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [credentials, setCredentials] = useState({ client_id: '', client_secret: '', basic_auth: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await createProject(newProject.name, newProject.description || undefined);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Erro ao criar projeto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Projeto criado!' });
      setIsCreateOpen(false);
      setNewProject({ name: '', description: '' });
    }
  };

  const handleDeleteProject = async (project: Project) => {
    const { error } = await deleteProject(project.id);
    if (error) {
      toast({ title: 'Erro ao excluir projeto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Projeto excluído' });
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedProject) return;

    setSubmitting(true);
    const { error } = await saveCredentials(selectedProject.id, credentials);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Erro ao salvar credenciais', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Credenciais salvas!' });
      setIsCredentialsOpen(false);
      setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
    }
  };

  const openCredentialsDialog = (project: Project) => {
    setSelectedProject(project);
    setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
    setIsCredentialsOpen(true);
  };

  const selectAndGo = (project: Project) => {
    setCurrentProject(project);
    navigate('/');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Meus Projetos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Projeto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Projeto</DialogTitle>
                    <DialogDescription>
                      Cada projeto pode ter suas próprias credenciais da Hotmart
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Nome do Projeto</Label>
                      <Input
                        id="project-name"
                        placeholder="Minha Loja Principal"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-desc">Descrição (opcional)</Label>
                      <Textarea
                        id="project-desc"
                        placeholder="Descrição do projeto..."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateProject} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Criar Projeto
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro projeto para começar a usar o Dashboard
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className={`transition-all hover:shadow-md ${currentProject?.id === project.id ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="mt-1">{project.description}</CardDescription>
                      )}
                    </div>
                    {currentProject?.id === project.id && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => selectAndGo(project)}
                    >
                      <ArrowRight className="w-3 h-3" />
                      Acessar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openCredentialsDialog(project)}
                    >
                      <Key className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todos os dados do projeto serão perdidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProject(project)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Credentials Dialog */}
        <Dialog open={isCredentialsOpen} onOpenChange={setIsCredentialsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Credenciais Hotmart</DialogTitle>
              <DialogDescription>
                Configure as credenciais da API Hotmart para "{selectedProject?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input
                  id="client-id"
                  placeholder="Seu Client ID da Hotmart"
                  value={credentials.client_id}
                  onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input
                  id="client-secret"
                  type="password"
                  placeholder="Seu Client Secret da Hotmart"
                  value={credentials.client_secret}
                  onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basic-auth">Basic Auth (opcional)</Label>
                <Input
                  id="basic-auth"
                  type="password"
                  placeholder="Token Basic Auth"
                  value={credentials.basic_auth}
                  onChange={(e) => setCredentials({ ...credentials, basic_auth: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCredentialsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCredentials} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Credenciais
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Projects;
