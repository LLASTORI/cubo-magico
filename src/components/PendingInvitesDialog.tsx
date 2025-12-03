import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMyInvites, getRoleLabel } from '@/hooks/useProjectMembers';
import { Mail, Check, X, Loader2, FolderOpen } from 'lucide-react';
import { useState } from 'react';

interface PendingInvitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteAccepted?: () => void;
}

export const PendingInvitesDialog = ({ 
  open, 
  onOpenChange,
  onInviteAccepted,
}: PendingInvitesDialogProps) => {
  const { toast } = useToast();
  const { invites, loading, acceptInvite, rejectInvite } = useMyInvites();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (invite: typeof invites[0]) => {
    setProcessingId(invite.id);
    const { error } = await acceptInvite(invite);
    setProcessingId(null);

    if (error) {
      toast({ title: 'Erro ao aceitar convite', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Você entrou no projeto ${invite.project?.name}!` });
      onInviteAccepted?.();
    }
  };

  const handleReject = async (inviteId: string) => {
    setProcessingId(inviteId);
    const { error } = await rejectInvite(inviteId);
    setProcessingId(null);

    if (error) {
      toast({ title: 'Erro ao recusar convite', variant: 'destructive' });
    } else {
      toast({ title: 'Convite recusado' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Convites Pendentes
          </DialogTitle>
          <DialogDescription>
            Você foi convidado para participar dos seguintes projetos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum convite pendente</p>
            </div>
          ) : (
            invites.map(invite => (
              <div 
                key={invite.id} 
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{invite.project?.name || 'Projeto'}</p>
                    <p className="text-sm text-muted-foreground">
                      Função: <Badge variant="outline">{getRoleLabel(invite.role)}</Badge>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => handleAccept(invite)}
                    disabled={processingId === invite.id}
                  >
                    {processingId === invite.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Aceitar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => handleReject(invite.id)}
                    disabled={processingId === invite.id}
                  >
                    <X className="w-4 h-4" />
                    Recusar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
