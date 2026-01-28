import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  ExternalLink, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HotmartOAuthSectionProps {
  projectId: string;
}

export function HotmartOAuthSection({ projectId }: HotmartOAuthSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [oauthConnecting, setOauthConnecting] = useState(false);

  const { data: hotmartCredentials, isLoading, refetch } = useQuery({
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

  const isOAuthConnected = !!hotmartCredentials?.hotmart_refresh_token;
  const hasCredentials = hotmartCredentials?.is_configured && hotmartCredentials?.client_id;

  // Handle OAuth connection
  const handleOAuthConnect = async () => {
    if (!projectId) return;

    if (!hasCredentials) {
      toast({
        title: 'Configure as credenciais primeiro',
        description: 'Salve o Client ID e Client Secret na seção "API Hotmart" antes de conectar via OAuth.',
        variant: 'destructive',
      });
      return;
    }

    setOauthConnecting(true);
    try {
      // Build a safe redirect back URL to this project's settings.
      const pathParts = window.location.pathname.split('/');
      const projectCodeFromPath = pathParts[1] === 'app' ? pathParts[2] : undefined;
      const redirectBackUrl = projectCodeFromPath
        ? `${window.location.origin}/app/${projectCodeFromPath}/settings`
        : `${window.location.origin}/projects`;

      // Get signed state from backend function
      const { data, error } = await supabase.functions.invoke('hotmart-oauth-state', {
        body: {
          projectId,
          redirectUrl: redirectBackUrl,
        },
      });

      if (error) throw error;
      if (!data?.state) throw new Error('Estado OAuth não gerado');

      // Build Hotmart authorization URL
      const clientIdForAuth = hotmartCredentials?.client_id;
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

      // In the preview (iframe), Hotmart blocks rendering, so we open a new tab.
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
          description: 'A Hotmart não abre dentro do preview. Depois de autorizar, você voltará para as Configurações.',
        });

        setOauthConnecting(false);
        return;
      }

      // Production: same-tab redirect
      window.location.href = authUrl.toString();

    } catch (error: any) {
      console.error('OAuth error:', error);
      toast({
        title: 'Erro ao conectar OAuth',
        description: error.message || 'Não foi possível iniciar conexão OAuth',
        variant: 'destructive',
      });
      setOauthConnecting(false);
    }
  };

  // Check for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotmartConnected = params.get('hotmart_connected');
    const hotmartError = params.get('hotmart_error');

    if (hotmartConnected === 'true') {
      toast({
        title: 'Hotmart conectado com sucesso!',
        description: 'Agora você pode sincronizar dados e importar ofertas via API.',
      });
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Refetch credentials
      queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });
    }

    if (hotmartError) {
      toast({
        title: 'Erro na conexão OAuth',
        description: hotmartError,
        variant: 'destructive',
      });
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Conexão OAuth
              {isOAuthConnected ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Não Conectado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Autorização segura para acesso à API da Hotmart
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasCredentials ? (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Credenciais não configuradas.</strong> Primeiro salve o Client ID e Client Secret na seção "API Hotmart" abaixo.
            </AlertDescription>
          </Alert>
        ) : isOAuthConnected ? (
          <div className="space-y-4">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                <strong>OAuth conectado!</strong> A API Hotmart está pronta para importação e sincronização de ofertas.
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conectado em:</span>
                <span className="font-medium">{formatDate(hotmartCredentials?.hotmart_connected_at)}</span>
              </div>
              {hotmartCredentials?.hotmart_expires_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Token expira em:</span>
                  <span className="font-medium">{formatDate(hotmartCredentials?.hotmart_expires_at)}</span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleOAuthConnect}
              disabled={oauthConnecting}
              className="w-full"
            >
              {oauthConnecting ? (
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <p className="text-sm text-muted-foreground">
                A conexão OAuth permite acesso seguro à API da Hotmart para:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Importação de ofertas</strong> via API</li>
                <li><strong>Sincronização de ofertas</strong> com preços atualizados</li>
                <li><strong>Criação automática de ofertas</strong> quando uma venda acontece</li>
                <li><strong>Backfill histórico</strong> de vendas</li>
              </ul>
            </div>

            <Button
              onClick={handleOAuthConnect}
              disabled={oauthConnecting || !hasCredentials}
              className="w-full"
            >
              {oauthConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Conectar Hotmart (OAuth)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
