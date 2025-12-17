import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useAutomationFlows } from '@/hooks/useAutomationFlows';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  ArrowLeft, 
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  RefreshCw,
  StopCircle,
  Eye,
  Search,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  running: { label: 'Executando', color: 'bg-blue-500', icon: Play },
  paused: { label: 'Pausado', color: 'bg-yellow-500', icon: Pause },
  completed: { label: 'Concluído', color: 'bg-green-500', icon: CheckCircle2 },
  failed: { label: 'Falhou', color: 'bg-red-500', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-500', icon: StopCircle },
};

export default function AutomationExecutions() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { flows } = useAutomationFlows();
  const [selectedFlow, setSelectedFlow] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<any>(null);

  const automationEnabled = isModuleEnabled('automation');

  const { executions, stats, isLoading: executionsLoading, cancelExecution, retryExecution } = 
    useAutomationExecutions(selectedFlow !== 'all' ? selectedFlow : undefined);

  const isLoading = modulesLoading || executionsLoading;

  const filteredExecutions = executions.filter(exec => {
    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;
    const matchesSearch = !searchQuery || 
      exec.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exec.contact?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exec.flow?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Execuções de Automação" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!automationEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Execuções de Automação" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-muted">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Módulo de Automações</CardTitle>
                <CardDescription>Este módulo não está habilitado para o projeto atual.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Execuções de Automação" />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Execuções</h1>
            <p className="text-muted-foreground">
              Monitore as execuções dos seus fluxos de automação
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.running || 0}</p>
                  <p className="text-xs text-muted-foreground">Executando</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Pause className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.paused || 0}</p>
                  <p className="text-xs text-muted-foreground">Pausados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por contato ou fluxo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedFlow} onValueChange={setSelectedFlow}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os fluxos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fluxos</SelectItem>
              {flows.map((flow) => (
                <SelectItem key={flow.id} value={flow.id}>{flow.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="running">Executando</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Executions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Fluxo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Próxima Ação</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="h-8 w-8" />
                        <p>Nenhuma execução encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExecutions.map((execution) => {
                    const status = statusConfig[execution.status as keyof typeof statusConfig];
                    const StatusIcon = status?.icon || Clock;
                    
                    return (
                      <TableRow key={execution.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{execution.contact?.name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground">{execution.contact?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Zap className="h-3 w-3 mr-1" />
                            {execution.flow?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(execution.started_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {execution.next_execution_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(execution.next_execution_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedExecution(execution)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              {execution.status === 'failed' && (
                                <DropdownMenuItem onClick={() => retryExecution.mutate(execution.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Tentar Novamente
                                </DropdownMenuItem>
                              )}
                              {(execution.status === 'running' || execution.status === 'paused') && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => cancelExecution.mutate(execution.id)}
                                >
                                  <StopCircle className="h-4 w-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Execution Details Dialog */}
      <Dialog open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Execução</DialogTitle>
          </DialogHeader>
          
          {selectedExecution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{selectedExecution.contact?.name || selectedExecution.contact?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fluxo</p>
                  <p className="font-medium">{selectedExecution.flow?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary">
                    {statusConfig[selectedExecution.status as keyof typeof statusConfig]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-medium">
                    {new Date(selectedExecution.started_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {selectedExecution.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Erro</span>
                  </div>
                  <p className="text-sm">{selectedExecution.error_message}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Log de Execução</p>
                <ScrollArea className="h-[300px] border rounded-lg p-3 bg-muted/30">
                  <div className="space-y-2">
                    {(selectedExecution.execution_log || []).map((log: any, index: number) => (
                      <div key={index} className="text-sm">
                        <span className="text-muted-foreground">
                          [{new Date(log.timestamp).toLocaleTimeString('pt-BR')}]
                        </span>{' '}
                        <span className={log.type === 'error' ? 'text-destructive' : ''}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {(!selectedExecution.execution_log || selectedExecution.execution_log.length === 0) && (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum log disponível
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
