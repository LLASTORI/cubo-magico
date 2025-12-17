import { memo } from 'react';
import { BaseNode } from './BaseNode';
import { GitBranch } from 'lucide-react';

interface ConditionNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    field?: string;
    operator?: string;
    value?: string;
    isConfigured?: boolean;
  };
  selected: boolean;
}

const operatorLabels: Record<string, string> = {
  equals: '=',
  not_equals: '≠',
  contains: 'contém',
  not_contains: 'não contém',
  greater_than: '>',
  less_than: '<',
  is_empty: 'é vazio',
  is_not_empty: 'não é vazio',
};

export const ConditionNode = memo(({ data, selected }: ConditionNodeProps) => {
  const getSubtitle = () => {
    if (!data.field) return 'Clique para configurar';
    const op = operatorLabels[data.operator || 'equals'] || data.operator;
    return `${data.field} ${op} ${data.value || ''}`.trim();
  };

  return (
    <BaseNode
      data={{ 
        ...data, 
        label: data.label || 'Condição', 
        subtitle: getSubtitle(),
        isConfigured: !!data.field 
      }}
      selected={selected}
      icon={<GitBranch className="h-4 w-4" />}
      color="bg-gradient-to-br from-purple-500 to-violet-600"
      handles={{ top: true, conditionalOutputs: true }}
    />
  );
});

ConditionNode.displayName = 'ConditionNode';
