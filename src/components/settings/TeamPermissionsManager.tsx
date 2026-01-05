import { useState } from 'react';
import { useProjectMembers, ProjectMember, getRoleLabel } from '@/hooks/useProjectMembers';
import { useAllMembersPermissions, PERMISSION_AREAS, PERMISSION_LEVELS, PermissionArea, PermissionLevel } from '@/hooks/useMemberPermissions';
import { useProjectPlanInfo } from '@/hooks/useProjectPlanInfo';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Crown, Settings2, Check, AlertTriangle, Package, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InvitePermissions {
  dashboard: PermissionLevel;
  analise: PermissionLevel;
  crm: PermissionLevel;
  automacoes: PermissionLevel;
  chat_ao_vivo: PermissionLevel;
  meta_ads: PermissionLevel;
  ofertas: PermissionLevel;
  lancamentos: PermissionLevel;
  configuracoes: PermissionLevel;
  insights: PermissionLevel;
  pesquisas: PermissionLevel;
  social_listening: PermissionLevel;
}

const defaultPermissions: InvitePermissions = {
  dashboard: 'view',
  analise: 'none',
  crm: 'none',
  automacoes: 'none',
  chat_ao_vivo: 'none',
  meta_ads: 'none',
  ofertas: 'none',
  lancamentos: 'none',
  configuracoes: 'none',
  insights: 'none',
  pesquisas: 'none',
  social_listening: 'none',
};

