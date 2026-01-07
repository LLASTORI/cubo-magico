import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw,
  Edit3,
  X,
  RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FeatureLockedButton } from '@/components/FeatureGate';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SocialComment } from '@/hooks/useSocialListening';

interface ReplyApprovalDialogProps {
  comment: SocialComment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ReplyApprovalDialog({ 
  comment, 
  open, 
  onOpenChange, 
  projectId 
}: ReplyApprovalDialogProps) {
  const [editedReply, setEditedReply] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate reply mutation
  const generateReply = useMutation({
    mutationFn: async () => {
      if (!comment) throw new Error('Comentário não selecionado');
      
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { 
          action: 'generate_reply', 
          projectId, 
          commentId: comment.id 
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      setEditedReply(data.reply || '');
      toast({
        title: 'Resposta gerada!',
        description: 'Revise e aprove a resposta antes de enviar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar resposta',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Approve reply mutation
  const approveReply = useMutation({
    mutationFn: async (reply: string) => {
      if (!comment) throw new Error('Comentário não selecionado');
      
      const { error } = await supabase
        .from('social_comments')
        .update({
          ai_suggested_reply: reply,
          reply_status: 'approved'
        })
        .eq('id', comment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_comments'] });
      toast({
        title: 'Resposta aprovada!',
        description: 'Copie a resposta e cole no Instagram/Facebook.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar resposta',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Reject reply mutation
  const rejectReply = useMutation({
    mutationFn: async () => {
      if (!comment) throw new Error('Comentário não selecionado');
      
      const { error } = await supabase
        .from('social_comments')
        .update({
          reply_status: 'rejected'
        })
        .eq('id', comment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_comments'] });
      toast({
        title: 'Resposta rejeitada',
        description: 'O comentário foi marcado como não respondido.',
      });
      onOpenChange(false);
    }
  });

  // Reset to pending mutation
  const resetToPending = useMutation({
    mutationFn: async () => {
      if (!comment) throw new Error('Comentário não selecionado');
      
      const { error } = await supabase
        .from('social_comments')
        .update({
          reply_status: 'pending'
        })
        .eq('id', comment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_comments'] });
      toast({
        title: 'Status resetado',
        description: 'O comentário voltou para pendente.',
      });
    }
  });

  const handleCopy = async () => {
    const textToCopy = editedReply || comment?.ai_suggested_reply || '';
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast({
      title: 'Copiado!',
      description: 'Resposta copiada para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = () => {
    const finalReply = editedReply || comment?.ai_suggested_reply || '';
    if (!finalReply.trim()) {
      toast({
        title: 'Resposta vazia',
        description: 'Gere ou escreva uma resposta antes de aprovar.',
        variant: 'destructive',
      });
      return;
    }
    approveReply.mutate(finalReply);
  };

  const currentReply = editedReply || comment?.ai_suggested_reply || '';
  const hasReply = currentReply.trim().length > 0;
  const replyStatus = comment?.reply_status;

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && comment) {
      setEditedReply(comment.ai_suggested_reply || '');
      setIsEditing(false);
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  if (!comment) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Responder Comentário
          </DialogTitle>
          <DialogDescription>
            Gere uma resposta com IA, revise e copie para responder no Instagram/Facebook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comentário Original</label>
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{comment.author_name || 'Usuário'}</span>
                {comment.classification && (
                  <Badge variant="outline" className="text-xs">
                    {comment.classification}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{comment.text}</p>
            </div>
          </div>

          {/* AI Context */}
          {comment.ai_summary && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-500">Resumo IA</span>
              </div>
              <p className="text-muted-foreground">{comment.ai_summary}</p>
            </div>
          )}

          {/* Reply Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Resposta Sugerida</label>
              <div className="flex items-center gap-2">
                {replyStatus && (
                  <Badge 
                    variant={
                      replyStatus === 'approved' ? 'default' :
                      replyStatus === 'sent' ? 'default' :
                      replyStatus === 'rejected' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {replyStatus === 'approved' ? 'Aprovada' :
                     replyStatus === 'sent' ? 'Enviada' :
                     replyStatus === 'rejected' ? 'Rejeitada' :
                     'Pendente'}
                  </Badge>
                )}
              </div>
            </div>

            {isEditing || !hasReply ? (
              <Textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                placeholder="Escreva ou gere uma resposta..."
                rows={4}
                className="resize-none"
              />
            ) : (
              <div 
                className="p-3 rounded-lg bg-muted/50 text-sm cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <p className="whitespace-pre-wrap">{currentReply}</p>
                <p className="text-xs text-muted-foreground mt-2">Clique para editar</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <FeatureLockedButton
              featureKey="ai_analysis.social_listening_replies"
              lockedMessage="Geração de respostas com IA está desabilitada para este projeto/plano."
              variant="outline"
              onClick={() => generateReply.mutate()}
              disabled={generateReply.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${generateReply.isPending ? 'animate-spin' : ''}`} />
              {hasReply ? 'Regenerar' : 'Gerar com IA'}
            </FeatureLockedButton>
            
            {hasReply && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                {isEditing ? 'Visualizar' : 'Editar'}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {hasReply && (
              <Button
                variant="outline"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            )}
            
            {(replyStatus === 'approved' || replyStatus === 'rejected' || replyStatus === 'sent') && (
              <Button
                variant="outline"
                onClick={() => resetToPending.mutate()}
                disabled={resetToPending.isPending}
                title="Voltar para pendente"
              >
                <RotateCcw className={`h-4 w-4 mr-2 ${resetToPending.isPending ? 'animate-spin' : ''}`} />
                Pendente
              </Button>
            )}

            {replyStatus !== 'rejected' && (
              <Button
                variant="ghost"
                onClick={() => rejectReply.mutate()}
                disabled={rejectReply.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            )}
            
            <Button
              onClick={handleApprove}
              disabled={!hasReply || approveReply.isPending}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Aprovar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
