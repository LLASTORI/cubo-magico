import { memo } from 'react';
import { BaseNode } from './BaseNode';
import { Zap, MessageCircle, UserPlus, Calendar, Tag } from 'lucide-react';

const triggerIcons: Record<string, React.ReactNode> = {
  keyword: <MessageCircle className="h-4 w-4" />,
  new_contact: <UserPlus className="h-4 w-4" />,
  tag_added: <Tag className="h-4 w-4" />,
  schedule: <Calendar className="h-4 w-4" />,
  default: <Zap className="h-4 w-4" />,
};

interface StartNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    trigger_type?: string;
    keywords?: string[];
    isConfigured?: boolean;
  };
  selected: boolean;
}

export const StartNode = memo(({ data, selected }: StartNodeProps) => {
  const icon = triggerIcons[data.trigger_type || 'default'] || triggerIcons.default;
  
  const getSubtitle = () => {
    switch (data.trigger_type) {
      case 'keyword':
        return data.keywords?.length ? `Palavras: ${data.keywords.join(', ')}` : 'Configurar palavras-chave';
      case 'new_contact':
        return 'Novo contato adicionado';
      case 'tag_added':
        return 'Tag adicionada ao contato';
      case 'schedule':
        return 'Agendamento programado';
      default:
        return 'Gatilho do fluxo';
    }
  };

  return (
    <BaseNode
      data={{ ...data, label: data.label || 'Início', subtitle: getSubtitle(), isConfigured: true }}
      selected={selected}
      icon={icon}
      color="bg-gradient-to-br from-green-500 to-emerald-600"
      handles={{ top: false, bottom: true }}
    />
  );
});

StartNode.displayName = 'StartNode';
