import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageCircle, Clock, CheckCheck, Archive } from 'lucide-react';
import { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
  isLoading?: boolean;
}

export function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect,
  isLoading 
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !search || 
      conv.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
      conv.contact?.email?.toLowerCase().includes(search.toLowerCase()) ||
      conv.contact?.phone?.includes(search) ||
      conv.remote_jid.includes(search);

    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <MessageCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'closed': return <CheckCheck className="h-3 w-3" />;
      case 'archived': return <Archive className="h-3 w-3" />;
      default: return null;
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">Todas</TabsTrigger>
            <TabsTrigger value="open" className="flex-1 text-xs">Abertas</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 text-xs">Aguardando</TabsTrigger>
            <TabsTrigger value="closed" className="flex-1 text-xs">Fechadas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={cn(
                  "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                  selectedId === conversation.id && "bg-muted"
                )}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                    style={{ 
                      backgroundColor: conversation.department?.color || 'hsl(var(--primary))',
                      color: 'white'
                    }}
                  >
                    {getInitials(conversation.contact?.name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {conversation.contact?.name || conversation.remote_jid}
                      </span>
                      {conversation.last_message_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conversation.last_message_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.contact?.phone || conversation.remote_jid}
                      </span>
                      
                      {conversation.unread_count > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {conversation.department && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: conversation.department.color, color: conversation.department.color }}
                        >
                          {conversation.department.name}
                        </Badge>
                      )}
                      
                      {conversation.assigned_agent && (
                        <span className="text-xs text-muted-foreground">
                          {conversation.assigned_agent.display_name}
                        </span>
                      )}

                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        {getStatusIcon(conversation.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
