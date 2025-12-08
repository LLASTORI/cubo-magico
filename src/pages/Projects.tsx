import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, Project } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen, Trash2, LogOut, ArrowRight, Loader2, Key, CheckCircle2, XCircle, Zap, Pencil, Users, Mail, Crown, Shield, User, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CuboBrand } from '@/components/CuboLogo';
import { CubeLoader } from '@/components/CubeLoader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserAvatar } from '@/components/UserAvatar';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import { TeamManagementDialog } from '@/components/TeamManagementDialog';
import { PendingInvitesDialog } from '@/components/PendingInvitesDialog';
import { useMyInvites, ProjectRole, getRoleLabel } from '@/hooks/useProjectMembers';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectCredentialStatus {
  is_configured: boolean;
  is_validated: boolean;
}

interface ProjectWithRole extends Project {
  userRole?: ProjectRole;
}

const getRoleIcon = (role: ProjectRole) => {
  switch (role) {
    case 'owner': return <Crown className="w-3 h-3" />;
    case 'manager': return <Shield className="w-3 h-3" />;
    case 'operator': return <User className="w-3 h-3" />;
  }
};

const Projects = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { projects, currentProject, setCurrentProject, createProject, updateProject, deleteProject, saveCredentials, markCredentialsValidated, loading, refreshCredentials, refreshProjects } = useProject();
  const { toast } = useToast();
  const { invites: myInvites } = useMyInvites();
  const { canCreateProjects, maxProjects, currentProjectCount, isAdmin, refreshPermissions } = useUserPermissions();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isInvitesOpen, setIsInvitesOpen] = useState(false);
  const [isNoPermissionOpen, setIsNoPermissionOpen] = useState(false);

  // Auto-open invites dialog when user has pending invites
  useEffect(() => {
    if (myInvites.length > 0 && !loading) {
      setIsInvitesOpen(true);
    }
  }, [myInvites.length, loading]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [editProject, setEditProject] = useState({ name: '', description: '' });
  const [credentials, setCredentials] = useState({ client_id: '', client_secret: '', basic_auth: '' });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [projectCredentials, setProjectCredentials] = useState<Record<string, ProjectCredentialStatus>>({});
  const [projectRoles, setProjectRoles] = useState<Record<string, ProjectRole>>({});

  // Fetch credentials status and user roles for all projects
  useEffect(() => {
    const fetchProjectData = async () => {
      if (projects.length === 0 || !user) return;
      
      const projectIds = projects.map(p => p.id);
      
      // Fetch credentials
      const { data: credData } = await supabase
        .from('project_credentials')
        .select('project_id, is_configured, is_validated')
        .in('project_id', projectIds);
      
      if (credData) {
        const statusMap: Record<string, ProjectCredentialStatus> = {};
        credData.forEach(cred => {
          statusMap[cred.project_id] = {
            is_configured: cred.is_configured || false,
            is_validated: cred.is_validated || false,
          };
        });
        setProjectCredentials(statusMap);
      }

      // Fetch user roles
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id)
        .in('project_id', projectIds);

      if (memberData) {
        const rolesMap: Record<string, ProjectRole> = {};
        memberData.forEach(m => {
          rolesMap[m.project_id] = m.role as ProjectRole;
        });
        setProjectRoles(rolesMap);
      }
    };
    
    fetchProjectData();
  }, [projects, user]);

  const handleCreateProject = async () => {
    if (!canCreateProjects) {
      toast({ 
        title: 'Sem permissão', 
        description: 'Você não tem autorização para criar projetos. Entre em contato com o administrador.',
        variant: 'destructive' 
      });
      return;
    }

    if (!newProject.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { data, error } = await createProject(newProject.name, newProject.description || undefined);
    setSubmitting(false);

    if (error) {
      // Check if it's a RLS policy error
      if (error.message?.includes('row-level security') || error.code === '42501') {
        toast({ 
          title: 'Sem permissão', 
          description: 'Você atingiu o limite de projetos ou não tem autorização. Entre em contato com o administrador.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Erro ao criar projeto', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Projeto criado! Configure as credenciais para continuar.' });
      setIsCreateOpen(false);
      setNewProject({ name: '', description: '' });
      refreshPermissions();
      // Open credentials dialog for new project
      if (data) {
        setSelectedProject(data);
        setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
        setIsCredentialsOpen(true);
      }
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

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setEditProject({ name: project.name, description: project.description || '' });
    setIsEditOpen(true);
  };

  const handleEditProject = async () => {
    if (!selectedProject) return;

    if (!editProject.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await updateProject(selectedProject.id, { 
      name: editProject.name.trim(), 
      description: editProject.description.trim() || null 
    });
    setSubmitting(false);

    if (error) {
      toast({ title: 'Erro ao atualizar projeto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Projeto atualizado!' });
      setIsEditOpen(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedProject) return;

    if (!credentials.client_id || !credentials.client_secret) {
      toast({ title: 'Client ID e Client Secret são obrigatórios', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await saveCredentials(selectedProject.id, credentials);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Erro ao salvar credenciais', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Credenciais salvas! Agora teste a conexão.' });
      // Update local status
      setProjectCredentials(prev => ({
        ...prev,
        [selectedProject.id]: { is_configured: true, is_validated: false }
      }));
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProject) return;

    if (!credentials.client_id || !credentials.client_secret) {
      toast({ title: 'Client ID e Client Secret são obrigatórios', variant: 'destructive' });
      return;
    }

    setTesting(true);
    try {
      // Save credentials first
      const { error: saveError } = await saveCredentials(selectedProject.id, credentials);
      if (saveError) {
        throw new Error('Erro ao salvar credenciais: ' + saveError.message);
      }

      // Wait a moment for the database to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then test connection
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/summary',
          params: {},
          projectId: selectedProject.id,
        },
      });

      if (error) throw error;

      // Mark as validated
      await markCredentialsValidated(selectedProject.id);
      
      // Update local status
      setProjectCredentials(prev => ({
        ...prev,
        [selectedProject.id]: { is_configured: true, is_validated: true }
      }));

      toast({ 
        title: '✓ Conexão bem-sucedida!', 
        description: 'Credenciais validadas. Você pode acessar o Dashboard agora.' 
      });
      
      setIsCredentialsOpen(false);
      setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
    } catch (error: any) {
      toast({ 
        title: '✗ Falha na conexão', 
        description: error.message || 'Verifique suas credenciais',
        variant: 'destructive' 
      });
    } finally {
      setTesting(false);
    }
  };

  const openCredentialsDialog = (project: Project) => {
    setSelectedProject(project);
    setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
    setIsCredentialsOpen(true);
  };

  const openTeamDialog = (project: Project) => {
    setSelectedProject(project);
    setIsTeamOpen(true);
  };

  const handleLeaveProject = async () => {
    await refreshProjects();
  };

  const handleInviteAccepted = async () => {
    await refreshProjects();
    setIsInvitesOpen(false);
  };

  const selectAndGo = (project: Project) => {
    const status = projectCredentials[project.id];
    
    if (!status?.is_validated) {
      toast({ 
        title: 'Credenciais não validadas', 
        description: 'Configure e teste as credenciais antes de acessar o Dashboard',
        variant: 'destructive' 
      });
      openCredentialsDialog(project);
      return;
    }
    
    setCurrentProject(project);
    navigate('/');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getStatusBadge = (projectId: string) => {
    const status = projectCredentials[projectId];
    
    if (!status?.is_configured) {
      return (
        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
          <XCircle className="w-3 h-3 mr-1" />
          Não configurado
        </Badge>
      );
    }
    
    if (!status?.is_validated) {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
          <Zap className="w-3 h-3 mr-1" />
          Não testado
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-green-500 border-green-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Validado
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Carregando projetos..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-cube">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CuboBrand size="md" />
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground font-display">
                  Meus Projetos
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {canCreateProjects ? (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Projeto
                      {maxProjects > 0 && (
                        <span className="text-xs opacity-70">
                          ({currentProjectCount}/{maxProjects})
                        </span>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Projeto</DialogTitle>
                      <DialogDescription>
                        Após criar, você precisará configurar e testar as credenciais da Hotmart
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
              ) : (
                <Button 
                  className="gap-2" 
                  variant="secondary" 
                  onClick={() => setIsNoPermissionOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Novo Projeto
                </Button>
              )}

              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Administração de Usuários</TooltipContent>
                </Tooltip>
              )}

              {/* Dialog for no permission to create projects */}
              <Dialog open={isNoPermissionOpen} onOpenChange={setIsNoPermissionOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criação de Projetos Não Disponível</DialogTitle>
                    <DialogDescription>
                      Seu plano atual não permite criar novos projetos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Para criar projetos, você precisa de autorização do administrador.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com o suporte ou aguarde um convite para participar de um projeto existente.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setIsNoPermissionOpen(false)}>
                      Entendi
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <NotificationsDropdown />
              {myInvites.length > 0 && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className="relative"
                  onClick={() => setIsInvitesOpen(true)}
                >
                  <Mail className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {myInvites.length}
                  </span>
                </Button>
              )}
              <ThemeToggle />
              <UserAvatar size="sm" />
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
              {canCreateProjects ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">Nenhum projeto ainda</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro projeto para começar a usar o Dashboard
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Primeiro Projeto
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">Aguardando autorização</h3>
                  <p className="text-muted-foreground mb-4">
                    Você ainda não tem permissão para criar projetos. Entre em contato com o administrador para solicitar acesso.
                  </p>
                  {myInvites.length > 0 && (
                    <Button onClick={() => setIsInvitesOpen(true)} variant="outline" className="gap-2">
                      <Mail className="w-4 h-4" />
                      Ver Convites Pendentes ({myInvites.length})
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const userRole = projectRoles[project.id];
              const isProjectOwner = project.user_id === user?.id;
              const canEdit = isProjectOwner || userRole === 'owner' || userRole === 'manager';
              const canDelete = isProjectOwner || userRole === 'owner';
              const canManageTeam = isProjectOwner || userRole === 'owner' || userRole === 'manager';

              return (
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
                      <div className="flex items-center gap-2">
                        {(isProjectOwner || userRole) && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            {getRoleIcon(isProjectOwner ? 'owner' : userRole!)}
                            {getRoleLabel(isProjectOwner ? 'owner' : userRole!)}
                          </Badge>
                        )}
                        {currentProject?.id === project.id && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Ativo
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {getStatusBadge(project.id)}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant={projectCredentials[project.id]?.is_validated ? "default" : "outline"}
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => selectAndGo(project)}
                      >
                        <ArrowRight className="w-3 h-3" />
                        Acessar
                      </Button>
                      {canManageTeam && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openTeamDialog(project)}
                          title="Gerenciar equipe"
                        >
                          <Users className="w-3 h-3" />
                        </Button>
                      )}
                      {canEdit && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(project)}
                            title="Editar projeto"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openCredentialsDialog(project)}
                            title="Credenciais"
                          >
                            <Key className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {canDelete && (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Project Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>
                Altere as informações do projeto
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Projeto</Label>
                <Input
                  id="edit-name"
                  placeholder="Nome do projeto"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Descrição (opcional)</Label>
                <Textarea
                  id="edit-desc"
                  placeholder="Descrição do projeto..."
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditProject} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credentials Dialog */}
        <Dialog open={isCredentialsOpen} onOpenChange={setIsCredentialsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Credenciais Hotmart</DialogTitle>
              <DialogDescription>
                Configure as credenciais da API Hotmart para "{selectedProject?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Você precisa configurar e <strong>testar a conexão</strong> antes de acessar o Dashboard.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID *</Label>
                <Input
                  id="client-id"
                  placeholder="Seu Client ID da Hotmart"
                  value={credentials.client_id}
                  onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret *</Label>
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
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsCredentialsOpen(false)} className="sm:mr-auto">
                Cancelar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSaveCredentials} 
                disabled={submitting || !credentials.client_id || !credentials.client_secret}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
              <Button 
                onClick={handleTestConnection} 
                disabled={testing || !credentials.client_id || !credentials.client_secret}
                className="gap-2"
              >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Salvar e Testar Conexão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Management Dialog */}
        {selectedProject && (
          <TeamManagementDialog
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            open={isTeamOpen}
            onOpenChange={setIsTeamOpen}
            onLeaveProject={handleLeaveProject}
          />
        )}

        {/* Pending Invites Dialog */}
        <PendingInvitesDialog
          open={isInvitesOpen}
          onOpenChange={setIsInvitesOpen}
          onInviteAccepted={handleInviteAccepted}
        />
      </main>
    </div>
  );
};

export default Projects;
