import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Trash2, ShieldAlert, Loader2, User, FolderKanban, Layers } from 'lucide-react';

interface Feature {
  id: string;
  module_key: string;
  feature_key: string;
  name: string;
}

interface FeatureOverride {
  id: string;
  target_type: 'user' | 'project';
  target_id: string;
  feature_id: string;
  enabled: boolean;
  expires_at: string | null;
  created_at: string;
  feature?: Feature;
  target_name?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface Project {
  id: string;
  name: string;
}

export const FeatureOverridesManager = () => {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<FeatureOverride[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    target_type: 'user' as 'user' | 'project',
    target_id: '',
    feature_id: '',
    enabled: true,
    expires_at: '',
  });

  const [batchForm, setBatchForm] = useState({
    target_type: 'project' as 'user' | 'project',
    target_id: '',
    enabled: true,
    expires_at: '',
    selected_feature_ids: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('feature_overrides' as any)
        .select('*')
        .order('created_at', { ascending: false }) as { data: FeatureOverride[] | null; error: any };

      if (overridesError) throw overridesError;

      // Fetch features
      const { data: featuresData, error: featuresError } = await supabase
        .from('features' as any)
        .select('id, module_key, feature_key, name')
        .eq('is_active', true)
        .order('module_key')
        .order('name') as { data: Feature[] | null; error: any };

      if (featuresError) throw featuresError;
      setFeatures(featuresData || []);

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');
      setUsers(usersData || []);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      setProjects(projectsData || []);

      // Enrich overrides with feature and target names
      const enriched = (overridesData || []).map(o => {
        const feature = (featuresData || []).find(f => f.id === o.feature_id);
        let targetName = '';
        if (o.target_type === 'user') {
          const user = (usersData || []).find(u => u.id === o.target_id);
          targetName = user?.email || user?.full_name || o.target_id;
        } else {
          const project = (projectsData || []).find(p => p.id === o.target_id);
          targetName = project?.name || o.target_id;
        }
        return { ...o, feature, target_name: targetName };
      });

      setOverrides(enriched);
    } catch (error: any) {
      toast.error('Erro ao carregar dados', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewDialog = () => {
    setForm({
      target_type: 'user',
      target_id: '',
      feature_id: '',
      enabled: true,
      expires_at: '',
    });
    setShowDialog(true);
  };

  const openBatchDialog = () => {
    setBatchForm({
      target_type: 'project',
      target_id: '',
      enabled: true,
      expires_at: '',
      selected_feature_ids: [],
    });
    setShowBatchDialog(true);
  };

  const handleSave = async () => {
    if (!form.target_id || !form.feature_id) {
      toast.error('Selecione o alvo e a feature');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('feature_overrides' as any)
        .insert({
          target_type: form.target_type,
          target_id: form.target_id,
          feature_id: form.feature_id,
          enabled: form.enabled,
          expires_at: form.expires_at || null,
          created_by: user?.id,
        });

      if (error) throw error;
      toast.success('Override criado com sucesso!');
      setShowDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar override', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSave = async () => {
    if (!batchForm.target_id || batchForm.selected_feature_ids.length === 0) {
      toast.error('Selecione o alvo e ao menos uma feature');
      return;
    }

    setSaving(true);
    try {
      // Get existing overrides for this target
      const { data: existingOverrides } = await supabase
        .from('feature_overrides' as any)
        .select('feature_id')
        .eq('target_type', batchForm.target_type)
        .eq('target_id', batchForm.target_id) as { data: { feature_id: string }[] | null };

      const existingFeatureIds = new Set((existingOverrides || []).map(o => o.feature_id));

      // Filter out features that already have overrides
      const newFeatureIds = batchForm.selected_feature_ids.filter(id => !existingFeatureIds.has(id));

      if (newFeatureIds.length === 0) {
        toast.info('Todas as features selecionadas já têm overrides para este alvo');
        setShowBatchDialog(false);
        return;
      }

      // Create batch insert
      const inserts = newFeatureIds.map(feature_id => ({
        target_type: batchForm.target_type,
        target_id: batchForm.target_id,
        feature_id,
        enabled: batchForm.enabled,
        expires_at: batchForm.expires_at || null,
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from('feature_overrides' as any)
        .insert(inserts);

      if (error) throw error;

      const skipped = batchForm.selected_feature_ids.length - newFeatureIds.length;
      toast.success(
        `${newFeatureIds.length} overrides criados com sucesso!` +
        (skipped > 0 ? ` (${skipped} já existentes ignorados)` : '')
      );
      setShowBatchDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar overrides em lote', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (override: FeatureOverride) => {
    if (!confirm('Tem certeza que deseja excluir este override?')) return;

    try {
      const { error } = await supabase
        .from('feature_overrides' as any)
        .delete()
        .eq('id', override.id);

      if (error) throw error;
      toast.success('Override excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir', { description: error.message });
    }
  };

  const toggleEnabled = async (override: FeatureOverride) => {
    try {
      const { error } = await supabase
        .from('feature_overrides' as any)
        .update({ enabled: !override.enabled })
        .eq('id', override.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar', { description: error.message });
    }
  };

  const toggleAllFeatures = (selectAll: boolean) => {
    if (selectAll) {
      setBatchForm({
        ...batchForm,
        selected_feature_ids: features.map(f => f.id),
      });
    } else {
      setBatchForm({
        ...batchForm,
        selected_feature_ids: [],
      });
    }
  };

  const toggleFeature = (featureId: string) => {
    const currentSelection = batchForm.selected_feature_ids;
    if (currentSelection.includes(featureId)) {
      setBatchForm({
        ...batchForm,
        selected_feature_ids: currentSelection.filter(id => id !== featureId),
      });
    } else {
      setBatchForm({
        ...batchForm,
        selected_feature_ids: [...currentSelection, featureId],
      });
    }
  };

  // Group features by module
  const groupedFeatures = features.reduce((acc, feature) => {
    const module = feature.module_key || 'outros';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const filteredOverrides = overrides.filter(o =>
    o.target_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.feature?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
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
              <ShieldAlert className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Overrides de Features</CardTitle>
                <CardDescription>Exceções de acesso por usuário ou projeto</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar overrides..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={openBatchDialog}>
                <Layers className="w-4 h-4 mr-2" />
                Criar em Lote
              </Button>
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Override
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Alvo</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOverrides.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum override encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOverrides.map((o) => {
                  const isExpired = o.expires_at && isPast(new Date(o.expires_at));
                  return (
                    <TableRow key={o.id} className={isExpired ? 'opacity-50' : ''}>
                      <TableCell>
                        <Badge variant={o.target_type === 'user' ? 'default' : 'secondary'}>
                          {o.target_type === 'user' ? (
                            <><User className="w-3 h-3 mr-1" /> Usuário</>
                          ) : (
                            <><FolderKanban className="w-3 h-3 mr-1" /> Projeto</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{o.target_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{o.feature?.name}</p>
                          <code className="text-xs text-muted-foreground">{o.feature?.feature_key}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={o.enabled}
                            onCheckedChange={() => toggleEnabled(o)}
                          />
                          <Badge variant={o.enabled ? 'default' : 'destructive'}>
                            {o.enabled ? 'Habilitado' : 'Bloqueado'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {o.expires_at ? (
                          <span className={isExpired ? 'text-destructive' : ''}>
                            {format(new Date(o.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                            {isExpired && ' (expirado)'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(o)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Single Override Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Alvo</Label>
              <Select
                value={form.target_type}
                onValueChange={(v) => setForm({ ...form, target_type: v as 'user' | 'project', target_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="project">Projeto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{form.target_type === 'user' ? 'Usuário' : 'Projeto'}</Label>
              <Select
                value={form.target_id}
                onValueChange={(v) => setForm({ ...form, target_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {form.target_type === 'user' ? (
                    users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email} {u.full_name && `(${u.full_name})`}
                      </SelectItem>
                    ))
                  ) : (
                    projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Feature</Label>
              <Select
                value={form.feature_id}
                onValueChange={(v) => setForm({ ...form, feature_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a feature..." />
                </SelectTrigger>
                <SelectContent>
                  {features.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.feature_key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
              />
              <Label>{form.enabled ? 'Habilitar feature' : 'Bloquear feature'}</Label>
            </div>

            <div className="space-y-2">
              <Label>Data de Expiração (opcional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Override Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Overrides em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Alvo</Label>
                <Select
                  value={batchForm.target_type}
                  onValueChange={(v) => setBatchForm({ ...batchForm, target_type: v as 'user' | 'project', target_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="project">Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{batchForm.target_type === 'user' ? 'Usuário' : 'Projeto'}</Label>
                <Select
                  value={batchForm.target_id}
                  onValueChange={(v) => setBatchForm({ ...batchForm, target_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {batchForm.target_type === 'user' ? (
                      users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.email} {u.full_name && `(${u.full_name})`}
                        </SelectItem>
                      ))
                    ) : (
                      projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={batchForm.enabled}
                  onCheckedChange={(checked) => setBatchForm({ ...batchForm, enabled: checked })}
                />
                <Label>{batchForm.enabled ? 'Habilitar features' : 'Bloquear features'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Expiração:</Label>
                <Input
                  type="date"
                  value={batchForm.expires_at}
                  onChange={(e) => setBatchForm({ ...batchForm, expires_at: e.target.value })}
                  className="w-40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Features ({batchForm.selected_feature_ids.length} selecionadas)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllFeatures(true)}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllFeatures(false)}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-4">
                  {Object.entries(groupedFeatures).map(([module, moduleFeatures]) => (
                    <div key={module} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                        {module}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {moduleFeatures.map(feature => (
                          <div
                            key={feature.id}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleFeature(feature.id)}
                          >
                            <Checkbox
                              checked={batchForm.selected_feature_ids.includes(feature.id)}
                              onCheckedChange={() => toggleFeature(feature.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{feature.name}</p>
                              <code className="text-xs text-muted-foreground">{feature.feature_key}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBatchSave} disabled={saving || batchForm.selected_feature_ids.length === 0}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar {batchForm.selected_feature_ids.length} Overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
