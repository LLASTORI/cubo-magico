import { memo } from 'react';
import { BaseNode } from './BaseNode';
import { Clock } from 'lucide-react';

interface DelayNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    delay_minutes?: number;
    delay_type?: 'minutes' | 'hours' | 'days';
    isConfigured?: boolean;
  };
  selected: boolean;
}

export const DelayNode = memo(({ data, selected }: DelayNodeProps) => {
  const mins = data.delay_minutes || 0;
  
  const getSubtitle = () => {
    if (!mins) return 'Clique para configurar';
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      return `Aguardar ${days} dia${days > 1 ? 's' : ''}`;
    }
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `Aguardar ${hours}h${remainingMins > 0 ? ` ${remainingMins}m` : ''}`;
    }
    return `Aguardar ${mins} minuto${mins > 1 ? 's' : ''}`;
  };

  return (
    <BaseNode
      data={{ 
        ...data, 
        label: data.label || 'Espera', 
        subtitle: getSubtitle(),
        isConfigured: mins > 0 
      }}
      selected={selected}
      icon={<Clock className="h-4 w-4" />}
      color="bg-gradient-to-br from-amber-500 to-orange-500"
    />
  );
});

DelayNode.displayName = 'DelayNode';
