import { useState, useEffect } from 'react';
import { useProjectMembers, ProjectRole, getRoleLabel } from '@/hooks/useProjectMembers';
import { useRoleTemplates, RoleTemplate, useApplyRoleTemplate } from '@/hooks/useRoleTemplates';
import { useProjectPlanInfo } from '@/hooks/useProjectPlanInfo';
import { useProject } from '@/contexts/ProjectContext';
import { RoleTemplateSelector } from './RoleTemplateSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Users, Crown, Shield, User, Settings2, Loader2, 
  AlertTriangle, CheckCircle2, UserPlus, Package, Sparkles, Trash2, Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');

const getRoleIcon = (role: ProjectRole) => {
  switch (role) {
    case 'owner': return <Crown className="w-4 h-4 text-amber-500" />;
    case 'manager': return <Shield className="w-4 h-4 text-blue-500" />;
    case 'operator': return <User className="w-4 h-4 text-muted-foreground" />;
  }
};

export function MemberRoleManager() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  
  const { members, invites, userRole, loading, memberCount, maxMembers, canInvite, inviteMember, cancelInvite, refresh } = useProjectMembers(projectId || null);
  const { templates } = useRoleTemplates(projectId);
  const applyTemplate = useApplyRoleTemplate();
  const { data: planInfo, isLoading: planLoading } = useProjectPlanInfo(projectId || null);

  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Invite state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTemplateId, setInviteTemplateId] = useState<string>('');
  const [isInviting, setIsInviting] = useState(false);

  // Fetch current role_template_id for members
  const [memberTemplates, setMemberTemplates] = useState<Record<string, string | null>>({});
  
  useEffect(() => {
    if (!projectId) return;
    
    const fetchMemberTemplates = async () => {
      const { data } = await supabase
        .from('project_members')
        .select('id, role_template_id')
        .eq('project_id', projectId);
      
      if (data) {
        const map: Record<string, string | null> = {};
        data.forEach(m => {
          map[m.id] = m.role_template_id;
        });
        setMemberTemplates(map);
      }
    };
    
    fetchMemberTemplates();
  }, [projectId, members]);

  const handleOpenDialog = (member: typeof members[0]) => {
    setSelectedMember(member);
    setSelectedTemplateId(memberTemplates[member.id] || '');
    setIsDialogOpen(true);
  };

  const handleApplyRole = async () => {
    if (!selectedMember || !selectedTemplateId || !projectId) return;

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    await applyTemplate.mutateAsync({
      memberId: selectedMember.id,
      template: template as RoleTemplate,
      projectId,
    });

    setMemberTemplates(prev => ({
      ...prev,
      [selectedMember.id]: selectedTemplateId,
    }));

    setIsDialogOpen(false);
    refresh();
  };

  const handleInvite = async () => {
    const validation = emailSchema.safeParse(inviteEmail);
    if (!validation.success) {
      toast.error('Email inválido');
      return;
    }

    if (!inviteTemplateId) {
      toast.error('Selecione um cargo');
      return;
    }

    const template = templates.find(t => t.id === inviteTemplateId);
    if (!template) {
      toast.error('Cargo inválido');
      return;
    }

    setIsInviting(true);
    const { error } = await inviteMember(inviteEmail, template.base_role, currentProject?.name || 'Projeto', inviteTemplateId);
    setIsInviting(false);

    if (error) {
      toast.error(error.message || 'Erro ao convidar');
    } else {
      toast.success('Convite enviado!');
      setInviteEmail('');
      setInviteTemplateId('');
      setIsInviteDialogOpen(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await cancelInvite(inviteId);
    if (error) {
      toast.error('Erro ao cancelar convite');
    } else {
      toast.success('Convite cancelado');
    }
  };

  const getTemplateInfo = (memberId: string) => {
    const templateId = memberTemplates[memberId];
    if (!templateId) return null;
    return templates.find(t => t.id === templateId);
  };

  const membersWithoutTemplate = members.filter(m => 
    m.role !== 'owner' && !memberTemplates[m.id]
  );

  const isOwner = userRole === 'owner';
  const canManage = userRole === 'owner' || userRole === 'manager';

  const getPlanTypeLabel = (type: string | null) => {
    if (!type) return '';
    return type === 'monthly' ? 'Mensal' : type === 'yearly' ? 'Anual' : type;
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  if (loading || planLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
      {memberCount >= maxMembers && canManage && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <span className="font-medium">Limite de membros atingido!</span> Este projeto possui {memberCount} de {maxMembers} membros permitidos. 
            Para adicionar mais membros, faça upgrade do plano ou remova membros existentes.
          </AlertDescription>
        </Alert>
      )}

      {/* Members Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cargos dos Membros
              <Badge variant="outline" className={memberCount >= maxMembers ? 'text-amber-500 border-amber-500/30' : ''}>
                {memberCount}/{maxMembers} membros
              </Badge>
            </CardTitle>
            <CardDescription>
              Gerencie os cargos e permissões dos membros do projeto
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={() => setIsInviteDialogOpen(true)} disabled={!canInvite}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {membersWithoutTemplate.length > 0 && canManage && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <span className="font-medium">{membersWithoutTemplate.length} membro(s)</span> ainda não tem cargo definido. 
                Clique em "Definir Cargo" para configurar suas permissões.
              </AlertDescription>
            </Alert>
          )}

          <TooltipProvider>
            <div className="space-y-2">
              {members.map(member => {
                const templateInfo = getTemplateInfo(member.id);
                const isMemberOwner = member.role === 'owner';
                
                return (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.profile?.full_name || member.profile?.email || 'Usuário'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isMemberOwner ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="gap-1 cursor-default">
                              <Crown className="w-3 h-3" />
                              Proprietário
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">Proprietário do projeto</p>
                            <p className="text-xs text-muted-foreground">Acesso total a todas as funcionalidades</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : templateInfo ? (
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="gap-1 cursor-default">
                                <CheckCircle2 className="w-3 h-3" />
                                {templateInfo.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium">{templateInfo.name}</p>
                              <p className="text-xs text-muted-foreground">{templateInfo.description}</p>
                            </TooltipContent>
                          </Tooltip>
                          {canManage && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenDialog(member)}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="gap-1 text-muted-foreground cursor-default">
                                {getRoleIcon(member.role)}
                                {getRoleLabel(member.role)}
                                <span className="text-xs">(legado)</span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">Cargo legado</p>
                              <p className="text-xs text-muted-foreground">
                                Este membro foi adicionado antes do sistema de cargos. 
                                Clique em "Definir Cargo" para configurar suas permissões.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          {canManage && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenDialog(member)}
                            >
                              Definir Cargo
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-sm font-medium">Convites Pendentes</Label>
              <div className="space-y-2">
                {invites.map(invite => (
                  <div 
                    key={invite.id} 
                    className="flex items-center justify-between p-3 border rounded-lg border-dashed"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        {getRoleIcon(invite.role)}
                        {getRoleLabel(invite.role)}
                      </Badge>
                      {canManage && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para definir/alterar cargo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Cargo</DialogTitle>
            <DialogDescription>
              {selectedMember && (
                <>Escolha o cargo para {selectedMember.profile?.full_name || selectedMember.profile?.email}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RoleTemplateSelector
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              projectId={projectId}
              showPreview={true}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApplyRole}
              disabled={!selectedTemplateId || applyTemplate.isPending}
            >
              {applyTemplate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Aplicar Cargo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para convidar membro */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Membro
            </DialogTitle>
            <DialogDescription>
              Envie um convite por email e defina o cargo do novo membro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cargo</Label>
              <RoleTemplateSelector
                value={inviteTemplateId}
                onValueChange={setInviteTemplateId}
                projectId={projectId}
                showPreview={true}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleInvite}
              disabled={!inviteEmail || !inviteTemplateId || isInviting}
            >
              {isInviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
