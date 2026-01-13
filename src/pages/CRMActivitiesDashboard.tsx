import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Lock, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Bell,
  CheckSquare,
  Check,
  Trash2,
  ExternalLink,
  ListTodo
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ActivityWithContact {
  id: string;
  contact_id: string;
  title: string;
  description: string | null;
  activity_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  contact_name: string | null;
  contact_email: string;
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

export default function CRMActivitiesDashboard() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { completeActivity, deleteActivity } = useCRMActivities();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const crmEnabled = isModuleEnabled('crm');

  // Fetch all activities with contact info
  const { data: activities = [], isLoading: activitiesLoading, refetch } = useQuery({
    queryKey: ['crm-all-activities', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('crm_activities_tasks')
        .select(`
          id, contact_id, title, description, activity_type, status, priority, 
          due_date, completed_at, created_at,
          crm_contacts!inner(name, email)
        `)
        .eq('project_id', currentProject.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      return data.map((a: any) => ({
        ...a,
        contact_name: a.crm_contacts?.name,
        contact_email: a.crm_contacts?.email,
      })) as ActivityWithContact[];
    },
    enabled: !!currentProject?.id && crmEnabled,
  });

  const isLoading = modulesLoading || activitiesLoading;

  // Filter activities
  const filteredActivities = activities.filter(a => {
    if (typeFilter !== 'all' && a.activity_type !== typeFilter) return false;
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    return true;
  });

  // Group activities
  const pendingActivities = filteredActivities.filter(a => a.status === 'pending');
  const completedActivities = filteredActivities.filter(a => a.status === 'completed');
  
  const overdueActivities = pendingActivities.filter(a => 
    a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
  );
  const todayActivities = pendingActivities.filter(a => 
    a.due_date && isToday(new Date(a.due_date))
  );
  const tomorrowActivities = pendingActivities.filter(a => 
    a.due_date && isTomorrow(new Date(a.due_date))
  );
  const thisWeekActivities = pendingActivities.filter(a => 
    a.due_date && isThisWeek(new Date(a.due_date)) && 
    !isToday(new Date(a.due_date)) && !isTomorrow(new Date(a.due_date)) &&
    !isPast(new Date(a.due_date))
  );
  const laterActivities = pendingActivities.filter(a => 
    !a.due_date || (!isPast(new Date(a.due_date)) && !isThisWeek(new Date(a.due_date)))
  );

  const handleComplete = async (activityId: string) => {
    await completeActivity.mutateAsync(activityId);
    refetch();
  };

  const handleDelete = async (activityId: string) => {
    await deleteActivity.mutateAsync(activityId);
    refetch();
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'Sem data';
    return format(new Date(dueDate), "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Dashboard de Atividades" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!crmEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Dashboard de Atividades" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-muted">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Módulo CRM</CardTitle>
                <CardDescription>Este módulo não está habilitado.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="CRM - Atividades" />
      
      <CRMSubNav 
        rightContent={
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateTo('crm/cadences')}
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Cadências
          </Button>
        }
      />
      
      <main className="container mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard de Atividades</h1>
          <p className="text-muted-foreground">
            Gerencie todas as atividades pendentes do CRM
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className={overdueActivities.length > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${overdueActivities.length > 0 ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueActivities.length}</p>
                  <p className="text-sm text-muted-foreground">Atrasadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={todayActivities.length > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${todayActivities.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayActivities.length}</p>
                  <p className="text-sm text-muted-foreground">Para Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingActivities.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedActivities.length}</p>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de atividade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="task">Tarefa</SelectItem>
              <SelectItem value="call">Ligação</SelectItem>
              <SelectItem value="meeting">Reunião</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="reminder">Lembrete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity Sections */}
        <div className="space-y-6">
          <ActivitySection 
            title="Atrasadas" 
            activities={overdueActivities}
            variant="danger"
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={(contactId) => navigateTo(`crm/contact/${contactId}`)}
            formatDueDate={formatDueDate}
          />

          <ActivitySection 
            title="Hoje" 
            activities={todayActivities}
            variant="warning"
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={(contactId) => navigateTo(`crm/contact/${contactId}`)}
            formatDueDate={formatDueDate}
          />

          <ActivitySection 
            title="Amanhã" 
            activities={tomorrowActivities}
            variant="default"
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={(contactId) => navigateTo(`crm/contact/${contactId}`)}
            formatDueDate={formatDueDate}
          />

          <ActivitySection 
            title="Esta Semana" 
            activities={thisWeekActivities}
            variant="default"
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={(contactId) => navigateTo(`crm/contact/${contactId}`)}
            formatDueDate={formatDueDate}
          />

          <ActivitySection 
            title="Próximas" 
            activities={laterActivities}
            variant="muted"
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={(contactId) => navigateTo(`crm/contact/${contactId}`)}
            formatDueDate={formatDueDate}
          />
        </div>
      </main>
    </div>
  );
}

interface ActivitySectionProps {
  title: string;
  activities: ActivityWithContact[];
  variant: 'danger' | 'warning' | 'default' | 'muted';
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (contactId: string) => void;
  formatDueDate: (date: string | null) => string;
}

function ActivitySection({ title, activities, variant, onComplete, onDelete, onNavigate, formatDueDate }: ActivitySectionProps) {
  if (activities.length === 0) return null;

  const headerColors = {
    danger: 'text-red-600',
    warning: 'text-orange-600',
    default: 'text-foreground',
    muted: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`text-base ${headerColors[variant]}`}>
          {title} ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((activity) => (
          <div 
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              {activityIcons[activity.activity_type] || <CheckSquare className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{activity.title}</p>
                <Badge variant="outline" className="text-xs">
                  {activityLabels[activity.activity_type]}
                </Badge>
                <Badge className={`text-xs ${priorityColors[activity.priority]}`}>
                  {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
              </div>
              <button 
                onClick={() => onNavigate(activity.contact_id)}
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
              >
                {activity.contact_name || activity.contact_email}
                <ExternalLink className="h-3 w-3" />
              </button>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDueDate(activity.due_date)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onComplete(activity.id)}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(activity.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
