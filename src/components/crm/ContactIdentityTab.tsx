import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, Calendar, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useContactIdentityEvents, 
  SOURCE_TYPE_LABELS, 
  FIELD_LABELS,
  ContactIdentityEvent 
} from '@/hooks/useContactIdentity';
import { CubeLoader } from '@/components/CubeLoader';

interface ContactIdentityTabProps {
  contactId: string;
}

export function ContactIdentityTab({ contactId }: ContactIdentityTabProps) {
  const { events, latestByField, isLoading } = useContactIdentityEvents(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <CubeLoader size="sm" />
      </div>
    );
  }

  if (!events?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum dado de identidade declarado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Os dados coletados via Pesquisa Inteligente aparecerão aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by field
  const fieldGroups = Object.entries(latestByField || {});

  return (
    <div className="space-y-6">
      {/* Identity Fields Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dados de Identidade Declarados
          </CardTitle>
          <CardDescription>
            Dados coletados diretamente do contato via pesquisas, formulários ou integrações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {fieldGroups.map(([field, event]) => (
              <IdentityFieldCard key={field} event={event} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Atualizações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <IdentityEventItem key={event.id} event={event} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IdentityFieldCard({ event }: { event: ContactIdentityEvent }) {
  const confidencePercent = (event.confidence_score || 1) * 100;
  
  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {FIELD_LABELS[event.field_name] || event.field_name}
        </span>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={event.is_declared ? 'default' : 'secondary'}>
              {event.is_declared ? 'Declarado' : 'Inferido'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {event.is_declared 
              ? 'Dado fornecido diretamente pelo contato'
              : 'Dado inferido ou importado de outra fonte'
            }
          </TooltipContent>
        </Tooltip>
      </div>
      
      <p className="font-medium truncate">{event.field_value}</p>
      
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Confiança:</span>
        <Progress value={confidencePercent} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground">{confidencePercent.toFixed(0)}%</span>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span>{SOURCE_TYPE_LABELS[event.source_type] || event.source_type}</span>
        {event.source_name && <span>• {event.source_name}</span>}
      </div>
    </div>
  );
}

function IdentityEventItem({ event }: { event: ContactIdentityEvent }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {FIELD_LABELS[event.field_name] || event.field_name}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-sm">{event.field_value}</span>
        </div>
        
        {event.previous_value && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Valor anterior: {event.previous_value}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{SOURCE_TYPE_LABELS[event.source_type] || event.source_type}</span>
          {event.source_name && <span>• {event.source_name}</span>}
          <span>
            {format(new Date(event.recorded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}
