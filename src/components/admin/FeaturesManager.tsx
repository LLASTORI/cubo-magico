import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Boxes, Loader2 } from 'lucide-react';

interface Feature {
  id: string;
  module_key: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const MODULE_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  crm: 'CRM',
  hotmart: 'Hotmart',
  whatsapp: 'WhatsApp',
  automations: 'Automações',
  dashboard: 'Dashboard',
  launches: 'Lançamentos',
  settings: 'Configurações',
};

export const FeaturesManager = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    module_key: '',
    feature_key: '',
    name: '',
    description: '',
    is_active: true,
  });

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('features' as any)
        .select('*')
        .order('module_key', { ascending: true })
        .order('feature_key', { ascending: true }) as { data: Feature[] | null; error: any };

      if (error) throw error;
      setFeatures(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar features', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const openNewDialog = () => {
    setEditing(null);
    setForm({
      module_key: '',
      feature_key: '',
      name: '',
      description: '',
      is_active: true,
    });
    setShowDialog(true);
  };

  const openEditDialog = (feature: Feature) => {
    setEditing(feature);
    setForm({
      module_key: feature.module_key,
      feature_key: feature.feature_key,
      name: feature.name,
      description: feature.description || '',
      is_active: feature.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.module_key || !form.feature_key || !form.name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('features' as any)
          .update({
            module_key: form.module_key,
            name: form.name,
            description: form.description || null,
            is_active: form.is_active,
          })
          .eq('id', editing.id);

        if (error) throw error;
        toast.success('Feature atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('features' as any)
          .insert({
            module_key: form.module_key,
            feature_key: form.feature_key,
            name: form.name,
            description: form.description || null,
            is_active: form.is_active,
          });

        if (error) throw error;
        toast.success('Feature criada com sucesso!');
      }

      setShowDialog(false);
      fetchFeatures();
    } catch (error: any) {
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (feature: Feature) => {
    if (!confirm(`Tem certeza que deseja excluir a feature "${feature.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('features' as any)
        .delete()
        .eq('id', feature.id);

      if (error) throw error;
      toast.success('Feature excluída com sucesso!');
      fetchFeatures();
    } catch (error: any) {
      toast.error('Erro ao excluir', { description: error.message });
    }
  };

  const toggleActive = async (feature: Feature) => {
    try {
      const { error } = await supabase
        .from('features' as any)
        .update({ is_active: !feature.is_active })
        .eq('id', feature.id);

      if (error) throw error;
      fetchFeatures();
    } catch (error: any) {
      toast.error('Erro ao atualizar', { description: error.message });
    }
  };

  const modules = [...new Set(features.map(f => f.module_key))];

  const filteredFeatures = features.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.feature_key.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter === 'all' || f.module_key === moduleFilter;
    return matchesSearch && matchesModule;
  });

  // Group by module
  const groupedFeatures = filteredFeatures.reduce((acc, f) => {
    if (!acc[f.module_key]) acc[f.module_key] = [];
    acc[f.module_key].push(f);
    return acc;
  }, {} as Record<string, Feature[]>);

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
              <Boxes className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Features do Sistema</CardTitle>
                <CardDescription>{features.length} features cadastradas</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar features..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">Todos os módulos</option>
                {modules.map(m => (
                  <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
                ))}
              </select>
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Feature
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.entries(groupedFeatures).map(([module, moduleFeatures]) => (
            <div key={module} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Badge variant="outline">{MODULE_LABELS[module] || module}</Badge>
                <span className="text-xs">({moduleFeatures.length} features)</span>
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature Key</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleFeatures.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{f.feature_key}</code>
                      </TableCell>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                        {f.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={f.is_active}
                          onCheckedChange={() => toggleActive(f)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(f)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(f)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Feature' : 'Nova Feature'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Módulo *</Label>
                <select
                  value={form.module_key}
                  onChange={(e) => setForm({ ...form, module_key: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(MODULE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Feature Key *</Label>
                <Input
                  value={form.feature_key}
                  onChange={(e) => setForm({ ...form, feature_key: e.target.value })}
                  placeholder="ex: meta_ads.create_audience"
                  disabled={!!editing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome da feature"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição da feature..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>Feature ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
