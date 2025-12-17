import { memo } from 'react';
import { BaseNode } from './BaseNode';
import { Tag, UserCog, ArrowRightLeft, Bell, Users } from 'lucide-react';

interface ActionNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    action_type?: string;
    action_value?: string;
    notify_members?: string[];
    isConfigured?: boolean;
  };
  selected: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <Tag className="h-4 w-4" />,
  change_stage: <ArrowRightLeft className="h-4 w-4" />,
  change_recovery_stage: <ArrowRightLeft className="h-4 w-4" />,
  notify_team: <Users className="h-4 w-4" />,
  update_contact: <UserCog className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  add_tag: 'Adicionar tag',
  remove_tag: 'Remover tag',
  change_stage: 'Mudar etapa',
  change_recovery_stage: 'Etapa recuperação',
  notify_team: 'Notificar membro(s)',
  update_contact: 'Atualizar contato',
};

export const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  const icon = actionIcons[data.action_type || 'add_tag'] || <Tag className="h-4 w-4" />;
  
  const getSubtitle = () => {
    if (!data.action_type) return 'Clique para configurar';
    const action = actionLabels[data.action_type] || data.action_type;
    
    if (data.action_type === 'notify_team') {
      const memberCount = data.notify_members?.length || 0;
      if (memberCount === 0) return 'Selecione os membros';
      const preview = data.action_value ? `: ${data.action_value.substring(0, 30)}${data.action_value.length > 30 ? '...' : ''}` : '';
      return `${memberCount} membro(s)${preview}`;
    }
    
    return data.action_value ? `${action}: ${data.action_value}` : action;
  };

  const isConfigured = data.action_type === 'notify_team' 
    ? !!(data.action_type && (data.notify_members?.length || 0) > 0)
    : !!data.action_type;

  return (
    <BaseNode
      data={{ 
        ...data, 
        label: data.label || 'Ação CRM', 
        subtitle: getSubtitle(),
        isConfigured
      }}
      selected={selected}
      icon={icon}
      color="bg-gradient-to-br from-orange-500 to-red-500"
    />
  );
});

ActionNode.displayName = 'ActionNode';
