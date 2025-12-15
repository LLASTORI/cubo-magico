import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Activity, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithActivity {
  id: string;
  email: string;
  full_name: string;
  last_login_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  project_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  project_name?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'Criou', color: 'bg-green-500' },
  update: { label: 'Atualizou', color: 'bg-blue-500' },
  delete: { label: 'Deletou', color: 'bg-red-500' },
  login: { label: 'Login', color: 'bg-purple-500' },
  logout: { label: 'Logout', color: 'bg-gray-500' },
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'Projeto',
  funnel: 'Funil',
  offer: 'Oferta',
  member: 'Membro',
  credentials: 'Credenciais',
  meta_account: 'Conta Meta',
  pipeline_stage: 'Etapa Pipeline',
  recovery_stage: 'Etapa Recuperação',
  cadence: 'Cadência',
  contact: 'Contato',
  activity: 'Atividade',
  session: 'Sessão',
};

export const UserActivityManager = () => {
  const [users, setUsers] = useState<UserWithActivity[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with last login
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, last_login_at, is_active, created_at')
        .order('last_login_at', { ascending: false, nullsFirst: false });

      if (profilesError) throw profilesError;
      setUsers(profilesData || []);

      // Fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Enrich logs with user and project info
      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map(l => l.user_id))];
        const projectIds = [...new Set(logsData.map(l => l.project_id).filter(Boolean))];

        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds as string[]);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        const projectsMap = new Map(projectsData?.map(p => [p.id, p]) || []);

        const enrichedLogs: ActivityLog[] = logsData.map(log => ({
          ...log,
          details: typeof log.details === 'object' && log.details !== null ? log.details as Record<string, any> : null,
          user_email: usersMap.get(log.user_id)?.email,
          user_name: usersMap.get(log.user_id)?.full_name,
          project_name: log.project_id ? projectsMap.get(log.project_id)?.name : null,
        }));

        setActivityLogs(enrichedLogs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = activityLogs.filter(log =>
    log.user_email?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    log.entity_name?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(logSearchTerm.toLowerCase())
  );

  // Stats
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeUsersLast30Days = users.filter(u => 
    u.last_login_at && new Date(u.last_login_at) > thirtyDaysAgo
  ).length;

  const activeUsersLast7Days = users.filter(u => 
    u.last_login_at && new Date(u.last_login_at) > sevenDaysAgo
  ).length;

  const neverLoggedIn = users.filter(u => !u.last_login_at).length;

  const inactiveUsers = users.filter(u => 
    u.last_login_at && new Date(u.last_login_at) < thirtyDaysAgo
  ).length;

  const getBrowserFromUserAgent = (ua: string | null): string => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Outro';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activeUsersLast7Days}</p>
                <p className="text-sm text-muted-foreground">Ativos (7 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeUsersLast30Days}</p>
                <p className="text-sm text-muted-foreground">Ativos (30 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{inactiveUsers}</p>
                <p className="text-sm text-muted-foreground">Inativos (+30 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{neverLoggedIn}</p>
                <p className="text-sm text-muted-foreground">Nunca logaram</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Atividade de Usuários</TabsTrigger>
          <TabsTrigger value="logs">Logs de Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Último Acesso dos Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
                      const isInactive = lastLogin && lastLogin < thirtyDaysAgo;
                      const neverLogged = !lastLogin;

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {lastLogin ? (
                              <div className="flex flex-col">
                                <span>{format(lastLogin, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(lastLogin, { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Nunca acessou</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {neverLogged ? (
                              <Badge variant="outline" className="bg-red-100 text-red-700">
                                Nunca logou
                              </Badge>
                            ) : isInactive ? (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                                Inativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-700">
                                Ativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs de Atividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário, ação ou entidade..."
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Navegador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum log de atividade encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => {
                        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-500' };
                        const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type;

                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{log.user_name || 'Sem nome'}</span>
                                <span className="text-xs text-muted-foreground">{log.user_email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${actionInfo.color} text-white`}>
                                {actionInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{entityLabel}</span>
                                {log.entity_name && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {log.entity_name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{log.project_name || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getBrowserFromUserAgent(log.user_agent)}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
