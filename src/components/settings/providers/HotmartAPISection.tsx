import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  ChevronDown,
  AlertTriangle
} from 'lucide-react';

interface HotmartAPISectionProps {
  projectId: string;
}

export function HotmartAPISection({ projectId }: HotmartAPISectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testing, setTesting] = useState(false);
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    basic_auth: ''
  });

  const { data: hotmartCredentials, isLoading } = useQuery({
    queryKey: ['hotmart_credentials', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_credentials')
        .select('*, hotmart_refresh_token, hotmart_access_token, hotmart_expires_at')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (hotmartCredentials) {
      setCredentials({
        client_id: hotmartCredentials.client_id || '',
        client_secret: hotmartCredentials.client_secret || '',
        basic_auth: hotmartCredentials.basic_auth || ''
      });
    }
  }, [hotmartCredentials]);

  const saveCredentialsMutation = useMutation({
    mutationFn: async (creds: typeof credentials) => {
      const { error } = await supabase
        .from('project_credentials')
        .upsert({
          project_id: projectId,
          provider: 'hotmart',
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          basic_auth: creds.basic_auth,
          is_configured: !!(creds.client_id && creds.client_secret),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id,provider'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });
      toast({
        title: 'Credenciais salvas',
        description: 'Suas credenciais Hotmart foram atualizadas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Check if OAuth is connected
  const isOAuthConnected = !!hotmartCredentials?.hotmart_refresh_token;

  const handleSaveCredentials = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Client ID e Client Secret são necessários.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync(credentials);
      toast({
        title: 'Credenciais salvas',
        description: 'Credenciais salvas. Use o botão "Conectar Hotmart (OAuth)" na seção principal para autenticar.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Client ID e Client Secret são necessários.',
        variant: 'destructive',
      });
      return;
    }

    // Check if OAuth is configured
    if (!isOAuthConnected) {
      toast({
        title: 'OAuth não configurado',
        description: 'Primeiro salve as credenciais e complete o fluxo OAuth na seção "Conexão Hotmart" acima.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/summary',
          params: {},
          projectId,
        },
      });

      if (error) throw error;

      await supabase
        .from('project_credentials')
        .update({ 
          is_validated: true, 
          validated_at: new Date().toISOString() 
        })
        .eq('project_id', projectId)
        .eq('provider', 'hotmart');

      queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });

      toast({
        title: 'Conexão bem-sucedida!',
        description: 'Credenciais Hotmart validadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Falha na conexão',
        description: error.message || 'Verifique suas credenciais.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_credentials')
        .delete()
        .eq('project_id', projectId)
        .eq('provider', 'hotmart');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });
      setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
      toast({
        title: 'Hotmart desconectado',
        description: 'As credenciais foram removidas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isConfigured = hotmartCredentials?.is_configured;
  const isValidated = hotmartCredentials?.is_validated;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">API Hotmart (Uso Interno)</h3>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
              Avançado
            </Badge>
            {isValidated && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configurada
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
        {/* OAuth Status Alert */}
        {!isOAuthConnected && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
              <strong>OAuth não conectado.</strong> Para usar a API Hotmart, primeiro:
              <ol className="list-decimal list-inside mt-1 space-y-0.5">
                <li>Salve suas credenciais abaixo</li>
                <li>Use o botão "Conectar Hotmart (OAuth)" na seção "Conexão Hotmart" acima</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {isOAuthConnected && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-700 dark:text-green-400">
              <strong>OAuth conectado!</strong> A API Hotmart está pronta para uso.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            <strong>A API Hotmart é usada apenas para:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Backfill histórico</li>
              <li>Auditoria</li>
              <li>Contingência técnica</li>
            </ul>
            <p className="mt-2 font-medium">
              ❌ Não substitui o webhook<br />
              ❌ Não atualiza dados financeiros em tempo real
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              value={credentials.client_id}
              onChange={(e) => setCredentials(prev => ({ ...prev, client_id: e.target.value }))}
              placeholder="Seu Client ID da Hotmart"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Client Secret</Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecrets ? 'text' : 'password'}
                value={credentials.client_secret}
                onChange={(e) => setCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                placeholder="Seu Client Secret da Hotmart"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="basic_auth">Basic Auth (opcional)</Label>
            <Input
              id="basic_auth"
              type={showSecrets ? 'text' : 'password'}
              value={credentials.basic_auth}
              onChange={(e) => setCredentials(prev => ({ ...prev, basic_auth: e.target.value }))}
              placeholder="Basic auth se necessário"
            />
            <p className="text-xs text-muted-foreground">
              Usado apenas em algumas configurações específicas da Hotmart.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSaveCredentials}
              disabled={saveCredentialsMutation.isPending || !credentials.client_id || !credentials.client_secret}
              variant="outline"
            >
              {saveCredentialsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Credenciais'
              )}
            </Button>

            {isOAuthConnected && (
              <Button
                onClick={handleTestConnection}
                disabled={testing || !credentials.client_id || !credentials.client_secret}
                variant="outline"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Testar API
                  </>
                )}
              </Button>
            )}
            
            {isConfigured && (
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? 'Removendo...' : 'Remover'}
              </Button>
            )}
          </div>

          {isValidated && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Credenciais validadas</span>
              </div>
              {hotmartCredentials?.validated_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Última validação: {new Date(hotmartCredentials.validated_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm font-medium mb-2">Como obter as credenciais da API:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Acesse o painel da Hotmart</li>
            <li>Vá em <strong>Ferramentas</strong> → <strong>Credenciais de API</strong></li>
            <li>Copie o Client ID e Client Secret</li>
          </ol>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
