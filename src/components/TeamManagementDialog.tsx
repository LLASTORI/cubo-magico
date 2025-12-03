import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useProjectMembers, ProjectRole, getRoleLabel, canManageRole } from '@/hooks/useProjectMembers';
import { Users, UserPlus, Mail, Crown, Shield, User, Trash2, Loader2, LogOut, ArrowRightLeft } from 'lucide-react';
import { z } from 'zod';

interface TeamManagementDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeaveProject?: () => void;
}

const emailSchema = z.string().email('Email inválido');

const getRoleIcon = (role: ProjectRole) => {
  switch (role) {
    case 'owner': return <Crown className="w-4 h-4 text-amber-500" />;
    case 'manager': return <Shield className="w-4 h-4 text-blue-500" />;
    case 'operator': return <User className="w-4 h-4 text-muted-foreground" />;
  }
};

const getRoleBadgeVariant = (role: ProjectRole) => {
  switch (role) {
    case 'owner': return 'default';
    case 'manager': return 'secondary';
    case 'operator': return 'outline';
  }
};

export const TeamManagementDialog = ({ 
  projectId, 
  projectName, 
  open, 
  onOpenChange,
  onLeaveProject,
}: TeamManagementDialogProps) => {
  const { toast } = useToast();
  const {
    members,
    invites,
    userRole,
    loading,
    memberCount,
    maxMembers,
    canInvite,
    inviteMember,
    cancelInvite,
    removeMember,
    transferOwnership,
    leaveProject,
  } = useProjectMembers(projectId);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('operator');
  const [submitting, setSubmitting] = useState(false);

  const handleInvite = async () => {
    const validation = emailSchema.safeParse(inviteEmail);
    if (!validation.success) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await inviteMember(inviteEmail, inviteRole);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Convite enviado!' });
      setInviteEmail('');
      setInviteRole('operator');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await cancelInvite(inviteId);
    if (error) {
      toast({ title: 'Erro ao cancelar convite', variant: 'destructive' });
    } else {
      toast({ title: 'Convite cancelado' });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const { error } = await removeMember(memberId);
    if (error) {
      toast({ title: 'Erro ao remover membro', variant: 'destructive' });
    } else {
      toast({ title: `${memberName} removido do projeto` });
    }
  };

  const handleTransferOwnership = async (newOwnerId: string, newOwnerName: string) => {
    const { error } = await transferOwnership(newOwnerId);
    if (error) {
      toast({ title: 'Erro ao transferir propriedade', variant: 'destructive' });
    } else {
      toast({ title: `Propriedade transferida para ${newOwnerName}` });
    }
  };

  const handleLeaveProject = async () => {
    const { error } = await leaveProject();
    if (error) {
      toast({ title: 'Erro ao sair do projeto', variant: 'destructive' });
    } else {
      toast({ title: 'Você saiu do projeto' });
      onOpenChange(false);
      onLeaveProject?.();
    }
  };

  const availableRoles: ProjectRole[] = userRole === 'owner' 
    ? ['manager', 'operator'] 
    : ['operator'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipe do Projeto
          </DialogTitle>
          <DialogDescription>
            {projectName} • {memberCount}/{maxMembers} membros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Section */}
          {canInvite && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserPlus className="w-4 h-4" />
                Convidar Membro
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectRole)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={submitting || !inviteEmail}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convidar'}
                </Button>
              </div>
              {memberCount >= maxMembers && (
                <p className="text-xs text-amber-600">Limite de {maxMembers} membros atingido</p>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Membros</Label>
            <div className="space-y-2">
              {members.map(member => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.full_name || member.profile?.email || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </Badge>
                    
                    {/* Actions for non-owner members */}
                    {member.role !== 'owner' && userRole && canManageRole(userRole, member.role) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.profile?.full_name || member.profile?.email} será removido do projeto.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRemoveMember(member.id, member.profile?.full_name || 'Membro')}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Transfer ownership button */}
                    {userRole === 'owner' && member.role !== 'owner' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Transferir propriedade">
                            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Transferir propriedade?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.profile?.full_name || member.profile?.email} se tornará o proprietário. 
                              Você será rebaixado para Gerente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleTransferOwnership(member.user_id, member.profile?.full_name || 'Membro')}
                            >
                              Transferir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Convites Pendentes</Label>
              <div className="space-y-2">
                {invites.map(invite => (
                  <div 
                    key={invite.id} 
                    className="flex items-center justify-between p-3 border rounded-lg border-dashed"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invite.email}</p>
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {userRole && userRole !== 'owner' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive sm:mr-auto">
                  <LogOut className="w-4 h-4" />
                  Sair do Projeto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair do projeto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você perderá acesso a este projeto. Para voltar, precisará de um novo convite.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveProject}>
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
