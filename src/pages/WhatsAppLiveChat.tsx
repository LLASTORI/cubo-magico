import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useWhatsAppConversations, WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatWindow } from '@/components/whatsapp/ChatWindow';
import { ContactPanel } from '@/components/whatsapp/ContactPanel';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageCircle, 
  Settings, 
  Users,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWhatsAppAgents } from '@/hooks/useWhatsAppAgents';
import { useWhatsAppDepartments } from '@/hooks/useWhatsAppDepartments';
import { useQueryClient } from '@tanstack/react-query';

export default function WhatsAppLiveChat() {
  const { currentProject } = useProject();
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferDepartment, setTransferDepartment] = useState<string>('');
  const [transferAgent, setTransferAgent] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { 
    conversations, 
    isLoading, 
    assignConversation,
    updateConversationStatus,
    transferConversation 
  } = useWhatsAppConversations();
  
  const { numbers } = useWhatsAppNumbers();
  const { agents } = useWhatsAppAgents();
  const { departments } = useWhatsAppDepartments();
  const { syncInstance, configureWebhook } = useEvolutionAPI();
  const queryClient = useQueryClient();
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);

  // Get the connected instance name - fallback to active number if no instance record
  const connectedNumber = numbers?.find(n => n.instance?.status === 'connected') 
    || numbers?.find(n => n.status === 'active');
  
  // Check if we need to sync (active number but no instance record)
  const needsSync = connectedNumber?.status === 'active' && !connectedNumber?.instance;
  
  // Generate instance name from number ID (same pattern used in WhatsAppSettings)
  const instanceName = connectedNumber?.instance?.instance_name 
    || (connectedNumber ? `cubo_${connectedNumber.id.slice(0, 8)}` : undefined);

  // Auto-sync instance when needed
  useEffect(() => {
    if (!needsSync || !connectedNumber || isSyncing) return;

    const doSync = async () => {
      setIsSyncing(true);
      const instanceNameToSync = `cubo_${connectedNumber.id.slice(0, 8)}`;
      console.log('Auto-syncing instance:', instanceNameToSync);

      const result = await syncInstance(instanceNameToSync, connectedNumber.id);

      if (result.success && result.data?.synced) {
        // Refresh the numbers list to get the updated instance
        queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers'] });
      }

      setIsSyncing(false);
    };

    doSync();
  }, [needsSync, connectedNumber, syncInstance, queryClient, isSyncing]);

  // Ensure webhook is configured (required for inbound messages to appear)
  useEffect(() => {
    if (!connectedNumber || !instanceName || isConfiguringWebhook) return;

    // Only attempt when we have a connected instance (or an active number)
    const canConfigure = connectedNumber.instance?.status === 'connected' || connectedNumber.status === 'active';
    if (!canConfigure) return;

    const run = async () => {
      setIsConfiguringWebhook(true);
      const res = await configureWebhook(instanceName);
      if (res.success) {
        // no-op; webhook is now set server-side
      }
      setIsConfiguringWebhook(false);
    };

    run();
  }, [connectedNumber?.id, connectedNumber?.status, connectedNumber?.instance?.status, instanceName, configureWebhook, isConfiguringWebhook]);

  // Keep selectedConversation in sync when conversations refetch (prevents stale phone/DDD display)
  useEffect(() => {
    if (!selectedConversation?.id || !conversations) return;
    const latest = conversations.find(c => c.id === selectedConversation.id);
    if (latest) setSelectedConversation(latest);
  }, [conversations, selectedConversation?.id]);

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
  };

  const handleAssign = (agentId: string | null) => {
    if (selectedConversation) {
      assignConversation({ 
        conversationId: selectedConversation.id, 
        agentId 
      });
    }
  };

  const handleTransferDepartment = (departmentId: string) => {
    if (selectedConversation) {
      transferConversation({
        conversationId: selectedConversation.id,
        departmentId: departmentId || undefined,
      });
    }
  };

  const handleCloseConversation = () => {
    if (selectedConversation) {
      updateConversationStatus({
        conversationId: selectedConversation.id,
        status: 'closed',
      });
      setSelectedConversation(null);
    }
  };

  const handleTransferConfirm = () => {
    if (selectedConversation) {
      transferConversation({
        conversationId: selectedConversation.id,
        departmentId: transferDepartment || undefined,
        agentId: transferAgent || undefined,
      });
      setShowTransferDialog(false);
      setTransferDepartment('');
      setTransferAgent('');
    }
  };

  const openConversations = conversations?.filter(c => c.status === 'open').length || 0;
  const pendingConversations = conversations?.filter(c => c.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      {/* Sub-header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Central de Atendimento</h1>
            </div>
            
            {/* Status badges */}
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {openConversations} abertas
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                {pendingConversations} aguardando
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status */}
            {isSyncing ? (
              <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizando...
              </Badge>
            ) : connectedNumber ? (
              <Badge 
                variant="outline" 
                className={connectedNumber.instance?.status === 'connected' 
                  ? "gap-1 text-green-600 border-green-600" 
                  : "gap-1 text-green-600 border-green-600"}
              >
                <Wifi className="h-3 w-3" />
                Conectado: {connectedNumber.label}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                Desconectado
              </Badge>
            )}

            <Link to="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <div className="w-96 border-r flex flex-col">
          <ConversationList
            conversations={conversations || []}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
          />
        </div>

        {/* Chat window */}
        <ChatWindow
          conversation={selectedConversation}
          instanceName={instanceName}
          onTransfer={() => setShowTransferDialog(true)}
          onClose={handleCloseConversation}
        />

        {/* Contact panel */}
        <ContactPanel
          conversation={selectedConversation}
          onAssign={handleAssign}
          onTransfer={handleTransferDepartment}
        />
      </div>

      {/* Transfer dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Conversa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento</label>
              <Select value={transferDepartment} onValueChange={setTransferDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: dept.color }}
                        />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Atendente (opcional)</label>
              <Select value={transferAgent} onValueChange={setTransferAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar atendente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Próximo disponível</SelectItem>
                  {agents?.filter(a => a.is_active && a.status === 'online').map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.display_name || 'Atendente'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleTransferConfirm}>
                Transferir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
