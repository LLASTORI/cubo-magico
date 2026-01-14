import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Loader2, ArrowRight, Image, FileText, Mic, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { cn } from '@/lib/utils';

interface WhatsAppMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content_type: string;
  content: string | null;
  created_at: string;
  status: string;
}

interface WhatsAppConversation {
  id: string;
  status: string;
  last_message_at: string | null;
  messages: WhatsAppMessage[];
}

interface ContactWhatsAppHistoryProps {
  contactId: string;
}

export function ContactWhatsAppHistory({ contactId }: ContactWhatsAppHistoryProps) {
  const { navigateTo } = useProjectNavigation();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['contact-whatsapp-history', contactId],
    queryFn: async () => {
      // Fetch all conversations for this contact
      const { data: convs, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id, status, last_message_at')
        .eq('contact_id', contactId)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;
      if (!convs || convs.length === 0) return [];

      // Fetch messages for each conversation (limit to last 50)
      const conversationsWithMessages: WhatsAppConversation[] = await Promise.all(
        convs.map(async (conv) => {
          const { data: messages } = await supabase
            .from('whatsapp_messages')
            .select('id, direction, content_type, content, created_at, status')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(50);

          return {
            ...conv,
            messages: (messages || []).reverse() as WhatsAppMessage[],
          };
        })
      );

      return conversationsWithMessages;
    },
    enabled: !!contactId,
  });

  const formatMessageTime = (date: string) => {
    return format(new Date(date), "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'image':
        return <Image className="h-3 w-3" />;
      case 'audio':
        return <Mic className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'document':
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getMessagePreview = (message: WhatsAppMessage) => {
    if (message.content_type !== 'text' && message.content_type !== 'image') {
      const icon = getContentIcon(message.content_type);
      return (
        <span className="flex items-center gap-1 text-muted-foreground italic">
          {icon}
          {message.content || `[${message.content_type}]`}
        </span>
      );
    }
    return message.content || '[Mensagem sem conteúdo]';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">Nenhuma conversa de WhatsApp</p>
        <p className="text-sm text-muted-foreground mt-1">
          As conversas aparecerão aqui quando houver interação via WhatsApp.
        </p>
      </div>
    );
  }

  const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {conversations.length} conversa{conversations.length !== 1 ? 's' : ''} • {totalMessages} mensagen{totalMessages !== 1 ? 's' : ''}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigateTo(`/whatsapp?conversation=${conversations[0].id}`)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Abrir Chat
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Messages grouped by conversation */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {conversations.map((conv) => (
            <div key={conv.id} className="space-y-2">
              {/* Conversation header */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  conv.status === 'open' ? "bg-green-500" : 
                  conv.status === 'pending' ? "bg-yellow-500" : "bg-gray-400"
                )} />
                <span>
                  {conv.status === 'open' ? 'Conversa aberta' : 
                   conv.status === 'pending' ? 'Aguardando' : 'Conversa fechada'}
                </span>
                {conv.last_message_at && (
                  <>
                    <span>•</span>
                    <span>Última msg: {formatMessageTime(conv.last_message_at)}</span>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                {conv.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sem mensagens</p>
                ) : (
                  conv.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col gap-0.5 max-w-[85%] rounded-lg p-2 text-sm",
                        message.direction === 'outbound'
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <span className="break-words">{getMessagePreview(message)}</span>
                      <span className={cn(
                        "text-[10px] self-end",
                        message.direction === 'outbound' 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      )}>
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
