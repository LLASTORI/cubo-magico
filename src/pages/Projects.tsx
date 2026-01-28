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

interface ProjectMemberCount {
  current: number;
  max: number;
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
  const { canCreateProjects, maxProjects, currentProjectCount, isAdmin, hasActiveSubscription, subscriptionStatus, planName, refreshPermissions } = useUserPermissions();

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
  const [projectMemberCounts, setProjectMemberCounts] = useState<Record<string, ProjectMemberCount>>({});
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch credentials status, user roles and member counts for all projects
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

      // Fetch member counts for each project
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, max_members')
        .in('id', projectIds);

      // Fetch member counts per project
      const { data: memberCountsData } = await supabase
        .from('project_members')
        .select('project_id')
        .in('project_id', projectIds);

      if (projectsData) {
        const countsMap: Record<string, ProjectMemberCount> = {};
        projectsData.forEach(p => {
          const memberCount = memberCountsData?.filter(m => m.project_id === p.id).length || 0;
          countsMap[p.id] = {
            current: memberCount,
            max: p.max_members || 5,
          };
        });
        setProjectMemberCounts(countsMap);
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

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      // Use edge function for batch deletion to avoid timeout
      const { data, error } = await supabase.functions.invoke('delete-project', {
        body: { projectId: projectToDelete.id }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({ title: 'Projeto excluído com sucesso!' });
      setProjectToDelete(null);
      setDeleteConfirmName('');
      await refreshProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({ 
        title: 'Erro ao excluir projeto', 
        description: error.message || 'Erro desconhecido', 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmName('');
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

  // Legacy credential functions removed - now handled in Settings > Integrations > Hotmart

  const openCredentialsDialog = (project: Project) => {
    setSelectedProject(project);
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
    // Navegação canônica: sempre por URL
    navigate(`/app/${project.public_code}/dashboard`);
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
      {/* Subscription Status Banner */}
      {!hasActiveSubscription && subscriptionStatus === 'expired' && (
        <div className="bg-destructive/10 border-b border-destructive/20 py-3 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Sua assinatura expirou. Renove para continuar usando todas as funcionalidades.
            </p>
            <Button size="sm" variant="destructive">
              Renovar Assinatura
            </Button>
          </div>
        </div>
      )}
      
      {hasActiveSubscription && planName && (
        <div className="bg-primary/5 border-b border-primary/10 py-2 px-6">
          <div className="container mx-auto flex items-center gap-2 text-sm">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Plano:</span>
            <span className="font-medium text-primary">{planName}</span>
            {maxProjects > 0 && (
              <span className="text-muted-foreground ml-2">
                ({currentProjectCount}/{maxProjects} projetos)
              </span>
            )}
            {subscriptionStatus === 'trial' && (
              <Badge variant="outline" className="ml-2 text-orange-500 border-orange-500/30">
                Trial
              </Badge>
            )}
          </div>
        </div>
      )}
      
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
                      {!hasActiveSubscription 
                        ? 'Você não possui uma assinatura ativa.'
                        : 'Você atingiu o limite de projetos do seu plano.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3">
                    {!hasActiveSubscription ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Para criar projetos, você precisa de uma assinatura ativa do Cubo Mágico.
                        </p>
                        {subscriptionStatus === 'expired' && (
                          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                            <p className="text-sm text-destructive font-medium">
                              Sua assinatura expirou. Renove para continuar usando a plataforma.
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Entre em contato com o suporte para adquirir um plano.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Seu plano <strong>{planName}</strong> permite até {maxProjects} projeto{maxProjects > 1 ? 's' : ''}.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Você já possui {currentProjectCount} projeto{currentProjectCount > 1 ? 's' : ''}.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Faça upgrade do seu plano para criar mais projetos.
                        </p>
                      </>
                    )}
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openTeamDialog(project)}
                              className="gap-1"
                            >
                              <Users className="w-3 h-3" />
                              <span className="text-xs">
                                {projectMemberCounts[project.id]?.current || 0}/{projectMemberCounts[project.id]?.max || 5}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Equipe: {projectMemberCounts[project.id]?.current || 0} de {projectMemberCounts[project.id]?.max || 5} membros
                          </TooltipContent>
                        </Tooltip>
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
                            onClick={() => navigate(`/app/${project.public_code}/settings`)}
                            title="Configurações"
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDeleteDialog(project)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
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

        {/* Credentials Dialog - DEPRECATED: Now redirects to Settings > Integrations > Hotmart */}
        <Dialog open={isCredentialsOpen} onOpenChange={setIsCredentialsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Hotmart</DialogTitle>
              <DialogDescription>
                A configuração de credenciais foi movida para Integrações
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Para configurar as credenciais da Hotmart, acesse:
                </p>
                <p className="text-sm font-medium mt-2">
                  Configurações → Integrações → Financeiro → Hotmart
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsCredentialsOpen(false)}>
                Fechar
              </Button>
              {selectedProject && (
                <Button 
                  onClick={() => {
                    setIsCredentialsOpen(false);
                    navigate(`/app/${selectedProject.public_code}/settings`);
                  }}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Ir para Configurações
                </Button>
              )}
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

        {/* Delete Project Confirmation Dialog */}
        <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir projeto permanentemente?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Esta ação <strong>não pode ser desfeita</strong>. Todos os dados do projeto serão excluídos permanentemente, incluindo:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Vendas sincronizadas</li>
                  <li>Funis e mapeamentos de ofertas</li>
                  <li>Dados do Meta Ads</li>
                  <li>Credenciais e configurações</li>
                  <li>Membros e convites</li>
                </ul>
                <p className="pt-2">
                  Para confirmar, digite <strong className="text-foreground">{projectToDelete?.name}</strong> abaixo:
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              placeholder="Digite o nome do projeto"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="mt-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setProjectToDelete(null); setDeleteConfirmName(''); }} disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProject}
                disabled={deleteConfirmName !== projectToDelete?.name || isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir permanentemente'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Projects;
