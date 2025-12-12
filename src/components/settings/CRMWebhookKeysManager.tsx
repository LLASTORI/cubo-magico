import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCRMWebhookKeys, type CRMWebhookKey } from '@/hooks/useCRMWebhookKeys';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CRMWebhookKeysManager() {
  const { webhookKeys, isLoading, createKey, updateKey, deleteKey, isCreating } = useCRMWebhookKeys();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-webhook`;

  const handleCopyKey = async (apiKey: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({
        title: 'Copiado!',
        description: 'API Key copiada para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a chave.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast({
        title: 'Copiado!',
        description: 'URL do webhook copiada.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para a API Key.',
        variant: 'destructive',
      });
      return;
    }

    createKey({ name: newKeyName.trim() });
    setNewKeyName('');
    setDialogOpen(false);
  };

  const toggleShowKey = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}${'•'.repeat(40)}${key.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys do Webhook CRM
            </CardTitle>
            <CardDescription>
              Gerencie as chaves de API para receber leads de ferramentas externas.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar nova API Key</DialogTitle>
                <DialogDescription>
                  Crie uma nova chave de API para integrar ferramentas externas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Nome da chave</Label>
                  <Input
                    id="keyName"
                    placeholder="Ex: ActiveCampaign, Typeform, etc"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKey} disabled={isCreating}>
                  {isCreating ? 'Criando...' : 'Criar API Key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="p-4 rounded-lg bg-muted space-y-2">
          <Label className="text-sm font-medium">URL do Webhook</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-background text-sm font-mono break-all">
              {webhookUrl}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Envie requisições POST para esta URL com a API Key no header <code className="bg-background px-1 rounded">x-api-key</code>
          </p>
        </div>

        {/* API Keys list */}
        {webhookKeys && webhookKeys.length > 0 ? (
          <div className="space-y-3">
            {webhookKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{key.name}</h4>
                    <Badge variant={key.is_active ? 'default' : 'secondary'}>
                      {key.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={(checked) => updateKey({ id: key.id, is_active: checked })}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todas as integrações que usam esta chave deixarão de funcionar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteKey(key.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded bg-muted text-xs font-mono break-all">
                    {showKey[key.id] ? key.api_key : maskApiKey(key.api_key)}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => toggleShowKey(key.id)}>
                    {showKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleCopyKey(key.api_key, key.id)}
                  >
                    {copiedKey === key.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Usos: {key.usage_count}</span>
                  {key.last_used_at && (
                    <span>
                      Último uso: {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                  <span>
                    Criada: {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma API Key criada</p>
            <p className="text-sm">Crie uma chave para começar a receber leads.</p>
          </div>
        )}

        {/* Documentation link */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <h5 className="font-medium mb-2">Como usar o Webhook</h5>
          <p className="text-sm text-muted-foreground mb-2">
            Envie um POST com os dados do lead no body:
          </p>
          <pre className="p-3 rounded bg-background text-xs overflow-x-auto">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_API_KEY" \\
  -d '{
    "email": "lead@exemplo.com",
    "name": "Nome do Lead",
    "phone": "11999999999",
    "tags": ["campanha-x"],
    "utm_source": "facebook",
    "utm_campaign": "lancamento"
  }'`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
