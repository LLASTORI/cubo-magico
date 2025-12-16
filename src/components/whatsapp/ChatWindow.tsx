import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Send, 
  MoreVertical, 
  ArrowRightLeft,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  MessageCircle,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  FileText,
  Download,
  ChevronsUp,
  ChevronsDown
} from 'lucide-react';
import { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { WhatsAppMessage, useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatPhoneForDisplay, getFullPhoneNumber } from '@/components/ui/international-phone-input';

interface ChatWindowProps {
  conversation: WhatsAppConversation | null;
  instanceName?: string;
  onTransfer?: () => void;
  onClose?: () => void;
}

export function ChatWindow({ conversation, instanceName, onTransfer, onClose }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    markAsRead,
    isSending 
  } = useWhatsAppMessages(conversation?.id || null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive (if autoScroll is enabled)
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll, scrollToBottom]);

  // Mark as read when conversation is opened
  useEffect(() => {
    if (conversation?.id && conversation.unread_count > 0) {
      markAsRead(conversation.id);
    }
  }, [conversation?.id, conversation?.unread_count, markAsRead]);

  const handleSend = () => {
    if (!newMessage.trim() || !conversation || !instanceName) return;

    const contact = conversation.contact;
    const remoteJid = contact?.phone
      ? `${getFullPhoneNumber(
          contact.phone_country_code || '55',
          contact.phone_ddd || '',
          contact.phone
        )}@s.whatsapp.net`
      : conversation.remote_jid;

    sendMessage({
      conversationId: conversation.id,
      content: newMessage.trim(),
      instanceName,
      remoteJid,
    });
    
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent': return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed': return <AlertCircle className="h-3 w-3 text-destructive" />;
      default: return null;
    }
  };

  const renderMessageContent = (message: WhatsAppMessage) => {
    const isOutbound = message.direction === 'outbound';
    
    switch (message.content_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url ? (
              <img 
                src={message.media_url} 
                alt="Imagem" 
                className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer"
                onClick={() => window.open(message.media_url!, '_blank')}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm opacity-70">
                <ImageIcon className="h-4 w-4" />
                <span>[Imagem]</span>
              </div>
            )}
            {message.content && message.content !== '[Imagem]' && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
        );
      
      case 'audio':
        return (
          <div className="space-y-2">
            {message.media_url ? (
              <audio controls className="max-w-full">
                <source src={message.media_url} type={message.media_mime_type || 'audio/ogg'} />
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <div className="flex items-center gap-2 text-sm opacity-70">
                <FileAudio className="h-4 w-4" />
                <span>[Áudio]</span>
              </div>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url ? (
              <video controls className="max-w-full rounded-lg max-h-64">
                <source src={message.media_url} type={message.media_mime_type || 'video/mp4'} />
                Seu navegador não suporta vídeo.
              </video>
            ) : (
              <div className="flex items-center gap-2 text-sm opacity-70">
                <FileVideo className="h-4 w-4" />
                <span>[Vídeo]</span>
              </div>
            )}
            {message.content && message.content !== '[Vídeo]' && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
        );
      
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{message.content || '[Documento]'}</span>
            {message.media_url && (
              <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 hover:text-primary" />
              </a>
            )}
          </div>
        );
      
      case 'sticker':
        return message.media_url ? (
          <img 
            src={message.media_url} 
            alt="Sticker" 
            className="max-w-24 max-h-24"
          />
        ) : (
          <span className="text-sm opacity-70">[Sticker]</span>
        );
      
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
        <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa na lista para começar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium"
            style={{ 
              backgroundColor: conversation.department?.color || 'hsl(var(--primary))',
              color: 'white'
            }}
          >
            {conversation.contact?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium">{conversation.contact?.name || conversation.remote_jid}</p>
            <p className="text-sm text-muted-foreground">
              {conversation.contact?.phone 
                ? formatPhoneForDisplay(
                    conversation.contact.phone_country_code || '55',
                    conversation.contact.phone_ddd || '',
                    conversation.contact.phone
                  )
                : conversation.remote_jid}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.department && (
            <Badge 
              variant="outline"
              style={{ borderColor: conversation.department.color, color: conversation.department.color }}
            >
              {conversation.department.name}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onTransfer}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir conversa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClose}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Encerrar conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 relative min-h-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages?.map((message, index) => {
                const isOutbound = message.direction === 'outbound';
                const showDate = index === 0 || 
                  format(new Date(message.created_at), 'yyyy-MM-dd') !== 
                  format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd');

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <Badge variant="secondary" className="text-xs">
                          {format(new Date(message.created_at), "d 'de' MMMM", { locale: ptBR })}
                        </Badge>
                      </div>
                    )}
                    
                    <div className={cn(
                      "flex",
                      isOutbound ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[70%] rounded-lg p-3",
                        isOutbound 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}>
                        {renderMessageContent(message)}
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          isOutbound ? "justify-end" : "justify-start"
                        )}>
                          <span className={cn(
                            "text-xs",
                            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {isOutbound && getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Navigation buttons */}
        {messages && messages.length > 0 && (
          <div className="absolute right-6 bottom-4 flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 rounded-full shadow-md"
                  onClick={scrollToTop}
                >
                  <ChevronsUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Ir para o início</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={autoScroll ? "default" : "secondary"}
                  size="icon" 
                  className="h-8 w-8 rounded-full shadow-md"
                  onClick={() => {
                    setAutoScroll(!autoScroll);
                    if (!autoScroll) scrollToBottom();
                  }}
                >
                  <ChevronsDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {autoScroll ? 'Auto-rolagem ativa' : 'Ir para o final'}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        {!instanceName && (
          <p className="text-sm text-destructive mb-2 text-center">
            Nenhum número WhatsApp conectado. Configure nas Configurações.
          </p>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending || !instanceName}
            className="flex-1"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button 
                  onClick={handleSend} 
                  disabled={!newMessage.trim() || isSending || !instanceName}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!instanceName && (
              <TooltipContent>
                Conecte um número WhatsApp primeiro
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
