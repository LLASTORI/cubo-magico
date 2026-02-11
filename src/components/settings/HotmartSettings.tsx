import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useProjectModules } from '@/hooks/useProjectModules';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ShoppingCart, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Lock, 
  Database,
  Calendar,
  Copy,
  Webhook,
  ExternalLink,
  Info,
  FileSpreadsheet,
  History,
  DollarSign,
  TrendingUp
} from 'lucide-react';
// CSV imports removed - now handled in Sales domain (BuscaRapida)
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Not needed anymore - we tell users to select ALL events

export const HotmartSettings = () => {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isModuleEnabled } = useProjectModules();
  const isHotmartEnabled = isModuleEnabled('hotmart');

  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    basic_auth: ''
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState('');

  const projectId = currentProject?.id;

  // Generate unique webhook URL for this project
  const webhookUrl = projectId 
  ? `https://yioldpwkkgsdsukxfcnr.supabase.co/functions/v1/hotmart-webhook/${projectId}`
  : '';


  const { data: hotmartCredentials, isLoading } = useQuery({
    queryKey: ['hotmart_credentials', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('project_credentials')
        .select('*')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Get current Hotmart data stats
  const { data: dataStats, refetch: refetchStats } = useQuery({
    queryKey: ['hotmart_data_stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { count: hotmartCount } = await supabase
        .from('hotmart_sales')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      const { data: hotmartDatesMin } = await supabase
        .from('hotmart_sales')
        .select('sale_date')
        .eq('project_id', projectId)
        .order('sale_date', { ascending: true })
        .limit(1);

      const { data: hotmartDatesMax } = await supabase
        .from('hotmart_sales')
        .select('sale_date')
        .eq('project_id', projectId)
        .order('sale_date', { ascending: false })
        .limit(1);

      // Count abandoned carts
      const { count: abandonedCount } = await supabase
        .from('hotmart_sales')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'ABANDONED');

      return {
        count: hotmartCount || 0,
        minDate: hotmartDatesMin?.[0]?.sale_date,
        maxDate: hotmartDatesMax?.[0]?.sale_date,
        abandonedCount: abandonedCount || 0,
      };
    },
    enabled: !!projectId,
  });

  // FIXED: Only sync credentials from backend on INITIAL load, not on every refetch
// This prevents user input from being overwritten when queryClient invalidates
const [hasInitialized, setHasInitialized] = useState(false);

useEffect(() => {
  // Only populate form on first load when we don't have user input yet
  if (hotmartCredentials && !hasInitialized) {
    console.log('[FORENSIC] Initial credentials load from DB:', {
      client_id: hotmartCredentials.client_id ? 'present' : 'missing',
      client_secret: hotmartCredentials.client_secret ? 'present' : 'missing',
    });

    setCredentials({
      client_id: hotmartCredentials.client_id || '',
      client_secret: '', // NEVER populate secret from DB - user must re-enter for security
      basic_auth: hotmartCredentials.basic_auth || '',
    });

    setHasInitialized(true);

  } else if (!hotmartCredentials && !hasInitialized) {

    setCredentials({
      client_id: '',
      client_secret: '',
      basic_auth: '',
    });

    setHasInitialized(true);
  }

}, [hotmartCredentials, hasInitialized]);

const saveCredentialsMutation = useMutation({

  mutationFn: async (creds: typeof credentials) => {

    if (!projectId) {
      throw new Error('Projeto não selecionado');
    }

    console.log('[FORENSIC] saveCredentialsMutation called:', {
      projectId,
      client_id: creds.client_id
        ? `${creds.client_id.substring(0, 8)}...`
        : 'EMPTY',
      client_secret: creds.client_secret
        ? `${creds.client_secret.length} chars`
        : 'EMPTY',
      basic_auth: creds.basic_auth ? 'present' : 'empty',
    });


    const payload: Record<string, any> = {
      project_id: projectId,
      provider: 'hotmart',
      client_id: creds.client_id,
      is_configured: !!(creds.client_id && creds.client_secret),
      updated_at: new Date().toISOString(),
    };


    // Send client_secret when provided (trigger will encrypt)
    if (creds.client_secret && creds.client_secret.trim() !== '') {
      payload.client_secret = creds.client_secret;
    }


    // Send basic_auth when provided
    if (creds.basic_auth && creds.basic_auth.trim() !== '') {
      payload.basic_auth = creds.basic_auth;
    }


    console.log('[FORENSIC] Upsert payload:', JSON.stringify(payload, null, 2));


    const { error } = await supabase
      .from('project_credentials')
      .upsert(payload, {
        onConflict: 'project_id,provider',
      });


    if (error) {
      throw error;
    }

  },


  onSuccess: () => {

    queryClient.invalidateQueries({
      queryKey: ['hotmart_credentials'],
    });

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


// Removed handleSyncHotmart - sales sync must come from webhook or CSV, not API
// The API is now exclusively for Products/Offers catalog management


  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Projeto não selecionado');
      
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

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      toast({
        title: 'URL copiada!',
        description: 'Cole no painel da Hotmart.',
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Tente selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  const handleBackfillHistory = async () => {
    if (!projectId) return;

    setBackfilling(true);
    setBackfillMessage('Iniciando reconstrução do histórico...');

    try {
      const { data, error } = await supabase.functions.invoke('hotmart-backfill', {
        body: {
          projectId,
          startDate: subMonths(new Date(), 24).getTime(),
        },
      });

      if (error) throw error;

      const result = data as {
        eventsCreated: number;
        eventsSkipped: number;
        totalSalesFound: number;
        errors: number;
      };

      setBackfillMessage(
        `✓ ${result.eventsCreated.toLocaleString()} eventos criados, ${result.eventsSkipped.toLocaleString()} já existentes`
      );

      toast({
        title: 'Histórico reconstruído!',
        description: `${result.eventsCreated.toLocaleString()} eventos de vendas criados.`,
      });

      refetchStats();

    } catch (error: any) {
      console.error('Backfill error:', error);
      setBackfillMessage(error.message || 'Erro ao reconstruir histórico');
      toast({
        title: 'Erro na reconstrução',
        description: error.message || 'Erro ao reconstruir histórico de vendas',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setBackfilling(false);
        setBackfillMessage('');
      }, 5000);
    }
  };

  const isConfigured = hotmartCredentials?.is_configured;
  const isValidated = hotmartCredentials?.is_validated;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ShoppingCart className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Hotmart
                {!isHotmartEnabled && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
                    <Lock className="h-3 w-3 mr-1" />
                    Módulo Desativado
                  </Badge>
                )}
                {isHotmartEnabled && isValidated && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
                {isHotmartEnabled && isConfigured && !isValidated && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Não Validado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure suas credenciais da API Hotmart para sincronizar vendas.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentProject ? (
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              Selecione um projeto primeiro para configurar o Hotmart.
            </p>
          </div>
        ) : !isHotmartEnabled ? (
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              O módulo Hotmart está desativado para este projeto. Entre em contato com o administrador para ativá-lo.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Webhook Section - ALWAYS SHOW FOR CONFIGURED PROJECTS */}
            {projectId && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Webhook (Tempo Real)</h3>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                      Recomendado
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg border bg-card space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">URL do Webhook (única para este projeto)</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={webhookUrl} 
                          readOnly 
                          className="font-mono text-xs bg-muted"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={handleCopyWebhookUrl}
                          className="shrink-0"
                        >
                          {copiedUrl ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-green-700 dark:text-green-400">
                          <strong>Selecione TODOS os eventos disponíveis</strong>
                          <p className="text-xs mt-1 opacity-80">
                            Nosso sistema processa automaticamente apenas os eventos relevantes. 
                            Isso inclui abandono de carrinho para recuperação via WhatsApp.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Como configurar na Hotmart:</Label>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                        <li>Acesse o painel da Hotmart → <strong>Ferramentas</strong> → <strong>Webhooks</strong></li>
                        <li>Clique em <strong>"Configuração de Webhook"</strong></li>
                        <li>Cole a URL acima no campo <strong>"URL de destino"</strong></li>
                        <li>Selecione a versão <strong>2.0.0</strong></li>
                        <li><strong className="text-foreground">Marque TODOS os eventos disponíveis</strong></li>
                        <li>Clique em <strong>"Salvar"</strong></li>
                      </ol>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open('https://app-vlc.hotmart.com/tools/webhook', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Configuração de Webhooks na Hotmart
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-orange-700 dark:text-orange-400">
                        <strong>Importante:</strong> O webhook captura dados em tempo real, incluindo <strong>telefone do comprador</strong> e <strong>abandono de carrinho</strong>. 
                        Configure primeiro o webhook antes de sincronizar dados históricos.
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Credentials Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Credenciais da API (Sincronização em Lote)</h3>
              </div>

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
                  onClick={handleTestConnection}
                  disabled={testing || !credentials.client_id || !credentials.client_secret}
                  className="flex-1"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Salvar e Testar Conexão
                    </>
                  )}
                </Button>
                
                {isConfigured && (
                  <Button
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? 'Removendo...' : 'Desconectar'}
                  </Button>
                )}
              </div>

              {isValidated && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Credenciais validadas com sucesso!</span>
                  </div>
                  {hotmartCredentials?.validated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Última validação: {new Date(hotmartCredentials.validated_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Note about API usage */}
            {isConfigured && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>API configurada para Produtos/Ofertas</strong>
                    <p className="mt-1 text-xs">
                      A API Hotmart é usada apenas para importar e sincronizar ofertas. 
                      As vendas são recebidas via <strong>Webhook</strong> ou <strong>CSV</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Backfill Section */}
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Reconstrução de Histórico</h3>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Novo
                </Badge>
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-3">
                <p className="text-sm text-muted-foreground">
                  Reconstrói os eventos de vendas no módulo Sales Core a partir dos dados sincronizados.
                  Isso permite que a <strong>Busca Rápida</strong>, <strong>Funis</strong> e <strong>Insights</strong> mostrem 100% das vendas históricas.
                </p>
                
                {backfillMessage && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {backfillMessage}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleBackfillHistory}
                  disabled={backfilling}
                  variant="outline"
                  className="w-full"
                >
                  {backfilling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reconstruindo...
                    </>
                  ) : (
                    <>
                      <History className="h-4 w-4 mr-2" />
                      Reconstruir Histórico de Vendas
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  <strong>Idempotente:</strong> Pode ser executado várias vezes sem duplicar dados.
                </p>
              </div>
            </div>

            {/* Financial Info Section */}
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Dados Financeiros</h3>
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-3">
                <p className="text-sm text-muted-foreground">
                  Os dados financeiros são recebidos via <strong>Webhook</strong> em tempo real.
                  Configure o webhook acima para capturar vendas, reembolsos e chargebacks.
                </p>
              </div>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
