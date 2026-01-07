import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Pencil, Trash2, Plus, Lock, Info } from 'lucide-react';
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

const PERMISSION_AREAS = [
  { key: 'perm_dashboard', label: 'Dashboard' },
  { key: 'perm_analise', label: 'Análise' },
  { key: 'perm_crm', label: 'CRM' },
  { key: 'perm_automacoes', label: 'Automações' },
  { key: 'perm_chat_ao_vivo', label: 'Chat ao Vivo' },
  { key: 'perm_meta_ads', label: 'Meta Ads' },
  { key: 'perm_ofertas', label: 'Ofertas' },
  { key: 'perm_lancamentos', label: 'Lançamentos' },
  { key: 'perm_configuracoes', label: 'Configurações' },
  { key: 'perm_insights', label: 'Insights' },
  { key: 'perm_pesquisas', label: 'Pesquisas' },
  { key: 'perm_social_listening', label: 'Social Listening' },
] as const;

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

  const updateMutation = useMutation({
    mutationFn: async (template: RoleTemplate) => {
      const { id, created_at, updated_at, ...updates } = template;
      const { error } = await supabase
        .from('role_templates')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({ title: 'Cargo atualizado com sucesso!' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: RoleTemplate) => {
      const { id, created_at, updated_at, ...data } = template;
      const { error } = await supabase
        .from('role_templates')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({ title: 'Cargo criado com sucesso!' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setIsCreating(false);
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
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate({
      id: '',
      project_id: null,
      name: '',
      description: '',
      base_role: 'operator',
      is_system_default: true, // System templates are global
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

  const getPermissionBadge = (level: PermissionLevel) => {
    const config = PERMISSION_LEVELS.find(p => p.value === level);
    return (
      <Badge variant="outline" className={`text-xs ${config?.color || ''}`}>
        {config?.label || level}
      </Badge>
    );
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Criar Novo Cargo' : `Editar Cargo: ${editingTemplate?.name}`}
            </DialogTitle>
            <DialogDescription>
              Configure as permissões para cada área do sistema
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6 py-4">
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

              {/* Permissions Grid */}
              <div className="space-y-3">
                <Label>Permissões por Área</Label>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending || createMutation.isPending}
            >
              {(updateMutation.isPending || createMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {isCreating ? 'Criar Cargo' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
