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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Loader2, CheckCircle, XCircle, Pencil, Search } from 'lucide-react';
import { CuboBrand } from '@/components/CuboLogo';
import { CubeLoader } from '@/components/CubeLoader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserAvatar } from '@/components/UserAvatar';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    can_create_projects: false,
    max_projects: 0,
    is_active: true,
  });

  // Check if current user is admin
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

      if (data?.role !== 'admin') {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para acessar esta página', variant: 'destructive' });
        navigate('/projects');
        return;
      }

      setIsAdmin(true);
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
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          can_create_projects: editForm.can_create_projects,
          max_projects: editForm.max_projects,
          is_active: editForm.is_active,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

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
                <h1 className="text-xl font-bold text-foreground font-display">
                  Administração de Usuários
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie permissões e limites de projetos
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

      <main className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Usuários Cadastrados</CardTitle>
                  <CardDescription>{users.length} usuários no sistema</CardDescription>
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
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
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
      </main>
    </div>
  );
};

export default Admin;
