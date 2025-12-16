import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useWhatsAppNumbers, WhatsAppNumber } from '@/hooks/useWhatsAppNumbers';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Trash2, QrCode, Wifi, WifiOff, AlertTriangle, Phone, Settings, Loader2, RefreshCw, CheckCircle2, Send } from 'lucide-react';

const statusConfig: Record<WhatsAppNumber['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Settings className="h-3 w-3" /> },
  active: { label: 'Conectado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Wifi className="h-3 w-3" /> },
  offline: { label: 'Offline', color: 'bg-muted text-muted-foreground border-border', icon: <WifiOff className="h-3 w-3" /> },
  banned: { label: 'Banido', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <AlertTriangle className="h-3 w-3" /> },
};

export function WhatsAppSettings() {
  const { currentProject } = useProject();
  const { isModuleEnabled } = useProjectModules();
  const { numbers, isLoading, createNumber, deleteNumber, updateNumber, isCreating, isDeleting } = useWhatsAppNumbers();
  const { createInstance, getQRCode, getStatus, disconnect, sendMessage, isLoading: isEvolutionLoading } = useEvolutionAPI();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [newNumber, setNewNumber] = useState({ phone_number: '', label: '' });
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null);
  const [qrCodeData, setQRCodeData] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [testMessage, setTestMessage] = useState({ phone: '', text: 'Olá! Esta é uma mensagem de teste do CRM.' });
  const [isSendingTest, setIsSendingTest] = useState(false);

  const isCRMEnabled = isModuleEnabled('crm');
  const isWhatsAppEnabled = isModuleEnabled('whatsapp');

  // Check connection status periodically when QR dialog is open
  useEffect(() => {
    if (!isQRDialogOpen || !selectedNumber) return;

    const checkStatus = async () => {
      const instanceName = `cubo_${selectedNumber.id.slice(0, 8)}`;
      const result = await getStatus(instanceName);
      
      if (result.success && result.data) {
        const state = result.data.instance?.state || result.data.state;
        setConnectionStatus(state);
        
        if (state === 'open' || state === 'connected') {
          // Update the number status to active
          updateNumber({ id: selectedNumber.id, status: 'active' });
          setIsQRDialogOpen(false);
          setQRCodeData(null);
        }
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [isQRDialogOpen, selectedNumber, getStatus, updateNumber]);

  if (!isCRMEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </CardTitle>
          <CardDescription>
            Ative o módulo CRM primeiro para usar o WhatsApp
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isWhatsAppEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </CardTitle>
          <CardDescription>
            Ative o módulo WhatsApp nas configurações de módulos para começar
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleAddNumber = () => {
    if (!newNumber.phone_number.trim()) return;
    
    createNumber({
      phone_number: newNumber.phone_number.trim(),
      label: newNumber.label.trim() || 'Principal',
    });
    
    setNewNumber({ phone_number: '', label: '' });
    setIsAddDialogOpen(false);
  };

  const handleConnect = async (num: WhatsAppNumber) => {
    if (!currentProject) return;
    
    setSelectedNumber(num);
    setIsConnecting(true);
    setIsQRDialogOpen(true);
    setQRCodeData(null);
    setConnectionStatus('');

    try {
      const instanceName = `cubo_${num.id.slice(0, 8)}`;
      
      // Create instance and get QR code
      const result = await createInstance(instanceName, num.id, currentProject.id);
      
      if (result.success && result.data) {
        // Try to get QR code from the response
        const qr = result.data.qrcode?.base64 || result.data.base64;
        if (qr) {
          setQRCodeData(qr);
        } else {
          // If no QR in create response, fetch it
          const qrResult = await getQRCode(instanceName);
          if (qrResult.success && qrResult.data) {
            setQRCodeData(qrResult.data.base64 || qrResult.data.qrcode?.base64);
          }
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!selectedNumber) return;
    
    setIsConnecting(true);
    const instanceName = `cubo_${selectedNumber.id.slice(0, 8)}`;
    
    try {
      const result = await getQRCode(instanceName);
      if (result.success && result.data) {
        setQRCodeData(result.data.base64 || result.data.qrcode?.base64);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (num: WhatsAppNumber) => {
    const instanceName = `cubo_${num.id.slice(0, 8)}`;
    const result = await disconnect(instanceName);
    
    if (result.success) {
      updateNumber({ id: num.id, status: 'offline' });
    }
  };

  const handleOpenTestDialog = (num: WhatsAppNumber) => {
    setSelectedNumber(num);
    setTestMessage({ phone: '', text: 'Olá! Esta é uma mensagem de teste do CRM.' });
    setIsTestDialogOpen(true);
  };

  const handleSendTestMessage = async () => {
    if (!selectedNumber || !testMessage.phone.trim() || !testMessage.text.trim()) return;
    
    setIsSendingTest(true);
    const instanceName = `cubo_${selectedNumber.id.slice(0, 8)}`;
    
    // Format phone number - remove non-digits and ensure country code
    let formattedPhone = testMessage.phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }
    
    const result = await sendMessage(instanceName, formattedPhone, testMessage.text);
    
    if (result.success) {
      toast({
        title: 'Mensagem enviada!',
        description: `Mensagem de teste enviada para +${formattedPhone}`,
      });
      setIsTestDialogOpen(false);
    } else {
      toast({
        title: 'Erro ao enviar',
        description: result.error || 'Não foi possível enviar a mensagem de teste',
        variant: 'destructive',
      });
    }
    
    setIsSendingTest(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Números WhatsApp
            </CardTitle>
            <CardDescription>
              Gerencie os números conectados ao seu CRM
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Número
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Número WhatsApp</DialogTitle>
                <DialogDescription>
                  Cadastre um novo número para conectar via QR Code
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Número com DDD</Label>
                  <Input
                    id="phone"
                    placeholder="5511999999999"
                    value={newNumber.phone_number}
                    onChange={(e) => setNewNumber(prev => ({ ...prev, phone_number: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: código do país + DDD + número (sem espaços ou símbolos)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Identificação (opcional)</Label>
                  <Input
                    id="label"
                    placeholder="Ex: Atendimento, Vendas, Suporte"
                    value={newNumber.label}
                    onChange={(e) => setNewNumber(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddNumber} disabled={isCreating || !newNumber.phone_number.trim()}>
                  {isCreating ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando números...
          </div>
        ) : numbers?.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum número cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione um número para começar a atender via WhatsApp
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {numbers?.map((num, index) => {
              const status = statusConfig[num.status];
              return (
                <div
                  key={num.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{num.label}</span>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        +{num.phone_number}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={status.color}>
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
                    </Badge>
                    
                    {num.status === 'pending' || num.status === 'offline' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleConnect(num)}
                        disabled={isEvolutionLoading}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Conectar
                      </Button>
                    ) : num.status === 'active' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenTestDialog(num)}
                          disabled={isEvolutionLoading}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Teste
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDisconnect(num)}
                          disabled={isEvolutionLoading}
                        >
                          <WifiOff className="h-4 w-4 mr-2" />
                          Desconectar
                        </Button>
                      </>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover número?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O número +{num.phone_number} será removido e todas as conversas associadas serão perdidas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteNumber(num.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? 'Removendo...' : 'Remover'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h4 className="font-medium text-sm text-green-500">Evolution API Conectada</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            A Evolution API está configurada. Adicione um número e clique em "Conectar" para escanear o QR Code.
          </p>
        </div>
      </CardContent>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCodeData ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {connectionStatus === 'open' || connectionStatus === 'connected' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Conectado!</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Aguardando conexão...</span>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleRefreshQR} disabled={isConnecting}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar QR Code
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Não foi possível gerar o QR Code</p>
                <Button variant="outline" size="sm" onClick={handleRefreshQR}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQRDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Message Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
            <DialogDescription>
              Envie uma mensagem de teste para verificar a conexão
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Número de destino</Label>
              <Input
                id="test-phone"
                placeholder="11999999999"
                value={testMessage.phone}
                onChange={(e) => setTestMessage(prev => ({ ...prev, phone: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                DDD + número (o código do país 55 será adicionado automaticamente)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-text">Mensagem</Label>
              <Textarea
                id="test-text"
                placeholder="Digite sua mensagem..."
                value={testMessage.text}
                onChange={(e) => setTestMessage(prev => ({ ...prev, text: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendTestMessage} 
              disabled={isSendingTest || !testMessage.phone.trim() || !testMessage.text.trim()}
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
