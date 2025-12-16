import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Phone, 
  Tag, 
  ExternalLink,
  Calendar,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppAgents } from '@/hooks/useWhatsAppAgents';
import { useWhatsAppDepartments } from '@/hooks/useWhatsAppDepartments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { formatPhoneForDisplay } from '@/components/ui/international-phone-input';

interface ContactPanelProps {
  conversation: WhatsAppConversation | null;
  onAssign?: (agentId: string | null) => void;
  onTransfer?: (departmentId: string) => void;
}

export function ContactPanel({ conversation, onAssign, onTransfer }: ContactPanelProps) {
  const { agents } = useWhatsAppAgents();
  const { departments } = useWhatsAppDepartments();

  if (!conversation) {
    return (
      <div className="w-80 border-l bg-muted/30 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Selecione uma conversa</p>
      </div>
    );
  }

  const contact = conversation.contact;
  const onlineAgents = agents?.filter(a => a.status === 'online' && a.is_active) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="w-80 border-l flex flex-col h-full bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Contact Info */}
          <div className="text-center">
            <div 
              className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-medium mx-auto mb-3"
              style={{ 
                backgroundColor: conversation.department?.color || 'hsl(var(--primary))',
                color: 'white'
              }}
            >
              {contact?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <h3 className="font-semibold text-lg">
              {contact?.name || 'Contato'}
            </h3>
            {contact && (
              <Link 
                to={`/crm/contact/${contact.id}`}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Ver ficha completa
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>

          <Separator />

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Informações</h4>
            
            {contact?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            
            {contact?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatPhoneForDisplay(
                    contact.phone_country_code || '55',
                    contact.phone_ddd || '',
                    contact.phone
                  )}
                </span>
              </div>
            )}
            
            {!contact?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{conversation.remote_jid}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {contact?.tags && contact.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Assignment */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Atribuição</h4>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Departamento</label>
              <Select
                value={conversation.department_id || 'none'}
                onValueChange={(value) => onTransfer?.(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem departamento</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: dept.color }}
                        />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Atendente</label>
              <Select
                value={conversation.assigned_to || 'none'}
                onValueChange={(value) => onAssign?.(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar atendente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {onlineAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        {agent.display_name || 'Atendente'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Conversation Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Conversa</h4>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline" className="mt-1">
                  {conversation.status === 'open' ? 'Aberta' :
                   conversation.status === 'pending' ? 'Aguardando' :
                   conversation.status === 'closed' ? 'Fechada' : 'Arquivada'}
                </Badge>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Não lidas</p>
                <p className="font-medium mt-1">{conversation.unread_count}</p>
              </div>
            </div>

            {conversation.created_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Iniciada em:</span>
                <span>{format(new Date(conversation.created_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            )}

            {conversation.first_response_at && (
              <div className="text-sm">
                <span className="text-muted-foreground">Primeira resposta: </span>
                <span>{format(new Date(conversation.first_response_at), "HH:mm", { locale: ptBR })}</span>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