export const TeamPermissionsManager = () => {
  const { currentProject } = useProject();
  const { members, invites, loading: membersLoading, inviteMember, cancelInvite, userRole, memberCount, maxMembers, canInvite } = useProjectMembers(currentProject?.id);
  const { allPermissions, isLoading: permissionsLoading, updateMemberPermission, isUpdating } = useAllMembersPermissions();
  const { data: planInfo, isLoading: planLoading } = useProjectPlanInfo(currentProject?.id);
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<InvitePermissions>(defaultPermissions);
  const [isInviting, setIsInviting] = useState(false);

  const isOwner = userRole === 'owner';

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    setIsInviting(true);
    try {
      // First invite with basic role
      const success = await inviteMember(inviteEmail, 'operator');
      
      if (success && currentProject?.id) {
        // Update the invite with permissions
        await supabase
          .from('project_invites')
          .update({
            permissions_dashboard: invitePermissions.dashboard,
            permissions_analise: invitePermissions.analise,
            permissions_crm: invitePermissions.crm,
            permissions_automacoes: invitePermissions.automacoes,
            permissions_chat_ao_vivo: invitePermissions.chat_ao_vivo,
            permissions_meta_ads: invitePermissions.meta_ads,
            permissions_ofertas: invitePermissions.ofertas,
            permissions_lancamentos: invitePermissions.lancamentos,
            permissions_configuracoes: invitePermissions.configuracoes,
            permissions_insights: invitePermissions.insights,
            permissions_pesquisas: invitePermissions.pesquisas,
            permissions_social_listening: invitePermissions.social_listening,
          })
          .eq('project_id', currentProject.id)
          .eq('email', inviteEmail.toLowerCase().trim())
          .eq('status', 'pending');

        setInviteDialogOpen(false);
        setInviteEmail('');
        setInvitePermissions(defaultPermissions);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const getMemberPermission = (userId: string, area: PermissionArea): PermissionLevel => {
    const perms = allPermissions.find(p => p.user_id === userId);
    return perms ? perms[area] : 'none';
  };

  const getPermissionBadge = (level: PermissionLevel) => {
    const colors: Record<PermissionLevel, string> = {
      none: 'bg-muted text-muted-foreground',
      view: 'bg-blue-500/10 text-blue-500',
      edit: 'bg-green-500/10 text-green-500',
      admin: 'bg-purple-500/10 text-purple-500',
    };
    return colors[level];
  };

  const handlePermissionChange = (userId: string, area: PermissionArea, level: PermissionLevel) => {
    updateMemberPermission({ userId, area, level });
  };

  const toggleAllPermissions = (area: PermissionArea, enabled: boolean) => {
    setInvitePermissions(prev => ({
      ...prev,
      [area]: enabled ? 'edit' : 'none',
    }));
  };

  if (membersLoading || permissionsLoading || planLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPlanTypeLabel = (type: string | null) => {
    if (!type) return '';
    return type === 'monthly' ? 'Mensal' : type === 'yearly' ? 'Anual' : type;
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const nonOwnerMembers = members.filter(m => m.role !== 'owner');
  const ownerMember = members.find(m => m.role === 'owner');

  return (
    <div className="space-y-6">
      {/* Plan Info Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {planInfo?.hasPlan ? (
                  <>Plano {planInfo.planName} <span className="text-sm font-normal text-muted-foreground">({getPlanTypeLabel(planInfo.planType)})</span></>
                ) : (
                  'Plano não definido'
                )}
              </CardTitle>
            </div>
            {isOwner && (
              <Button variant="outline" size="sm" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Fazer Upgrade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Membros</p>
              <p className="font-medium">
                {memberCount}/{maxMembers}
                {planInfo?.hasManualOverride && (
                  <span className="ml-1 text-xs text-amber-600">(ajustado)</span>
                )}
              </p>
            </div>
            {planInfo?.planMaxProjects && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Projetos</p>
                <p className="font-medium">{planInfo.planMaxProjects}</p>
              </div>
            )}
            {planInfo?.planPriceCents && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-medium">{formatCurrency(planInfo.planPriceCents)}/{planInfo.planType === 'yearly' ? 'ano' : 'mês'}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={planInfo?.subscriptionStatus === 'active' ? 'default' : planInfo?.subscriptionStatus === 'trial' ? 'secondary' : 'outline'}>
                {planInfo?.subscriptionStatus === 'active' ? 'Ativo' : planInfo?.subscriptionStatus === 'trial' ? 'Trial' : 'Sem assinatura'}
              </Badge>
            </div>
          </div>
          {planInfo?.hasManualOverride && (
            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Limite de membros ajustado manualmente (padrão do plano: {planInfo.planDefaultMembers})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Limit Alert */}
      {memberCount >= maxMembers && isOwner && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <span className="font-medium">Limite de membros atingido!</span> Este projeto possui {memberCount} de {maxMembers} membros permitidos. 
            Para adicionar mais membros, faça upgrade do plano ou remova membros existentes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Gerenciamento de Equipe
              <Badge variant="outline" className={memberCount >= maxMembers ? 'text-amber-500 border-amber-500/30' : ''}>
                {memberCount}/{maxMembers} membros
              </Badge>
            </CardTitle>
            <CardDescription>
              Configure as permissões de acesso por área para cada membro da equipe
            </CardDescription>
          </div>
          {isOwner && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canInvite}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Convidar Novo Membro</DialogTitle>
                  <DialogDescription>
                    Defina o email e as permissões de acesso para o novo membro
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Permissões por Área</Label>
                    <div className="grid gap-3">
                      {PERMISSION_AREAS.map(area => (
                        <div key={area.key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={invitePermissions[area.key] !== 'none'}
                              onCheckedChange={(checked) => toggleAllPermissions(area.key, checked as boolean)}
                            />
                            <div>
                              <p className="font-medium text-sm">{area.label}</p>
                              <p className="text-xs text-muted-foreground">{area.description}</p>
                            </div>
                          </div>
                          {invitePermissions[area.key] !== 'none' && (
                            <Select
                              value={invitePermissions[area.key]}
                              onValueChange={(value) => setInvitePermissions(prev => ({
                                ...prev,
                                [area.key]: value as PermissionLevel
                              }))}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PERMISSION_LEVELS.filter(l => l.value !== 'none').map(level => (
                                  <SelectItem key={level.value} value={level.value}>
                                    {level.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting}>
                    {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar Convite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {/* Owner Section */}
          {ownerMember && (
            <div className="mb-6 p-4 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={ownerMember.profile?.avatar_url || ''} />
                  <AvatarFallback>
                    {ownerMember.profile?.full_name?.[0] || ownerMember.profile?.email?.[0] || 'O'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ownerMember.profile?.full_name || 'Proprietário'}</span>
                    <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-500/10">
                      <Crown className="h-3 w-3 mr-1" />
                      Proprietário
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ownerMember.profile?.email}</p>
                </div>
                <p className="text-sm text-muted-foreground">Acesso total a todas as áreas</p>
              </div>
            </div>
          )}

          {/* Members Permissions Table */}
          {nonOwnerMembers.length > 0 ? (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Membro</TableHead>
                    {PERMISSION_AREAS.map(area => (
                      <TableHead key={area.key} className="text-center min-w-[120px]">
                        {area.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonOwnerMembers.map(member => (
                    <TableRow key={member.user_id}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile?.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {member.profile?.full_name?.[0] || member.profile?.email?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{member.profile?.full_name || 'Usuário'}</p>
                            <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      {PERMISSION_AREAS.map(area => (
                        <TableCell key={area.key} className="text-center">
                          {isOwner ? (
                            <Select
                              value={getMemberPermission(member.user_id, area.key)}
                              onValueChange={(value) => handlePermissionChange(member.user_id, area.key, value as PermissionLevel)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-28 mx-auto">
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
                          ) : (
                            <Badge className={getPermissionBadge(getMemberPermission(member.user_id, area.key))}>
                              {PERMISSION_LEVELS.find(l => l.value === getMemberPermission(member.user_id, area.key))?.label}
                            </Badge>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum membro na equipe ainda.</p>
              {isOwner && (
                <p className="text-sm mt-1">Clique em "Adicionar Membro" para convidar alguém.</p>
              )}
            </div>
          )}

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Convites Pendentes</h4>
              <div className="space-y-2">
                {invites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {isOwner && (
                      <Button variant="ghost" size="sm" onClick={() => cancelInvite(invite.id)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Levels Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PERMISSION_LEVELS.map(level => (
              <div key={level.value} className="flex items-start gap-2">
                <Badge className={`${getPermissionBadge(level.value)} shrink-0`}>
                  {level.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{level.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
