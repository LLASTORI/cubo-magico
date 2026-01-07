import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Pencil, Trash2, Plus, Lock, Info, ChevronRight, Settings2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';
type WhatsAppVisibilityMode = 'own' | 'department' | 'all';
type BaseRole = 'manager' | 'operator' | 'owner';

interface RoleTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  base_role: BaseRole;
  is_system_default: boolean;
  is_custom: boolean;
  icon: string | null;
  perm_dashboard: PermissionLevel;
  perm_analise: PermissionLevel;
  perm_crm: PermissionLevel;
  perm_automacoes: PermissionLevel;
  perm_chat_ao_vivo: PermissionLevel;
  perm_meta_ads: PermissionLevel;
  perm_ofertas: PermissionLevel;
  perm_lancamentos: PermissionLevel;
  perm_configuracoes: PermissionLevel;
  perm_insights: PermissionLevel;
  perm_pesquisas: PermissionLevel;
  perm_social_listening: PermissionLevel;
  whatsapp_visibility_mode: WhatsAppVisibilityMode | null;
  whatsapp_max_chats: number | null;
  whatsapp_is_supervisor: boolean;
  whatsapp_auto_create_agent: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Feature {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  module_key: string;
  is_active: boolean;
}

interface FeaturePermission {
  id?: string;
  role_template_id: string;
  feature_id: string;
  permission_level: PermissionLevel;
}

const PERMISSION_AREAS = [
  { key: 'perm_dashboard', label: 'Dashboard', module: 'core' },
  { key: 'perm_analise', label: 'Análise', module: 'hotmart' },
  { key: 'perm_crm', label: 'CRM', module: 'crm' },
  { key: 'perm_automacoes', label: 'Automações', module: 'automations' },
  { key: 'perm_chat_ao_vivo', label: 'Chat ao Vivo', module: 'whatsapp' },
  { key: 'perm_meta_ads', label: 'Meta Ads', module: 'meta_ads' },
  { key: 'perm_ofertas', label: 'Ofertas', module: 'hotmart' },
  { key: 'perm_lancamentos', label: 'Lançamentos', module: 'hotmart' },
  { key: 'perm_configuracoes', label: 'Configurações', module: 'core' },
  { key: 'perm_insights', label: 'Insights', module: 'insights' },
  { key: 'perm_pesquisas', label: 'Pesquisas', module: 'surveys' },
  { key: 'perm_social_listening', label: 'Social Listening', module: 'meta_ads' },
] as const;

const MODULE_LABELS: Record<string, string> = {
  core: 'Core / Configurações',
  crm: 'CRM',
  automations: 'Automações',
  whatsapp: 'WhatsApp',
  meta_ads: 'Meta Ads',
  hotmart: 'Hotmart / Vendas',
  insights: 'Insights',
  surveys: 'Pesquisas',
  ai_analysis: 'Análise com IA',
};

const PERMISSION_LEVELS: { value: PermissionLevel; label: string; color: string }[] = [
  { value: 'none', label: 'Nenhum', color: 'bg-muted text-muted-foreground' },
  { value: 'view', label: 'Visualizar', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'edit', label: 'Editar', color: 'bg-amber-500/10 text-amber-500' },
  { value: 'admin', label: 'Admin', color: 'bg-green-500/10 text-green-500' },
];

const VISIBILITY_MODES: { value: WhatsAppVisibilityMode; label: string }[] = [
  { value: 'own', label: 'Apenas próprias' },
  { value: 'department', label: 'Do departamento' },
  { value: 'all', label: 'Todas' },
];

