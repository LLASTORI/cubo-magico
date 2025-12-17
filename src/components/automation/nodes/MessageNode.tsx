import { memo } from 'react';
import { BaseNode } from './BaseNode';
import { MessageSquare } from 'lucide-react';

interface MessageNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    content?: string;
    isConfigured?: boolean;
  };
  selected: boolean;
}

export const MessageNode = memo(({ data, selected }: MessageNodeProps) => {
  const subtitle = data.content 
    ? data.content.substring(0, 40) + (data.content.length > 40 ? '...' : '')
    : 'Clique para configurar';

  return (
    <BaseNode
      data={{ 
        ...data, 
        label: data.label || 'Mensagem', 
        subtitle,
        isConfigured: !!data.content 
      }}
      selected={selected}
      icon={<MessageSquare className="h-4 w-4" />}
      color="bg-gradient-to-br from-blue-500 to-blue-600"
    />
  );
});

MessageNode.displayName = 'MessageNode';
