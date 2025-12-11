import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Loader2, CheckCircle, XCircle, Pencil, Search, Shield, ShieldCheck, UserCog, Activity, CreditCard, Bell, FolderKanban } from 'lucide-react';
import { CuboBrand } from '@/components/CuboLogo';
import { CubeLoader } from '@/components/CubeLoader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserAvatar } from '@/components/UserAvatar';
import { SubscriptionsManager } from '@/components/admin/SubscriptionsManager';
import { NotificationSettingsManager } from '@/components/admin/NotificationSettingsManager';
import { ProjectsManager } from '@/components/admin/ProjectsManager';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  can_create_projects: boolean;
  max_projects: number;
  is_active: boolean;
  created_at: string;
  project_count?: number;
  role?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    can_create_projects: false,
    max_projects: 0,
    is_active: true,
    role: 'user' as string,
  });

  // Check if current user is admin or super_admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.role !== 'admin' && data?.role !== 'super_admin') {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para acessar esta página', variant: 'destructive' });
        navigate('/projects');
        return;
      }

      setIsAdmin(true);
      setIsSuperAdmin(data?.role === 'super_admin');
      fetchUsers();
    };

    checkAdmin();
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for all users
      const userIds = profiles?.map(p => p.id) || [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Fetch project counts
      const { data: projectCounts } = await supabase
        .from('projects')
        .select('user_id');

      const countMap: Record<string, number> = {};
      projectCounts?.forEach(p => {
        countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
      });

      const roleMap: Record<string, string> = {};
      roles?.forEach(r => {
        roleMap[r.user_id] = r.role;
      });

      const enrichedUsers: UserProfile[] = (profiles || []).map(p => ({
        ...p,
        project_count: countMap[p.id] || 0,
        role: roleMap[p.id] || 'user',
      }));

      setUsers(enrichedUsers);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar usuários', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (userProfile: UserProfile) => {
    setEditingUser(userProfile);
    setEditForm({
      can_create_projects: userProfile.can_create_projects,
      max_projects: userProfile.max_projects,
      is_active: userProfile.is_active,
      role: userProfile.role || 'user',
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      // Update profile permissions
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          can_create_projects: editForm.can_create_projects,
          max_projects: editForm.max_projects,
          is_active: editForm.is_active,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role if super_admin and role changed
      if (isSuperAdmin && editForm.role !== editingUser.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editForm.role as 'admin' | 'super_admin' | 'user' })
          .eq('user_id', editingUser.id);

        if (roleError) throw roleError;
      }

      toast({ title: 'Usuário atualizado com sucesso!' });
      setIsEditOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    canCreate: users.filter(u => u.can_create_projects).length,
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Verificando permissões..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-cube">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CuboBrand size="md" />
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground font-display">
                    {isSuperAdmin ? 'Super Admin' : 'Administração'}
                  </h1>
                  {isSuperAdmin && (
                    <Badge variant="destructive" className="text-xs">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isSuperAdmin ? 'Controle total do sistema' : 'Gerencie permissões e limites'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <ThemeToggle />
              <UserAvatar size="sm" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Assinaturas
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="projects" className="gap-2">
                <FolderKanban className="h-4 w-4" />
                Projetos
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total de Usuários</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Activity className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.active}</p>
                      <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Shield className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.admins}</p>
                      <p className="text-xs text-muted-foreground">Administradores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <UserCog className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.canCreate}</p>
                      <p className="text-xs text-muted-foreground">Podem Criar Projetos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Usuários Cadastrados</CardTitle>
                  <CardDescription>{filteredUsers.length} usuários encontrados</CardDescription>
                </div>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email ou nome..."
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pode Criar Projetos</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Projetos Atuais</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.full_name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'super_admin' ? 'destructive' : u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
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
                      {u.can_create_projects ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {u.max_projects === 0 ? 'Ilimitado' : u.max_projects}
                    </TableCell>
                    <TableCell>{u.project_count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(u)}
                        disabled={u.id === user?.id}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Permissões</DialogTitle>
                  <DialogDescription>
                    {editingUser?.full_name || editingUser?.email}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Role selector - only for super_admin */}
                  {isSuperAdmin && (
                    <div className="space-y-2">
                      <Label>Função (Role)</Label>
                      <Select
                        value={editForm.role}
                        onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Define o nível de acesso do usuário no sistema
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Conta Ativa</Label>
                      <p className="text-sm text-muted-foreground">
                        Usuários inativos não podem acessar o sistema
                      </p>
                    </div>
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pode Criar Projetos</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite criar novos projetos no sistema
                      </p>
                    </div>
                    <Switch
                      checked={editForm.can_create_projects}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, can_create_projects: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Limite de Projetos</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      0 = Ilimitado
                    </p>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.max_projects}
                      onChange={(e) => setEditForm({ ...editForm, max_projects: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsManager />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="projects">
              <ProjectsManager />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="notifications">
              <NotificationSettingsManager />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