export function RoleTemplatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('areas');
  const [featurePermissions, setFeaturePermissions] = useState<Record<string, PermissionLevel>>({});

  // Fetch all templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['role-templates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_templates')
        .select('*')
        .order('is_system_default', { ascending: false })
        .order('display_order')
        .order('name');
      
      if (error) throw error;
      return data as RoleTemplate[];
    },
  });

  // Fetch all features
  const { data: features } = useQuery({
    queryKey: ['features-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .order('module_key')
        .order('name');
      
      if (error) throw error;
      return data as Feature[];
    },
  });

  // Fetch feature permissions for editing template
  const { data: templateFeaturePerms } = useQuery({
    queryKey: ['role-template-feature-permissions', editingTemplate?.id],
    queryFn: async () => {
      if (!editingTemplate?.id) return [];
      const { data, error } = await supabase
        .from('role_template_feature_permissions')
        .select('*')
        .eq('role_template_id', editingTemplate.id);
      
      if (error) throw error;
      return data as FeaturePermission[];
    },
    enabled: !!editingTemplate?.id && !isCreating,
  });

  // Group features by module
  const featuresByModule = useMemo(() => {
    if (!features) return {};
    return features.reduce((acc, feature) => {
      const module = feature.module_key;
      if (!acc[module]) acc[module] = [];
      acc[module].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);
  }, [features]);

  // Initialize feature permissions when template changes
  useMemo(() => {
    if (templateFeaturePerms && !isCreating) {
      const permsMap: Record<string, PermissionLevel> = {};
      templateFeaturePerms.forEach(p => {
        permsMap[p.feature_id] = p.permission_level;
      });
      setFeaturePermissions(permsMap);
    }
  }, [templateFeaturePerms, isCreating]);

  const updateMutation = useMutation({
    mutationFn: async (template: RoleTemplate) => {
      const { id, created_at, updated_at, ...updates } = template;
      const { error } = await supabase
        .from('role_templates')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;

      // Save feature permissions
      if (Object.keys(featurePermissions).length > 0) {
        // Delete existing and insert new
        await supabase
          .from('role_template_feature_permissions')
          .delete()
          .eq('role_template_id', id);

        const permissionsToInsert = Object.entries(featurePermissions)
          .filter(([_, level]) => level !== 'none')
          .map(([featureId, level]) => ({
            role_template_id: id,
            feature_id: featureId,
            permission_level: level,
          }));

        if (permissionsToInsert.length > 0) {
          const { error: permError } = await supabase
            .from('role_template_feature_permissions')
            .insert(permissionsToInsert);
          
          if (permError) throw permError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      queryClient.invalidateQueries({ queryKey: ['role-template-feature-permissions'] });
      toast({ title: 'Cargo atualizado com sucesso!' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFeaturePermissions({});
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<RoleTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: newTemplate, error } = await supabase
        .from('role_templates')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;

      // Save feature permissions for new template
      if (Object.keys(featurePermissions).length > 0) {
        const permissionsToInsert = Object.entries(featurePermissions)
          .filter(([_, level]) => level !== 'none')
          .map(([featureId, level]) => ({
            role_template_id: newTemplate.id,
            feature_id: featureId,
            permission_level: level,
          }));

        if (permissionsToInsert.length > 0) {
          await supabase
            .from('role_template_feature_permissions')
            .insert(permissionsToInsert);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({ title: 'Cargo criado com sucesso!' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setIsCreating(false);
      setFeaturePermissions({});
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('role_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({ title: 'Cargo excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (template: RoleTemplate) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
    setActiveTab('areas');
    setFeaturePermissions({});
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate({
      id: '',
      project_id: null,
      name: '',
      description: '',
      base_role: 'operator',
      is_system_default: true,
      is_custom: false,
      icon: 'user',
      perm_dashboard: 'view',
      perm_analise: 'none',
      perm_crm: 'none',
      perm_automacoes: 'none',
      perm_chat_ao_vivo: 'none',
      perm_meta_ads: 'none',
      perm_ofertas: 'none',
      perm_lancamentos: 'none',
      perm_configuracoes: 'none',
      perm_insights: 'none',
      perm_pesquisas: 'none',
      perm_social_listening: 'none',
      whatsapp_visibility_mode: 'own',
      whatsapp_max_chats: 5,
      whatsapp_is_supervisor: false,
      whatsapp_auto_create_agent: false,
      display_order: 99,
      created_at: '',
      updated_at: '',
    });
    setIsCreating(true);
    setActiveTab('areas');
    setFeaturePermissions({});
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (isCreating) {
      const { id, created_at, updated_at, ...template } = editingTemplate;
      createMutation.mutate(template);
    } else {
      updateMutation.mutate(editingTemplate);
    }
  };

  const handleDelete = (template: RoleTemplate) => {
    if (template.is_system_default) {
      toast({ title: 'Cargos do sistema não podem ser excluídos', variant: 'destructive' });
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o cargo "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const updatePermission = (area: string, value: PermissionLevel) => {
    if (!editingTemplate) return;
    setEditingTemplate({ ...editingTemplate, [area]: value });
  };

  const updateFeaturePermission = (featureId: string, value: PermissionLevel) => {
    setFeaturePermissions(prev => ({
      ...prev,
      [featureId]: value,
    }));
  };

  const setModuleFeaturePermissions = (moduleKey: string, level: PermissionLevel) => {
    const moduleFeatures = featuresByModule[moduleKey] || [];
    const newPerms = { ...featurePermissions };
    moduleFeatures.forEach(f => {
      newPerms[f.id] = level;
    });
    setFeaturePermissions(newPerms);
  };

  const getPermissionBadge = (level: PermissionLevel) => {
    const config = PERMISSION_LEVELS.find(p => p.value === level);
    return (
      <Badge variant="outline" className={`text-xs ${config?.color || ''}`}>
        {config?.label || level}
      </Badge>
    );
  };

  const getModulePermissionSummary = (moduleKey: string) => {
    const moduleFeatures = featuresByModule[moduleKey] || [];
    if (moduleFeatures.length === 0) return null;
    
    const perms = moduleFeatures.map(f => featurePermissions[f.id] || 'none');
    const nonNoneCount = perms.filter(p => p !== 'none').length;
    
    if (nonNoneCount === 0) return <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Nenhum</Badge>;
    if (nonNoneCount === moduleFeatures.length) {
      const allSame = perms.every(p => p === perms[0]);
      if (allSame) return getPermissionBadge(perms[0]);
    }
    return <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{nonNoneCount}/{moduleFeatures.length}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Gerenciador de Cargos</CardTitle>
                <CardDescription>
                  Configure permissões granulares para cada cargo do sistema
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cargo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Cargo</TableHead>
                  {PERMISSION_AREAS.map(area => (
                    <TableHead key={area.key} className="text-center min-w-[90px]">
                      <span className="text-xs">{area.label}</span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.is_system_default && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Cargo do sistema</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {PERMISSION_AREAS.map(area => (
                      <TableCell key={area.key} className="text-center">
                        {getPermissionBadge(template[area.key as keyof RoleTemplate] as PermissionLevel)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!template.is_system_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permission Levels Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Legenda de Níveis de Permissão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {PERMISSION_LEVELS.map(level => (
              <div key={level.value} className="flex items-center gap-2 p-2 rounded-lg border">
                <Badge variant="outline" className={`text-xs ${level.color}`}>
                  {level.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {level.value === 'none' && 'Sem acesso à área'}
                  {level.value === 'view' && 'Apenas visualização'}
                  {level.value === 'edit' && 'Visualizar e editar'}
                  {level.value === 'admin' && 'Controle total'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {isCreating ? 'Criar Novo Cargo' : `Editar Cargo: ${editingTemplate?.name}`}
            </DialogTitle>
            <DialogDescription>
              Configure as permissões por área e por funcionalidade específica
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-6">
              <TabsList className="grid w-full grid-cols-3 shrink-0">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="areas">Áreas</TabsTrigger>
                <TabsTrigger value="features" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Features
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 min-h-0 mt-4 pr-4">
                <TabsContent value="info" className="mt-0 space-y-6">
                  {/* Basic Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Cargo</Label>
                      <Input
                        id="name"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        placeholder="Ex: Gerente de Vendas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={editingTemplate.description || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                        placeholder="Breve descrição do cargo"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Settings */}
                  <div className="space-y-3">
                    <Label>Configurações de WhatsApp</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                        <span className="text-sm font-medium">Visibilidade</span>
                        <Select
                          value={editingTemplate.whatsapp_visibility_mode || 'own'}
                          onValueChange={(value) => setEditingTemplate({ 
                            ...editingTemplate, 
                            whatsapp_visibility_mode: value as WhatsAppVisibilityMode 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VISIBILITY_MODES.map(mode => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                        <span className="text-sm font-medium">Max. Chats</span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={editingTemplate.whatsapp_max_chats || 0}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            whatsapp_max_chats: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                        <span className="text-sm font-medium">Supervisor</span>
                        <Select
                          value={editingTemplate.whatsapp_is_supervisor ? 'yes' : 'no'}
                          onValueChange={(value) => setEditingTemplate({
                            ...editingTemplate,
                            whatsapp_is_supervisor: value === 'yes'
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Sim</SelectItem>
                            <SelectItem value="no">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="areas" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Configure o nível de acesso para cada área principal do sistema.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {PERMISSION_AREAS.map(area => (
                      <div key={area.key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <span className="text-sm font-medium">{area.label}</span>
                        <Select
                          value={editingTemplate[area.key as keyof RoleTemplate] as PermissionLevel}
                          onValueChange={(value) => updatePermission(area.key, value as PermissionLevel)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_LEVELS.map(level => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="features" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Configure permissões granulares para cada funcionalidade específica.
                    </p>
                  </div>
                  
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(featuresByModule).map(([moduleKey, moduleFeatures]) => (
                      <AccordionItem key={moduleKey} value={moduleKey} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center justify-between flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" />
                              <span className="font-medium">{MODULE_LABELS[moduleKey] || moduleKey}</span>
                              <Badge variant="secondary" className="text-xs">{moduleFeatures.length}</Badge>
                            </div>
                            {getModulePermissionSummary(moduleKey)}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-3">
                            {/* Quick actions for module */}
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <span className="text-xs text-muted-foreground">Definir todas:</span>
                              {PERMISSION_LEVELS.map(level => (
                                <Button
                                  key={level.value}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => setModuleFeaturePermissions(moduleKey, level.value)}
                                >
                                  {level.label}
                                </Button>
                              ))}
                            </div>
                            
                            {/* Individual features */}
                            <div className="grid gap-2">
                              {moduleFeatures.map(feature => (
                                <div 
                                  key={feature.id} 
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                                >
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-sm font-medium truncate">{feature.name}</p>
                                    {feature.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {feature.description}
                                      </p>
                                    )}
                                  </div>
                                  <Select
                                    value={featurePermissions[feature.id] || 'none'}
                                    onValueChange={(value) => updateFeaturePermission(feature.id, value as PermissionLevel)}
                                  >
                                    <SelectTrigger className="w-[110px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PERMISSION_LEVELS.map(level => (
                                        <SelectItem key={level.value} value={level.value}>
                                          {level.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}

          <div className="shrink-0 px-6 pb-6 pt-4 border-t bg-background">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending || createMutation.isPending}
              >
                {(updateMutation.isPending || createMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}