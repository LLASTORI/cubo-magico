import { useState, useEffect } from 'react';
import { useSubscriptions, Plan, Subscription } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

interface UserWithProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  has_subscription: boolean;
}

export const SubscriptionsManager = () => {
  const { 
    plans, 
    subscriptions, 
    loading, 
    createSubscription, 
    updateSubscription,
    deleteSubscription,
    extendSubscription,
    activateFromTrial,
    refresh 
  } = useSubscriptions();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [usersWithoutSub, setUsersWithoutSub] = useState<UserWithProfile[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, { email: string; full_name: string }>>({});

  // Form state for new subscription
  const [newSubForm, setNewSubForm] = useState({
    user_id: '',
    plan_id: '',
    is_trial: false,
    trial_days: 7,
    expires_months: 12,
    notes: ''
  });

  const [extendMonths, setExtendMonths] = useState(1);

  // Fetch users without subscriptions
  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profiles) {
        // Create a map of user_id to profile
        const profileMap: Record<string, { email: string; full_name: string }> = {};
        profiles.forEach(p => {
          profileMap[p.id] = { email: p.email || '', full_name: p.full_name || '' };
        });
        setUserProfiles(profileMap);

        // Find users without subscriptions
        const subUserIds = new Set(subscriptions.map(s => s.user_id));
        const usersWithout = profiles
          .filter(p => !subUserIds.has(p.id))
          .map(p => ({
            id: p.id,
            email: p.email,
            full_name: p.full_name,
            has_subscription: false
          }));
        setUsersWithoutSub(usersWithout);
      }
    };
    
    fetchUsers();
  }, [subscriptions]);

  const handleCreateSubscription = async () => {
    if (!newSubForm.user_id || !newSubForm.plan_id) {
      toast.error('Selecione um usuário e um plano');
      return;
    }

    try {
      await createSubscription({
        user_id: newSubForm.user_id,
        plan_id: newSubForm.plan_id,
        is_trial: newSubForm.is_trial,
        trial_days: newSubForm.is_trial ? newSubForm.trial_days : undefined,
        expires_months: newSubForm.expires_months,
        notes: newSubForm.notes
      });
      toast.success('Assinatura criada com sucesso!');
      setShowNewDialog(false);
      setNewSubForm({
        user_id: '',
        plan_id: '',
        is_trial: false,
        trial_days: 7,
        expires_months: 12,
        notes: ''
      });
    } catch (error) {
      toast.error('Erro ao criar assinatura');
    }
  };

  const handleExtend = async () => {
    if (!selectedSub) return;
    
    try {
      await extendSubscription(selectedSub.id, extendMonths);
      toast.success(`Assinatura estendida por ${extendMonths} mês(es)`);
      setShowExtendDialog(false);
      setSelectedSub(null);
    } catch (error) {
      toast.error('Erro ao estender assinatura');
    }
  };

  const handleActivateFromTrial = async (sub: Subscription) => {
    try {
      await activateFromTrial(sub.id, 12);
      toast.success('Assinatura ativada!');
    } catch (error) {
      toast.error('Erro ao ativar assinatura');
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedSub) return;
    try {
      await updateSubscription(selectedSub.id, { status: 'cancelled' });
      toast.success('Assinatura cancelada');
      setShowCancelDialog(false);
      setSelectedSub(null);
    } catch (error) {
      toast.error('Erro ao cancelar assinatura');
    }
  };

  const handleReactivateSubscription = async (sub: Subscription) => {
    try {
      await updateSubscription(sub.id, { status: 'active' });
      toast.success('Assinatura reativada!');
    } catch (error) {
      toast.error('Erro ao reativar assinatura');
    }
  };

  const handleDeleteSubscription = async (sub: Subscription) => {
    if (!confirm('Tem certeza que deseja excluir esta assinatura?')) return;
    
    try {
      await deleteSubscription(sub.id);
      toast.success('Assinatura excluída');
    } catch (error) {
      toast.error('Erro ao excluir assinatura');
    }
  };

  const getStatusBadge = (sub: Subscription) => {
    const isExpired = sub.expires_at && isPast(new Date(sub.expires_at));
    const isTrialExpired = sub.is_trial && sub.trial_ends_at && isPast(new Date(sub.trial_ends_at));
    
    if (isExpired || isTrialExpired) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Expirado</Badge>;
    }
    
    switch (sub.status) {
      case 'active':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> Ativo</Badge>;
      case 'trial':
        return <Badge variant="secondary" className="bg-blue-500 text-white gap-1"><Clock className="h-3 w-3" /> Trial</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><Pause className="h-3 w-3" /> Cancelado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{sub.status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const profile = userProfiles[sub.user_id];
    const userName = profile?.full_name || '';
    const userEmail = profile?.email || '';
    const planName = sub.plan?.name || '';
    
    const matchesSearch = 
      userName.toLowerCase().includes(search.toLowerCase()) ||
      userEmail.toLowerCase().includes(search.toLowerCase()) ||
      planName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    expired: subscriptions.filter(s => 
      s.status === 'expired' || 
      (s.expires_at && isPast(new Date(s.expires_at)))
    ).length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assinaturas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Trial</p>
                <p className="text-2xl font-bold">{stats.trial}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expirados</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Gerenciar Assinaturas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Assinatura
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou plano..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma assinatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const profile = userProfiles[sub.user_id];
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile?.full_name || 'Sem nome'}</p>
                            <p className="text-sm text-muted-foreground">{profile?.email || sub.user_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.plan?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {sub.plan?.max_projects === 0 ? 'Ilimitado' : `${sub.plan?.max_projects} projeto(s)`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub)}</TableCell>
                        <TableCell>
                          <Badge variant={sub.origin === 'hotmart' ? 'default' : sub.origin === 'stripe' ? 'secondary' : 'outline'}>
                            {sub.origin === 'hotmart' ? 'Hotmart' : sub.origin === 'stripe' ? 'Stripe' : sub.origin === 'other' ? 'Outro' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.is_trial && sub.trial_ends_at ? (
                            <div>
                              <p className="text-sm">Trial: {format(new Date(sub.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(sub.trial_ends_at), { locale: ptBR, addSuffix: true })}
                              </p>
                            </div>
                          ) : sub.expires_at ? (
                            <div>
                              <p className="text-sm">{format(new Date(sub.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(sub.expires_at), { locale: ptBR, addSuffix: true })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem expiração</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sub.plan?.max_projects === 0 ? '∞' : sub.plan?.max_projects}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider delayDuration={200}>
                            <div className="flex justify-end gap-2">
                              {sub.status === 'trial' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleActivateFromTrial(sub)}
                                    >
                                      Ativar
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Converter trial em assinatura ativa por 12 meses</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedSub(sub);
                                      setShowExtendDialog(true);
                                    }}
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Estender período da assinatura</p>
                                </TooltipContent>
                              </Tooltip>
                              {sub.status === 'cancelled' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReactivateSubscription(sub)}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reativar assinatura cancelada</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedSub(sub);
                                        setShowCancelDialog(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Cancelar assinatura (usuário perde acesso)</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
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

      {/* Plans Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {plans
              .filter(p => p.is_active)
              .sort((a, b) => {
                const order: Record<string, number> = { 'básico': 1, 'basico': 1, 'pro': 2, 'business': 3, 'ilimitado': 4 };
                return (order[a.name.toLowerCase()] ?? 99) - (order[b.name.toLowerCase()] ?? 99);
              })
              .map(plan => (
              <div key={plan.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">
                    R$ {(plan.price_cents / 100).toFixed(0)}
                  </span>
                  <Badge variant="secondary">
                    {plan.max_projects === 0 ? 'Ilimitado' : `${plan.max_projects} projeto(s)`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Subscription Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select
                value={newSubForm.user_id}
                onValueChange={(value) => setNewSubForm(prev => ({ ...prev, user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usersWithoutSub.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {usersWithoutSub.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todos os usuários já possuem assinatura
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Plano</Label>
              <Select
                value={newSubForm.plan_id}
                onValueChange={(value) => setNewSubForm(prev => ({ ...prev, plan_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active).map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.max_projects === 0 ? 'Ilimitado' : `${plan.max_projects} projeto(s)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Período de Trial</Label>
              <Switch
                checked={newSubForm.is_trial}
                onCheckedChange={(checked) => setNewSubForm(prev => ({ ...prev, is_trial: checked }))}
              />
            </div>

            {newSubForm.is_trial && (
              <div className="space-y-2">
                <Label>Dias de Trial</Label>
                <Input
                  type="number"
                  value={newSubForm.trial_days}
                  onChange={(e) => setNewSubForm(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 7 }))}
                  min={1}
                  max={90}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Duração da Assinatura (meses)</Label>
              <Select
                value={newSubForm.expires_months.toString()}
                onValueChange={(value) => setNewSubForm(prev => ({ ...prev, expires_months: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses (1 ano)</SelectItem>
                  <SelectItem value="24">24 meses (2 anos)</SelectItem>
                  <SelectItem value="0">Sem expiração</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={newSubForm.notes}
                onChange={(e) => setNewSubForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Anotações sobre a assinatura..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubscription}>
              Criar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estender Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Estender assinatura de: <strong>{userProfiles[selectedSub?.user_id || '']?.full_name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Adicionar meses</Label>
              <Select
                value={extendMonths.toString()}
                onValueChange={(value) => setExtendMonths(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExtend}>
              Estender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a cancelar a assinatura de:</p>
              <p className="font-medium text-foreground">
                {selectedSub && userProfiles[selectedSub.user_id]?.full_name || 'Usuário'} - {selectedSub?.plan?.name}
              </p>
              <p className="text-destructive">
                ⚠️ O usuário perderá acesso imediatamente a todos os recursos do plano.
              </p>
              <p className="text-sm">
                Caso mude de ideia, você poderá reativar a assinatura usando o botão de reativar (↺).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedSub(null)}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
