import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Crown, Clock, Users, FolderOpen, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_projects: number;
  max_users_per_project: number;
  price_cents: number;
  type: 'monthly' | 'yearly' | 'lifetime' | 'trial';
  is_active: boolean;
  trial_days: number;
  is_trial_available: boolean;
  created_at: string;
}

const PLAN_TYPES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'lifetime', label: 'Vitalício' },
  { value: 'trial', label: 'Trial' },
];

export const PlansManager = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_projects: 1,
    max_users_per_project: 5,
    price_cents: 0,
    type: 'monthly' as 'monthly' | 'yearly' | 'lifetime' | 'trial',
    is_active: true,
    trial_days: 7,
    is_trial_available: false,
  });

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('name', { ascending: true })
      .order('type', { ascending: true });
    
    if (error) {
      toast.error('Erro ao carregar planos');
      console.error(error);
    } else {
      // Custom sort: group by name, then monthly before yearly
      const typeOrder = { monthly: 0, yearly: 1, lifetime: 2, trial: 3 };
      const sorted = (data || []).sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return (typeOrder[a.type as keyof typeof typeOrder] || 99) - (typeOrder[b.type as keyof typeof typeOrder] || 99);
      });
      setPlans(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      max_projects: 1,
      max_users_per_project: 5,
      price_cents: 0,
      type: 'monthly',
      is_active: true,
      trial_days: 7,
      is_trial_available: false,
    });
    setEditingPlan(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      max_projects: plan.max_projects,
      max_users_per_project: plan.max_users_per_project,
      price_cents: plan.price_cents,
      type: plan.type,
      is_active: plan.is_active,
      trial_days: plan.trial_days || 7,
      is_trial_available: plan.is_trial_available || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do plano é obrigatório');
      return;
    }

    setSaving(true);
    
    const planData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      max_projects: formData.max_projects,
      max_users_per_project: formData.max_users_per_project,
      price_cents: formData.type === 'trial' ? 0 : formData.price_cents,
      type: formData.type,
      is_active: formData.is_active,
      trial_days: formData.is_trial_available ? formData.trial_days : 0,
      is_trial_available: formData.is_trial_available,
    };

    if (editingPlan) {
      const { error } = await supabase
        .from('plans')
        .update(planData)
        .eq('id', editingPlan.id);
      
      if (error) {
        toast.error('Erro ao atualizar plano');
        console.error(error);
      } else {
        toast.success('Plano atualizado!');
        setDialogOpen(false);
        fetchPlans();
      }
    } else {
      const { error } = await supabase
        .from('plans')
        .insert(planData);
      
      if (error) {
        toast.error('Erro ao criar plano');
        console.error(error);
      } else {
        toast.success('Plano criado!');
        setDialogOpen(false);
        fetchPlans();
      }
    }
    
    setSaving(false);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) return;
    
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', plan.id);
    
    if (error) {
      toast.error('Erro ao excluir plano. Pode haver assinaturas vinculadas.');
      console.error(error);
    } else {
      toast.success('Plano excluído!');
      fetchPlans();
    }
  };

  const toggleActive = async (plan: Plan) => {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);
    
    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      fetchPlans();
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      monthly: { variant: 'default', label: 'Mensal' },
      yearly: { variant: 'secondary', label: 'Anual' },
      lifetime: { variant: 'outline', label: 'Vitalício' },
      trial: { variant: 'outline', label: 'Trial' },
    };
    const config = variants[type] || variants.monthly;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Planos</h2>
          <p className="text-muted-foreground">Configure os planos de assinatura do Cubo Mágico</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{plans.length}</p>
                <p className="text-sm text-muted-foreground">Total de Planos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-500 font-bold">{plans.filter(p => p.is_active).length}</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{plans.filter(p => p.is_trial_available).length}</p>
                <p className="text-sm text-muted-foreground">Com Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.max(...plans.map(p => p.max_projects), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Max Projetos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os planos disponíveis para assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-center">Projetos</TableHead>
                <TableHead className="text-center">Usuários/Proj</TableHead>
                <TableHead className="text-center">Trial</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(plan.type)}</TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(plan.price_cents)}
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.max_projects === 0 ? '∞' : plan.max_projects}
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.max_users_per_project}
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.is_trial_available ? (
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                        {plan.trial_days} dias
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => toggleActive(plan)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do plano de assinatura
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Plano Pro"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do plano..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_cents / 100}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    price_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                  })}
                  disabled={formData.type === 'trial'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Projetos</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_projects}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_projects: parseInt(e.target.value || '1')
                  })}
                />
                <p className="text-xs text-muted-foreground">0 = ilimitado</p>
              </div>

              <div className="space-y-2">
                <Label>Usuários por Projeto</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_users_per_project}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_users_per_project: parseInt(e.target.value || '5')
                  })}
                />
              </div>
            </div>

            {/* Trial Configuration */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Oferecer Trial Gratuito</Label>
                    <p className="text-xs text-muted-foreground">
                      Período de teste antes da cobrança
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_trial_available}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      is_trial_available: checked 
                    })}
                  />
                </div>

                {formData.is_trial_available && (
                  <div className="space-y-2">
                    <Label>Dias de Trial</Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={formData.trial_days}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        trial_days: parseInt(e.target.value || '7')
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      O usuário terá {formData.trial_days} dias de acesso gratuito
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Label>Plano Ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPlan ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
