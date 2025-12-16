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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  ChevronsDown,
  Paperclip,
  X,
  Mic,
  Square
} from 'lucide-react';
import { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { WhatsAppMessage, useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatPhoneForDisplay, getFullPhoneNumber } from '@/components/ui/international-phone-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversation: WhatsAppConversation | null;
  instanceName?: string;
  onTransfer?: () => void;
  onClose?: () => void;
}

interface SelectedFile {
  file: File;
  preview: string;
  type: 'image' | 'audio' | 'video' | 'document';
}

export function ChatWindow({ conversation, instanceName, onTransfer, onClose }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    sendMediaMessage,
    markAsRead,
    isSending,
    isSendingMedia
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

  // Cleanup file preview on unmount
  useEffect(() => {
    return () => {
      if (selectedFile?.preview) {
        URL.revokeObjectURL(selectedFile.preview);
      }
      // Cleanup recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [selectedFile, isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { 
            type: 'audio/webm' 
          });
          
          // Send the audio
          await sendRecordedAudio(audioFile);
        }
        
        audioChunksRef.current = [];
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const sendRecordedAudio = async (audioFile: File) => {
    if (!conversation || !instanceName) return;

    setIsUploading(true);
    
    try {
      const contact = conversation.contact;
      const remoteJid = contact?.phone
        ? `${getFullPhoneNumber(
            contact.phone_country_code || '55',
            contact.phone_ddd || '',
            contact.phone
          )}@s.whatsapp.net`
        : conversation.remote_jid;

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
      const filePath = `whatsapp-media/${conversation.project_id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, audioFile, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do áudio');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      const mediaUrl = urlData.publicUrl;

      // Send media message
      sendMediaMessage({
        conversationId: conversation.id,
        instanceName,
        remoteJid,
        mediaType: 'audio',
        mediaUrl,
        fileName: audioFile.name,
        mimetype: 'audio/webm',
      });

    } catch (error) {
      console.error('Error sending audio:', error);
      toast.error('Erro ao enviar áudio');
    } finally {
      setIsUploading(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMediaType = (file: File): 'image' | 'audio' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleFileSelect = (acceptType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
    setAttachMenuOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 16MB for WhatsApp)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 16MB');
      return;
    }

    const type = getMediaType(file);
    const preview = type === 'image' || type === 'video' 
      ? URL.createObjectURL(file) 
      : '';

    setSelectedFile({ file, preview, type });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearSelectedFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
  };

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

  const handleSendMedia = async () => {
    if (!selectedFile || !conversation || !instanceName) return;

    setIsUploading(true);
    
    try {
      const contact = conversation.contact;
      const remoteJid = contact?.phone
        ? `${getFullPhoneNumber(
            contact.phone_country_code || '55',
            contact.phone_ddd || '',
            contact.phone
          )}@s.whatsapp.net`
        : conversation.remote_jid;

      // Upload file to Supabase Storage
      const fileExt = selectedFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `whatsapp-media/${conversation.project_id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, selectedFile.file, {
          contentType: selectedFile.file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do arquivo');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      const mediaUrl = urlData.publicUrl;

      // Send media message
      sendMediaMessage({
        conversationId: conversation.id,
        instanceName,
        remoteJid,
        mediaType: selectedFile.type,
        mediaUrl,
        caption: newMessage.trim() || undefined,
        fileName: selectedFile.file.name,
        mimetype: selectedFile.file.type,
      });

      clearSelectedFile();
      setNewMessage('');
    } catch (error) {
      console.error('Error sending media:', error);
      toast.error('Erro ao enviar mídia');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) {
        handleSendMedia();
      } else {
        handleSend();
      }
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
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          {conversation.contact?.avatar_url ? (
            <img 
              src={conversation.contact.avatar_url}
              alt={conversation.contact?.name || 'Avatar'}
              className="h-10 w-10 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div 
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium",
              conversation.contact?.avatar_url && "hidden"
            )}
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

      {/* Selected file preview */}
      {selectedFile && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {selectedFile.type === 'image' && selectedFile.preview ? (
                <img 
                  src={selectedFile.preview} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded-lg"
                />
              ) : selectedFile.type === 'video' && selectedFile.preview ? (
                <video 
                  src={selectedFile.preview} 
                  className="h-20 w-20 object-cover rounded-lg"
                />
              ) : selectedFile.type === 'audio' ? (
                <div className="h-20 w-20 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileAudio className="h-8 w-8 text-primary" />
                </div>
              ) : (
                <div className="h-20 w-20 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelectedFile}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        {!instanceName && (
          <p className="text-sm text-destructive mb-2 text-center">
            Nenhum número WhatsApp conectado. Configure nas Configurações.
          </p>
        )}
        
        {/* Recording UI */}
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center gap-3 bg-destructive/10 rounded-full px-4 py-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium text-destructive">
                Gravando... {formatRecordingTime(recordingTime)}
              </span>
            </div>
            
            <Button
              onClick={stopRecording}
              className="bg-destructive hover:bg-destructive/90"
              size="icon"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Attachment button */}
            <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={!instanceName || isUploading || isSendingMedia}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" side="top" align="start">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => handleFileSelect('image/*')}
                  >
                    <ImageIcon className="h-4 w-4 text-green-500" />
                    Imagem
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => handleFileSelect('video/*')}
                  >
                    <FileVideo className="h-4 w-4 text-blue-500" />
                    Vídeo
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => handleFileSelect('audio/*')}
                  >
                    <FileAudio className="h-4 w-4 text-orange-500" />
                    Áudio
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => handleFileSelect('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt')}
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Documento
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Input
              placeholder={selectedFile ? "Adicionar legenda..." : "Digite uma mensagem..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || isSendingMedia || isUploading || !instanceName}
              className="flex-1"
            />
            
            {/* Show mic button when no text or file selected */}
            {!newMessage.trim() && !selectedFile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={startRecording}
                    variant="outline"
                    size="icon"
                    disabled={isSending || isSendingMedia || isUploading || !instanceName}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Gravar áudio</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      onClick={selectedFile ? handleSendMedia : handleSend} 
                      disabled={
                        (!newMessage.trim() && !selectedFile) || 
                        isSending || 
                        isSendingMedia || 
                        isUploading || 
                        !instanceName
                      }
                    >
                      {isSending || isSendingMedia || isUploading ? (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
