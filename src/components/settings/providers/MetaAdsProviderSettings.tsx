import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Facebook, CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { getFunctionErrorMessage } from '@/lib/supabaseFunctionError';

const META_APP_ID = '845927421602166';

interface MetaAdsProviderSettingsProps {
  onBack: () => void;
}

export function MetaAdsProviderSettings({ onBack }: MetaAdsProviderSettingsProps) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const isMetaExpired = metaCredentials?.expires_at 
    ? new Date(metaCredentials.expires_at) < new Date()
    : false;

  const getMetaStatus = () => {
    if (!metaCredentials) return 'disconnected';
    if (isMetaExpired) return 'expired';
    return 'connected';
  };

  const metaStatus = getMetaStatus();

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
          redirectUrl: `${window.location.origin}/app/${currentProject.public_code}/settings`,

        },
      });

      if (error || !data?.state) {
        const message = await getFunctionErrorMessage(error, 'Falha ao gerar estado de autenticação');
        throw new Error(message);
      }

      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;
      const scope = 'ads_read,ads_management,business_management,pages_show_list,pages_read_engagement';
      
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${data.state}&scope=${scope}&auth_type=rerequest&response_type=code`;
      
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

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Facebook className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Provider: Meta Ads
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                📊 Aquisição
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Conecte suas contas de anúncios do Facebook e Instagram
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
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
                Conecte sua conta Meta para importar dados de gastos com anúncios.
              </CardDescription>
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
    </div>
  );
}
