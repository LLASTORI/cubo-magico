import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2,
  CheckCircle,
  XCircle,
  Boxes,
  Users,
  Facebook,
  BarChart3,
  FolderKanban,
  ShoppingCart,
  MessageCircle,
  Workflow,
  ClipboardList,
  Lightbulb,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AVAILABLE_MODULES, type ModuleKey } from '@/hooks/useProjectModules';

interface ProjectWithModules {
  id: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  modules: {
    module_key: ModuleKey;
    is_enabled: boolean;
    enabled_at: string | null;
  }[];
}

const MODULE_ICONS: Record<ModuleKey, React.ReactNode> = {
  crm: <Users className="w-4 h-4" />,
  insights: <Lightbulb className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  meta_ads: <Facebook className="w-4 h-4" />,
  hotmart: <ShoppingCart className="w-4 h-4" />,
  automation: <Workflow className="w-4 h-4" />,
  surveys: <ClipboardList className="w-4 h-4" />,
  social_listening: <MessageCircle className="w-4 h-4" />,
  ai_analysis: <Brain className="w-4 h-4" />,
};

export const ModulesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithModules[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectsWithModules();
  }, []);

  const fetchProjectsWithModules = async () => {
    setLoading(true);
    try {
      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, user_id')
        .order('name');

      if (projectsError) throw projectsError;

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

      // Fetch all modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('project_modules')
        .select('project_id, module_key, is_enabled, enabled_at');

      if (modulesError) throw modulesError;

      // Group modules by project
      const modulesByProject: Record<string, typeof modulesData> = {};
      modulesData?.forEach(m => {
        if (!modulesByProject[m.project_id]) {
          modulesByProject[m.project_id] = [];
        }
        modulesByProject[m.project_id].push(m);
      });

      // Build enriched projects
      const enrichedProjects: ProjectWithModules[] = (projectsData || []).map(p => ({
        id: p.id,
        name: p.name,
        owner_name: profileMap[p.user_id]?.full_name || null,
        owner_email: profileMap[p.user_id]?.email || null,
        modules: AVAILABLE_MODULES.map(m => {
          const existingModule = modulesByProject[p.id]?.find(pm => pm.module_key === m.key);
          return {
            module_key: m.key,
            is_enabled: existingModule?.is_enabled ?? false,
            enabled_at: existingModule?.enabled_at ?? null,
          };
        }),
      }));

      setProjects(enrichedProjects);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (projectId: string, moduleKey: ModuleKey, currentValue: boolean) => {
    const toggleKey = `${projectId}-${moduleKey}`;
    setTogglingModule(toggleKey);
    
    try {
      const newValue = !currentValue;
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('project_modules')
        .select('id')
        .eq('project_id', projectId)
        .eq('module_key', moduleKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('project_modules')
          .update({
            is_enabled: newValue,
            enabled_at: newValue ? new Date().toISOString() : null,
            enabled_by: newValue ? user?.id : null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_modules')
          .insert({
            project_id: projectId,
            module_key: moduleKey,
            is_enabled: newValue,
            enabled_at: newValue ? new Date().toISOString() : null,
            enabled_by: newValue ? user?.id : null,
          });

        if (error) throw error;
      }

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: newValue ? 'enable_module' : 'disable_module',
        target_type: 'project_module',
        target_id: projectId,
        details: { module_key: moduleKey, new_value: newValue },
      });

      // Update local state
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            modules: p.modules.map(m => 
              m.module_key === moduleKey 
                ? { ...m, is_enabled: newValue, enabled_at: newValue ? new Date().toISOString() : null }
                : m
            ),
          };
        }
        return p;
      }));

      const moduleInfo = AVAILABLE_MODULES.find(m => m.key === moduleKey);
      toast({ 
        title: newValue ? 'Módulo ativado' : 'Módulo desativado',
        description: `${moduleInfo?.name} foi ${newValue ? 'ativado' : 'desativado'} para o projeto.`,
      });
    } catch (error: any) {
      toast({ title: 'Erro ao alterar módulo', description: error.message, variant: 'destructive' });
    } finally {
      setTogglingModule(null);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    totalProjects: projects.length,
    crmEnabled: projects.filter(p => p.modules.find(m => m.module_key === 'crm')?.is_enabled).length,
    metaAdsEnabled: projects.filter(p => p.modules.find(m => m.module_key === 'meta_ads')?.is_enabled).length,
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
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
                <p className="text-xs text-muted-foreground">Total de Projetos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.crmEnabled}</p>
                <p className="text-xs text-muted-foreground">CRM Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Facebook className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.metaAdsEnabled}</p>
                <p className="text-xs text-muted-foreground">Meta Ads Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Boxes className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Módulos por Projeto</CardTitle>
                <CardDescription>Gerencie os módulos ativos de cada projeto</CardDescription>
              </div>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por projeto ou dono..."
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
                {AVAILABLE_MODULES.map(m => (
                  <TableHead key={m.key} className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {MODULE_ICONS[m.key]}
                      {m.name}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <p className="font-medium">{project.name}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{project.owner_name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{project.owner_email}</p>
                    </div>
                  </TableCell>
                  {project.modules.map((mod) => {
                    const toggleKey = `${project.id}-${mod.module_key}`;
                    const isToggling = togglingModule === toggleKey;
                    
                    return (
                      <TableCell key={mod.module_key} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={mod.is_enabled}
                            disabled={isToggling}
                            onCheckedChange={() => toggleModule(project.id, mod.module_key, mod.is_enabled)}
                          />
                          {mod.is_enabled && mod.enabled_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(mod.enabled_at), 'dd/MM/yy', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2 + AVAILABLE_MODULES.length} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
