import { useCRMActivities, CRMActivity } from '@/hooks/useCRMActivities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Calendar, 
  Bell, 
  CheckSquare,
  Check,
  Trash2,
  Clock,
  Loader2
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactActivitiesListProps {
  contactId: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  task: <CheckSquare className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
};

const activityLabels: Record<string, string> = {
  task: 'Tarefa',
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  reminder: 'Lembrete',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export function ContactActivitiesList({ contactId }: ContactActivitiesListProps) {
  const { activities, isLoading, completeActivity, deleteActivity } = useCRMActivities(contactId);

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDueDateColor = (dueDate: string | null, status: string) => {
    if (status !== 'pending' || !dueDate) return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-600';
    if (isToday(date)) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma atividade registrada
      </p>
    );
  }

  const pendingActivities = activities.filter(a => a.status === 'pending');
  const completedActivities = activities.filter(a => a.status === 'completed');

  return (
    <div className="space-y-4">
      {pendingActivities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">Pendentes</h4>
          <div className="space-y-2">
            {pendingActivities.map((activity) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                formatDueDate={formatDueDate}
                getDueDateColor={getDueDateColor}
                onComplete={() => completeActivity.mutate(activity.id)}
                onDelete={() => deleteActivity.mutate(activity.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completedActivities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">Concluídas</h4>
          <div className="space-y-2">
            {completedActivities.slice(0, 5).map((activity) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                formatDueDate={formatDueDate}
                getDueDateColor={getDueDateColor}
                onComplete={() => {}}
                onDelete={() => deleteActivity.mutate(activity.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  activity: CRMActivity;
  formatDueDate: (date: string | null) => string | null;
  getDueDateColor: (date: string | null, status: string) => string;
  onComplete: () => void;
  onDelete: () => void;
}

function ActivityItem({ activity, formatDueDate, getDueDateColor, onComplete, onDelete }: ActivityItemProps) {
  const isCompleted = activity.status === 'completed';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-muted/30 opacity-70' : 'bg-card'}`}>
      <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
        {activityIcons[activity.activity_type] || <CheckSquare className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-medium text-sm ${isCompleted ? 'line-through' : ''}`}>
            {activity.title}
          </p>
          <Badge variant="outline" className="text-xs">
            {activityLabels[activity.activity_type] || activity.activity_type}
          </Badge>
          {!isCompleted && (
            <Badge className={`text-xs ${priorityColors[activity.priority]}`}>
              {priorityLabels[activity.priority]}
            </Badge>
          )}
        </div>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
        )}
        {activity.due_date && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${getDueDateColor(activity.due_date, activity.status)}`}>
            <Clock className="h-3 w-3" />
            {formatDueDate(activity.due_date)}
          </p>
        )}
        {activity.completed_at && (
          <p className="text-xs text-green-600 mt-1">
            Concluído em {format(new Date(activity.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        {!isCompleted && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onComplete}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}
