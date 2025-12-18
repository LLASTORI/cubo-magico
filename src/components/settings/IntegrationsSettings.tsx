import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/contexts/ProjectContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Facebook, ShoppingCart, MessageCircle, CheckCircle, AlertCircle, RefreshCw, Webhook } from 'lucide-react';
import { HotmartSettings } from './HotmartSettings';
import { WhatsAppFullSettings } from './WhatsAppFullSettings';
import { CRMWebhookKeysManager } from './CRMWebhookKeysManager';
import { FullDataSync } from '@/components/FullDataSync';
import { useToast } from '@/hooks/use-toast';
import { useCRMWebhookKeys } from '@/hooks/useCRMWebhookKeys';

const META_APP_ID = '845927421602166';

export function IntegrationsSettings() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Meta credentials query
  const { data: metaCredentials } = useQuery({
    queryKey: ['meta_credentials', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;
      const { data, error } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', currentProject.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!currentProject?.id,
  });

  // Hotmart credentials query
  const { data: hotmartCredentials } = useQuery({
    queryKey: ['hotmart_credentials_status', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;
      const { data } = await supabase
        .from('hotmart_credentials' as any)
        .select('is_validated')
        .eq('project_id', currentProject.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentProject?.id,
  });

  // WhatsApp numbers query
  const { data: whatsappNumbers } = useQuery({
    queryKey: ['whatsapp-numbers-status', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('status')
        .eq('project_id', currentProject.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  const isMetaExpired = metaCredentials?.expires_at 
    ? new Date(metaCredentials.expires_at) < new Date()
    : false;
  
  const isHotmartConnected = (hotmartCredentials as any)?.is_validated === true;
  const hasActiveWhatsApp = whatsappNumbers?.some((n: any) => n.status === 'active') ?? false;

  // Webhook keys
  const { webhookKeys } = useCRMWebhookKeys();
  const hasWebhookKeys = (webhookKeys?.length ?? 0) > 0;

  const handleConnectMeta = async () => {
    if (!currentProject?.id) {
      toast({
        title: 'Erro',
        description: 'Selecione um projeto primeiro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('meta-oauth-state', {
        body: {
          projectId: currentProject.id,
          redirectUrl: window.location.href,
        },
      });

      if (error || !data?.state) {
        throw new Error(error?.message || 'Falha ao gerar estado de autenticação');
      }

      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;
      const scope = 'ads_read,ads_management,business_management';
      
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${data.state}&scope=${scope}`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Meta OAuth:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const disconnectMetaMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('Projeto não selecionado');
      const { error } = await supabase
        .from('meta_credentials')
        .delete()
        .eq('project_id', currentProject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta_credentials'] });
      toast({
        title: 'Meta desconectado',
        description: 'Sua conta Meta foi desconectada.',
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

  const getMetaStatus = () => {
    if (!metaCredentials) return 'disconnected';
    if (isMetaExpired) return 'expired';
    return 'connected';
  };

  const metaStatus = getMetaStatus();

  return (
    <div className="space-y-6">
      {/* Full Data Sync at the top */}
      <FullDataSync />

      {/* Integrations Tabs */}
      <Tabs defaultValue="hotmart" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hotmart" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Hotmart</span>
            {isHotmartConnected && (
              <span className="h-2 w-2 rounded-full bg-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            <span className="hidden sm:inline">Meta Ads</span>
            {metaStatus === 'connected' && (
              <span className="h-2 w-2 rounded-full bg-green-500" />
            )}
            {metaStatus === 'expired' && (
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
            {hasActiveWhatsApp && (
              <span className="h-2 w-2 rounded-full bg-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
            {hasWebhookKeys && (
              <span className="h-2 w-2 rounded-full bg-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Hotmart Tab */}
        <TabsContent value="hotmart" className="mt-6">
          <HotmartSettings />
        </TabsContent>

        {/* Meta Ads Tab */}
        <TabsContent value="meta" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Facebook className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Meta Ads
                      {metaStatus === 'connected' && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                      )}
                      {metaStatus === 'expired' && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Token Expirado
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Conecte suas contas de anúncios do Facebook e Instagram.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentProject ? (
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Selecione um projeto primeiro para conectar o Meta Ads.
                  </p>
                </div>
              ) : metaStatus === 'connected' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Usuário conectado:</span>
                      <span className="text-sm font-medium">{metaCredentials?.user_name || 'N/A'}</span>
                    </div>
                    {metaCredentials?.user_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">ID da conta Meta:</span>
                        <span className="text-sm font-medium font-mono">{metaCredentials.user_id}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Projeto:</span>
                      <span className="text-sm font-medium">{currentProject.name}</span>
                    </div>
                    {metaCredentials?.expires_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Token expira em:</span>
                        <span className="text-sm font-medium">
                          {new Date(metaCredentials.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleConnectMeta}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconectar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => disconnectMetaMutation.mutate()}
                      disabled={disconnectMetaMutation.isPending}
                    >
                      {disconnectMetaMutation.isPending ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      {metaStatus === 'expired' 
                        ? 'Seu token do Meta expirou. Reconecte para continuar importando dados.'
                        : 'Conecte sua conta Meta para importar dados de gastos com anúncios e cruzar com seus dados de vendas.'
                      }
                    </p>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Importe gastos por campanha, conjunto e anúncio</li>
                    <li>• Analise ROI e ROAS por funil</li>
                    <li>• Cruze dados de investimento x faturamento</li>
                  </ul>
                  <Button onClick={handleConnectMeta} className="w-full">
                    <Facebook className="h-4 w-4 mr-2" />
                    Conectar com Facebook
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppFullSettings />
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="mt-6">
          <CRMWebhookKeysManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
