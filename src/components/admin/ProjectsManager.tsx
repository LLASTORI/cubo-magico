import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FolderKanban, 
  Search, 
  Pencil, 
  Trash2, 
  Users, 
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  User,
  LogIn
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  public_code: string;
  max_members: number;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const ProjectsManager = () => {
  const { user } = useAuth();
  const { setCurrentProject, refreshProjects } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit dialog
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', is_active: true, max_members: 5 });
  const [saving, setSaving] = useState(false);
  
  // Members dialog
  const [viewingMembers, setViewingMembers] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Delete dialog
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Fetch all projects (super admin has access via RLS)
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get owner profiles
      const userIds = [...new Set(projectsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      profiles?.forEach(p => {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      });

      // Get member counts
      const { data: membersData } = await supabase
        .from('project_members')
        .select('project_id');

      const memberCountMap: Record<string, number> = {};
      membersData?.forEach(m => {
        memberCountMap[m.project_id] = (memberCountMap[m.project_id] || 0) + 1;
      });

      const enrichedProjects: Project[] = (projectsData || []).map(p => ({
        ...p,
        owner_name: profileMap[p.user_id]?.full_name || null,
        owner_email: profileMap[p.user_id]?.email || null,
        member_count: memberCountMap[p.id] || 0,
        max_members: p.max_members || 5,
      }));

      setProjects(enrichedProjects);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar projetos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAccessProject = async (project: Project) => {
    try {
      // Log the access
      await logAuditAction('access_project', project.id, {
        project_name: project.name,
        owner_id: project.user_id,
        owner_email: project.owner_email,
      });

      // Set as current project and navigate
      setCurrentProject({
        id: project.id,
        name: project.name,
        description: project.description,
        is_active: project.is_active,
        created_at: project.created_at,
        updated_at: project.updated_at,
        user_id: project.user_id,
        public_code: project.public_code || '',
      });
      
      toast({ title: `Acessando projeto: ${project.name}` });
      navigate('/projects');
    } catch (error: any) {
      toast({ title: 'Erro ao acessar projeto', description: error.message, variant: 'destructive' });
    }
  };

  const logAuditAction = async (action: string, targetId: string, details: Record<string, any>) => {
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action,
        target_type: 'project',
        target_id: targetId,
        details,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      name: project.name,
      description: project.description || '',
      is_active: project.is_active ?? true,
      max_members: project.max_members || 5,
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingProject) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editForm.name,
          description: editForm.description || null,
          is_active: editForm.is_active,
          max_members: editForm.max_members,
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      // Log the action
      await logAuditAction('update_project', editingProject.id, {
        previous: {
          name: editingProject.name,
          description: editingProject.description,
          is_active: editingProject.is_active,
        },
        new: editForm,
      });

      toast({ title: 'Projeto atualizado com sucesso!' });
      setIsEditOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;

    setDeleting(true);
    try {
      // Log before deleting
      await logAuditAction('delete_project', deletingProject.id, {
        project_name: deletingProject.name,
        owner_id: deletingProject.user_id,
        owner_email: deletingProject.owner_email,
      });

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProject.id);

      if (error) throw error;

      toast({ title: 'Projeto excluído com sucesso!' });
      setDeletingProject(null);
      fetchProjects();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const viewMembers = async (project: Project) => {
    setViewingMembers(project);
    setLoadingMembers(true);
    
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('id, user_id, role, joined_at')
        .eq('project_id', project.id);

      if (error) throw error;

      // Get profiles for members
      const userIds = data?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      profiles?.forEach(p => {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      });

      const enrichedMembers: ProjectMember[] = (data || []).map(m => ({
        ...m,
        profile: profileMap[m.user_id],
      }));

      setMembers(enrichedMembers);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar membros', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.is_active !== false).length,
    inactive: projects.filter(p => p.is_active === false).length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default">Dono</Badge>;
      case 'manager':
        return <Badge variant="secondary">Gerente</Badge>;
      case 'operator':
        return <Badge variant="outline">Visitante</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Projetos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Projetos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Projetos Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Projetos de Clientes</CardTitle>
                <CardDescription>{filteredProjects.length} projetos encontrados</CardDescription>
              </div>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, dono ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Dono</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      {project.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{project.owner_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{project.owner_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.is_active !== false ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500 border-red-500/30">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => viewMembers(project)}
                    >
                      <Users className="w-4 h-4" />
                      <span className={project.member_count >= project.max_members ? 'text-amber-500 font-medium' : ''}>
                        {project.member_count}/{project.max_members}
                      </span>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAccessProject(project)}
                        title="Acessar projeto"
                        className="gap-1"
                      >
                        <LogIn className="w-4 h-4" />
                        Acessar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(project)}
                        title="Editar projeto"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingProject(project)}
                        className="text-destructive hover:text-destructive"
                        title="Excluir projeto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>
              Dono: {editingProject?.owner_name || editingProject?.owner_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Projeto</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Projeto Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Projetos inativos não aparecem para o usuário
                </p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
            </div>
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Limite de Membros</Label>
                  <p className="text-xs text-muted-foreground">
                    Override manual do limite de membros (padrão do plano: {editingProject?.max_members || 5})
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editForm.max_members}
                  onChange={(e) => setEditForm({ ...editForm, max_members: parseInt(e.target.value) || 5 })}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-amber-600">
                ⚠️ Alterar este valor sobrescreve o limite definido pelo plano
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={!!viewingMembers} onOpenChange={() => setViewingMembers(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Membros do Projeto</DialogTitle>
            <DialogDescription>
              {viewingMembers?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingMembers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum membro encontrado
              </p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-8 h-8 p-1.5 bg-background rounded-full" />
                      <div>
                        <p className="font-medium">
                          {member.profile?.full_name || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(member.role)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(member.joined_at), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto <strong>{deletingProject?.name}</strong>?
              <br />
              <br />
              Esta ação é irreversível e irá remover todos os dados do projeto, incluindo vendas, funis e configurações.
              <br />
              <br />
              <span className="text-muted-foreground">
                Dono: {deletingProject?.owner_name || deletingProject?.owner_email}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir Projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
