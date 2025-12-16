import { useState } from 'react';
import { useWhatsAppAgents, AgentStatus } from '@/hooks/useWhatsAppAgents';
import { useWhatsAppDepartments } from '@/hooks/useWhatsAppDepartments';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, User, Shield, MessageSquare, Loader2 } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string }> = {
  online: { label: 'Online', color: 'bg-green-500' },
  away: { label: 'Ausente', color: 'bg-yellow-500' },
  busy: { label: 'Ocupado', color: 'bg-orange-500' },
  offline: { label: 'Offline', color: 'bg-gray-400' },
};

export function WhatsAppAgentsManager() {
  const { currentProject } = useProject();
  const { agents, isLoading, createAgent, updateAgent, deleteAgent, isCreating, isUpdating } = useWhatsAppAgents();
  const { departments } = useWhatsAppDepartments();
  const { members } = useProjectMembers(currentProject?.id || null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [maxChats, setMaxChats] = useState('5');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  const resetForm = () => {
    setSelectedUserId('');
    setDisplayName('');
    setMaxChats('5');
    setIsSupervisor(false);
    setSelectedDepartments([]);
    setEditingAgent(null);
  };

  const handleOpenDialog = (agentId?: string) => {
    if (agentId) {
      const agent = agents?.find(a => a.id === agentId);
      if (agent) {
        setEditingAgent(agentId);
        setSelectedUserId(agent.user_id);
        setDisplayName(agent.display_name || '');
        setMaxChats(agent.max_concurrent_chats.toString());
        setIsSupervisor(agent.is_supervisor);
        setSelectedDepartments(agent.departments?.map(d => d.id) || []);
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingAgent) {
      updateAgent({
        id: editingAgent,
        display_name: displayName || undefined,
        max_concurrent_chats: parseInt(maxChats),
        is_supervisor: isSupervisor,
        department_ids: selectedDepartments,
      });
    } else {
      if (!selectedUserId) return;
      createAgent({
        user_id: selectedUserId,
        display_name: displayName || undefined,
        max_concurrent_chats: parseInt(maxChats),
        is_supervisor: isSupervisor,
        department_ids: selectedDepartments,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  // Filter out users that are already agents
  const availableUsers = members?.filter(
    m => !agents?.some(a => a.user_id === m.user_id)
  ) || [];

  const departmentOptions = departments?.map(d => ({
    value: d.id,
    label: d.name,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Atendentes
            </CardTitle>
            <CardDescription>
              Gerencie os atendentes do WhatsApp
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Atendente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAgent ? 'Editar Atendente' : 'Adicionar Atendente'}
                </DialogTitle>
                <DialogDescription>
                  Configure as informações do atendente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {!editingAgent && (
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um membro" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profile?.full_name || member.profile?.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Todos os membros já são atendentes ou não há membros no projeto.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Nome de Exibição (opcional)</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nome para exibir no chat"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Máximo de Chats Simultâneos</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={maxChats}
                    onChange={(e) => setMaxChats(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Departamentos</Label>
                  <MultiSelect
                    options={departmentOptions}
                    selected={selectedDepartments}
                    onChange={setSelectedDepartments}
                    placeholder="Selecione os departamentos"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Supervisor</Label>
                    <p className="text-sm text-muted-foreground">
                      Pode ver todos os chats do departamento
                    </p>
                  </div>
                  <Switch
                    checked={isSupervisor}
                    onCheckedChange={setIsSupervisor}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!editingAgent && !selectedUserId}
                >
                  {isCreating || isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingAgent ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {agents && agents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atendente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Departamentos</TableHead>
                <TableHead>Chats</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {agent.is_supervisor && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                      <div>
                        <p className="font-medium">
                          {agent.display_name || agent.user_name || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {agent.user_email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[agent.status].color}`} />
                      <span className="text-sm">{STATUS_CONFIG[agent.status].label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.departments?.map(dept => (
                        <Badge 
                          key={dept.id} 
                          variant="outline"
                          style={{ borderColor: dept.color, color: dept.color }}
                        >
                          {dept.name}
                        </Badge>
                      ))}
                      {(!agent.departments || agent.departments.length === 0) && (
                        <span className="text-sm text-muted-foreground">Nenhum</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {agent.active_chats_count} / {agent.max_concurrent_chats}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(agent.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAgent(agent.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum atendente cadastrado</p>
            <p className="text-sm">Adicione membros do projeto como atendentes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
