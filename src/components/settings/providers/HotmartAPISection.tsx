import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Database, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  ChevronDown,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface HotmartAPISectionProps {
  projectId: string;
}

export function HotmartAPISection({ projectId }: HotmartAPISectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
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
        .select('*, hotmart_refresh_token, hotmart_access_token, hotmart_expires_at, hotmart_connected_at')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Only sync credentials from backend on INITIAL load
  useEffect(() => {
    if (hotmartCredentials && !hasInitialized) {
      setCredentials({
        client_id: hotmartCredentials.client_id || '',
        client_secret: '', // NEVER populate secret from DB - user must re-enter
        basic_auth: hotmartCredentials.basic_auth || ''
      });
      setHasInitialized(true);
    } else if (!hotmartCredentials && !hasInitialized) {
      setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
      setHasInitialized(true);
    }
  }, [hotmartCredentials, hasInitialized]);

  // Check for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotmartConnected = params.get('hotmart_connected');
    const hotmartError = params.get('hotmart_error');

    if (hotmartConnected === 'true') {
      toast({
        title: 'Hotmart conectado com sucesso!',
        description: 'API pronta para importação e sincronização de ofertas.',
      });
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });
    }

    if (hotmartError) {
      toast({
        title: 'Erro na conexão OAuth',
        description: hotmartError,
        variant: 'destructive',
      });
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const isOAuthConnected = !!hotmartCredentials?.hotmart_refresh_token;
  const isConfigured = hotmartCredentials?.is_configured;
  const isValidated = hotmartCredentials?.is_validated;
  const hasCredentialsInDB = hotmartCredentials?.client_id;

  // Unified Save + OAuth flow
  const handleSaveAndConnect = async () => {
    // Validate: require client_id always, require client_secret only if no existing credentials
    if (!credentials.client_id) {
      toast({
        title: 'Campo obrigatório',
        description: 'Client ID é necessário.',
        variant: 'destructive',
      });
      return;
    }

    // If no existing credentials, require secret
    if (!hasCredentialsInDB && !credentials.client_secret) {
      toast({
        title: 'Campo obrigatório',
        description: 'Client Secret é necessário para a primeira configuração.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Step 1: Save credentials
      const { data: existing } = await supabase
        .from('project_credentials')
        .select('id, client_secret')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();

      if (existing) {
        const updateData: Record<string, any> = {
          client_id: credentials.client_id,
          is_configured: !!(credentials.client_id && (credentials.client_secret || existing.client_secret)),
          updated_at: new Date().toISOString()
        };
        
        if (credentials.client_secret && credentials.client_secret.trim() !== '') {
          updateData.client_secret = credentials.client_secret;
        }
        
        if (credentials.basic_auth !== undefined) {
          updateData.basic_auth = credentials.basic_auth;
        }

        const { error } = await supabase
          .from('project_credentials')
          .update(updateData)
          .eq('project_id', projectId)
          .eq('provider', 'hotmart');
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_credentials')
          .insert({
            project_id: projectId,
            provider: 'hotmart',
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            basic_auth: credentials.basic_auth,
            is_configured: !!(credentials.client_id && credentials.client_secret),
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

      // Refetch to get updated data
      await queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });

      toast({
        title: 'Credenciais salvas',
        description: 'Iniciando autorização OAuth...',
      });

      // Step 2: Start OAuth flow
      await startOAuthFlow();

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  const startOAuthFlow = async () => {
    try {
      const pathParts = window.location.pathname.split('/');
      const projectCodeFromPath = pathParts[1] === 'app' ? pathParts[2] : undefined;
      const redirectBackUrl = projectCodeFromPath
        ? `${window.location.origin}/app/${projectCodeFromPath}/settings`
        : `${window.location.origin}/projects`;

      const { data, error } = await supabase.functions.invoke('hotmart-oauth-state', {
        body: {
          projectId,
          redirectUrl: redirectBackUrl,
        },
      });

      if (error) throw error;
      if (!data?.state) throw new Error('Estado OAuth não gerado');

      // Use the client_id from form or from DB
      const clientIdForAuth = credentials.client_id || hotmartCredentials?.client_id;
      if (!clientIdForAuth) {
        throw new Error('Client ID não encontrado');
      }

      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotmart-oauth-callback`;
      const authUrl = new URL('https://api-sec-vlc.hotmart.com/security/oauth/authorize');
      authUrl.searchParams.set('client_id', clientIdForAuth);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'all');
      authUrl.searchParams.set('state', data.state);

      // Check if in iframe
      const isInIframe = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();

      if (isInIframe) {
        const opened = window.open(authUrl.toString(), '_blank', 'noopener,noreferrer');
        if (!opened) {
          window.location.href = authUrl.toString();
          return;
        }
        toast({
          title: 'Continue a autorização na nova aba',
          description: 'Após autorizar, você voltará automaticamente.',
        });
        setSaving(false);
        return;
      }

      window.location.href = authUrl.toString();
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast({
        title: 'Erro ao iniciar OAuth',
        description: error.message || 'Não foi possível iniciar a autorização',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  const handleReconnectOAuth = async () => {
    setSaving(true);
    try {
      await startOAuthFlow();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!isOAuthConnected) {
      toast({
        title: 'OAuth não configurado',
        description: 'Complete o fluxo de autorização primeiro.',
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
        description: 'API Hotmart validada e pronta para uso.',
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
      setHasInitialized(false);
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Determine button state
  const canSaveAndConnect = credentials.client_id && (credentials.client_secret || hasCredentialsInDB);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">API Hotmart</h3>
            {isOAuthConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : hasCredentialsInDB ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                OAuth Pendente
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
                Não Configurado
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
        {/* Status Section */}
        {isOAuthConnected ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-700 dark:text-green-400">
              <strong>OAuth conectado!</strong> A API está pronta para importação e sincronização de ofertas.
              {hotmartCredentials?.hotmart_connected_at && (
                <span className="block text-xs mt-1 opacity-80">
                  Conectado em: {formatDate(hotmartCredentials.hotmart_connected_at)}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Configure suas credenciais</strong> e clique em "Salvar e Conectar" para autorizar acesso à API Hotmart.
              <ul className="list-disc list-inside mt-2 text-xs space-y-0.5">
                <li><strong>Importação de ofertas</strong> via API</li>
                <li><strong>Sincronização de ofertas</strong> com preços atualizados</li>
                <li><strong>Criação automática de ofertas</strong> quando uma venda acontece</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Credentials Form */}
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
            <Label htmlFor="client_secret">
              Client Secret
              {hasCredentialsInDB && (
                <span className="text-xs text-muted-foreground ml-2">(deixe vazio para manter o atual)</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecrets ? 'text' : 'password'}
                value={credentials.client_secret}
                onChange={(e) => setCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                placeholder={hasCredentialsInDB ? '••••••••••••' : 'Seu Client Secret da Hotmart'}
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {!isOAuthConnected ? (
              <Button
                onClick={handleSaveAndConnect}
                disabled={saving || !canSaveAndConnect}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando e Conectando...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Salvar e Conectar
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleTestConnection}
                  disabled={testing}
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
                <Button
                  onClick={handleReconnectOAuth}
                  disabled={saving}
                  variant="outline"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reconectando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconectar OAuth
                    </>
                  )}
                </Button>
              </>
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

          {/* Validation Status */}
          {isValidated && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">API validada</span>
              </div>
              {hotmartCredentials?.validated_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Última validação: {formatDate(hotmartCredentials.validated_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
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
