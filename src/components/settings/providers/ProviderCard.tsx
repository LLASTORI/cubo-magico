import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProviderStatus = 'operational' | 'warning' | 'critical' | 'disconnected';
export type ProviderCategory = 'financial' | 'acquisition' | 'communication' | 'ingestion';

interface ProviderCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  category: ProviderCategory;
  status: ProviderStatus;
  statusText?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const categoryConfig: Record<ProviderCategory, { label: string; emoji: string }> = {
  financial: { label: 'Financeiro', emoji: '💰' },
  acquisition: { label: 'Aquisição', emoji: '📊' },
  communication: { label: 'Comunicação', emoji: '💬' },
  ingestion: { label: 'Ingestão', emoji: '📥' },
};

const statusConfig: Record<ProviderStatus, { 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: ReactNode;
  className: string;
}> = {
  operational: {
    variant: 'outline',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'bg-green-500/10 text-green-600 border-green-500/30',
  },
  warning: {
    variant: 'outline',
    icon: <AlertTriangle className="h-3 w-3" />,
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  },
  critical: {
    variant: 'outline',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-500/10 text-red-600 border-red-500/30',
  },
  disconnected: {
    variant: 'outline',
    icon: null,
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
};

export function ProviderCard({
  name,
  description,
  icon,
  category,
  status,
  statusText,
  onClick,
  isSelected,
}: ProviderCardProps) {
  const categoryInfo = categoryConfig[category];
  const statusInfo = statusConfig[status];

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isSelected && 'border-primary ring-1 ring-primary'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {name}
              </CardTitle>
              <CardDescription className="text-xs">
                {categoryInfo.emoji} {categoryInfo.label}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={statusInfo.variant} 
            className={cn('flex items-center gap-1', statusInfo.className)}
          >
            {statusInfo.icon}
            {statusText || (status === 'operational' ? 'Operacional' : status === 'disconnected' ? 'Não configurado' : status === 'warning' ? 'Atenção' : 'Crítico')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
