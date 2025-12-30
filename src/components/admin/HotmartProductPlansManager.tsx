import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Trash2, Link2, Loader2, AlertTriangle } from 'lucide-react';
import { formatPlanName } from '@/lib/planUtils';

interface Plan {
  id: string;
  name: string;
  type: string;
  max_projects: number;
}

interface HotmartProductPlan {
  id: string;
  product_id: string;
  offer_code: string | null;
  plan_id: string;
  is_active: boolean;
  created_at: string;
  plan?: Plan;
}

export const HotmartProductPlansManager = () => {
  const [mappings, setMappings] = useState<HotmartProductPlan[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    product_id: '',
    offer_code: '',
    plan_id: '',
    is_active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('hotmart_product_plans' as any)
        .select('*')
        .order('product_id') as { data: HotmartProductPlan[] | null; error: any };

      if (mappingsError) throw mappingsError;

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('id, name, type, max_projects')
        .eq('is_active', true)
        .order('name')
        .order('type');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Enrich mappings with plan names
      const enriched = (mappingsData || []).map(m => ({
        ...m,
        plan: (plansData || []).find(p => p.id === m.plan_id)
      }));

      setMappings(enriched);
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
      product_id: '',
      offer_code: '',
      plan_id: '',
      is_active: true,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.product_id || !form.plan_id) {
      toast.error('Preencha o ID do produto e selecione o plano');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('hotmart_product_plans' as any)
        .insert({
          product_id: form.product_id,
          offer_code: form.offer_code || null,
          plan_id: form.plan_id,
          is_active: form.is_active,
        });

      if (error) throw error;
      toast.success('Mapeamento criado com sucesso!');
      setShowDialog(false);
      fetchData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Esse produto/oferta já está mapeado');
      } else {
        toast.error('Erro ao criar mapeamento', { description: error.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mapping: HotmartProductPlan) => {
    if (!confirm('Tem certeza que deseja excluir este mapeamento?')) return;

    try {
      const { error } = await supabase
        .from('hotmart_product_plans' as any)
        .delete()
        .eq('id', mapping.id);

      if (error) throw error;
      toast.success('Mapeamento excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir', { description: error.message });
    }
  };

  const toggleActive = async (mapping: HotmartProductPlan) => {
    try {
      const { error } = await supabase
        .from('hotmart_product_plans' as any)
        .update({ is_active: !mapping.is_active })
        .eq('id', mapping.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar', { description: error.message });
    }
  };

  const filteredMappings = mappings.filter(m =>
    m.product_id.toLowerCase().includes(search.toLowerCase()) ||
    m.offer_code?.toLowerCase().includes(search.toLowerCase()) ||
    m.plan?.name?.toLowerCase().includes(search.toLowerCase())
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
      {/* Info Card */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">Como funciona:</p>
              <p className="text-muted-foreground mt-1">
                Quando uma venda da Hotmart chega via webhook, o sistema verifica se o <code className="bg-muted px-1 rounded">product_id</code> está 
                mapeado para algum plano. Se estiver, cria ou atualiza a assinatura do comprador automaticamente.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Importante:</strong> O comprador precisa estar cadastrado no Cubo Mágico (pelo email) para que a assinatura seja criada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Mapeamento Hotmart → Planos</CardTitle>
                <CardDescription>Vincule produtos Hotmart aos planos do Cubo Mágico</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar mapeamentos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Mapeamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product ID (Hotmart)</TableHead>
                <TableHead>Offer Code</TableHead>
                <TableHead>Plano (Cubo Mágico)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum mapeamento encontrado. Crie um para vincular produtos Hotmart a planos.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{m.product_id}</code>
                    </TableCell>
                    <TableCell>
                      {m.offer_code ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm">{m.offer_code}</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {m.plan ? formatPlanName(m.plan.name, m.plan.type) : 'Plano não encontrado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.is_active}
                        onCheckedChange={() => toggleActive(m)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Mapeamento</DialogTitle>
            <DialogDescription>
              Vincule um produto da Hotmart a um plano do Cubo Mágico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product ID (Hotmart) *</Label>
              <Input
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                placeholder="Ex: 1234567"
              />
              <p className="text-xs text-muted-foreground">
                Encontre no painel da Hotmart → Produtos → Informações do produto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Offer Code (opcional)</Label>
              <Input
                value={form.offer_code}
                onChange={(e) => setForm({ ...form, offer_code: e.target.value })}
                placeholder="Ex: abc123xyz"
              />
              <p className="text-xs text-muted-foreground">
                Use se quiser mapear uma oferta específica. Deixe vazio para mapear qualquer oferta do produto.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Plano (Cubo Mágico) *</Label>
              <Select
                value={form.plan_id}
                onValueChange={(v) => setForm({ ...form, plan_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatPlanName(p.name, p.type)} ({p.max_projects === 0 ? '∞' : p.max_projects} projetos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>Mapeamento ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
