import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, MousePointer, ShoppingCart, Eye, Link2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContactInteraction } from '@/hooks/useCRMContactJourney';

interface ContactJourneyTabProps {
  interactions: ContactInteraction[];
  isLoading: boolean;
}

const getInteractionIcon = (type: string) => {
  switch (type) {
    case 'page_view':
      return <Eye className="h-4 w-4" />;
    case 'checkout_view':
      return <ShoppingCart className="h-4 w-4" />;
    case 'click':
      return <MousePointer className="h-4 w-4" />;
    case 'lead':
      return <MapPin className="h-4 w-4" />;
    default:
      return <Link2 className="h-4 w-4" />;
  }
};

const getInteractionLabel = (type: string) => {
  switch (type) {
    case 'page_view':
      return 'Visualização';
    case 'checkout_view':
      return 'Checkout';
    case 'click':
      return 'Clique';
    case 'lead':
      return 'Lead Capturado';
    default:
      return type;
  }
};

const getInteractionColor = (type: string) => {
  switch (type) {
    case 'page_view':
      return 'bg-blue-500';
    case 'checkout_view':
      return 'bg-green-500';
    case 'click':
      return 'bg-orange-500';
    case 'lead':
      return 'bg-purple-500';
    default:
      return 'bg-muted-foreground';
  }
};

export function ContactJourneyTab({ interactions, isLoading }: ContactJourneyTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jornada do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (interactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jornada do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma interação registrada ainda.</p>
            <p className="text-xs mt-1">
              As interações aparecerão aqui quando o tracking for implementado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Jornada do Cliente</span>
          <Badge variant="secondary">{interactions.length} interações</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {interactions.map((interaction, index) => (
                <div key={interaction.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white ${getInteractionColor(interaction.interaction_type)}`}>
                    {getInteractionIcon(interaction.interaction_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {getInteractionLabel(interaction.interaction_type)}
                      </span>
                      {interaction.page_name && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          - {interaction.page_name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {format(new Date(interaction.interacted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    
                    {/* UTM tags */}
                    <div className="flex flex-wrap gap-1">
                      {interaction.utm_source && (
                        <Badge variant="outline" className="text-xs">
                          source: {interaction.utm_source}
                        </Badge>
                      )}
                      {interaction.utm_campaign && (
                        <Badge variant="outline" className="text-xs">
                          campaign: {interaction.utm_campaign}
                        </Badge>
                      )}
                      {interaction.utm_medium && (
                        <Badge variant="outline" className="text-xs">
                          medium: {interaction.utm_medium}
                        </Badge>
                      )}
                      {interaction.launch_tag && (
                        <Badge variant="secondary" className="text-xs">
                          🚀 {interaction.launch_tag}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Page URL */}
                    {interaction.page_url && (
                      <div className="mt-1">
                        <a 
                          href={interaction.page_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block max-w-full"
                        >
                          {interaction.page_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
