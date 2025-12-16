import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useWhatsAppNumbers, WhatsAppNumber } from '@/hooks/useWhatsAppNumbers';
import { useProjectModules } from '@/hooks/useProjectModules';
import { MessageCircle, Plus, Trash2, QrCode, Wifi, WifiOff, AlertTriangle, Phone, Settings } from 'lucide-react';

const statusConfig: Record<WhatsAppNumber['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Settings className="h-3 w-3" /> },
  active: { label: 'Conectado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Wifi className="h-3 w-3" /> },
  offline: { label: 'Offline', color: 'bg-muted text-muted-foreground border-border', icon: <WifiOff className="h-3 w-3" /> },
  banned: { label: 'Banido', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <AlertTriangle className="h-3 w-3" /> },
};

export function WhatsAppSettings() {
  const { isModuleEnabled } = useProjectModules();
  const { numbers, isLoading, createNumber, deleteNumber, isCreating, isDeleting } = useWhatsAppNumbers();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newNumber, setNewNumber] = useState({ phone_number: '', label: '' });

  const isCRMEnabled = isModuleEnabled('crm');
  const isWhatsAppEnabled = isModuleEnabled('whatsapp');

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
                    
                    {num.status === 'pending' && (
                      <Button variant="outline" size="sm" disabled>
                        <QrCode className="h-4 w-4 mr-2" />
                        Conectar
                      </Button>
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
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed">
          <h4 className="font-medium text-sm mb-2">Próximos passos</h4>
          <p className="text-sm text-muted-foreground">
            Para conectar um número, você precisará configurar a Evolution API. 
            O botão "Conectar" ficará disponível após a configuração.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
