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
  Save
} from 'lucide-react';

interface HotmartAPISectionProps {
  projectId: string;
}

/**
 * HotmartAPISection - Configuração da API Hotmart para Produtos/Ofertas
 * 
 * IMPORTANTE: A API de Produtos/Ofertas da Hotmart usa Client Credentials.
 * São obrigatórios os 3 campos conforme padrão Hotmart:
 * - client_id: ID do aplicativo
 * - client_secret: Secret do aplicativo
 * - basic: Header de autorização pré-gerado (Base64 de client_id:client_secret)
 */
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
    basic_auth: ''  // Campo obrigatório - Basic header pré-gerado
  });

  const { data: hotmartCredentials, isLoading } = useQuery({
    queryKey: ['hotmart_credentials', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_credentials')
        .select('client_id, is_configured, is_validated, validated_at, updated_at')
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
        client_secret: '', // NEVER populate secret from DB - security
        basic_auth: ''
      });
      setHasInitialized(true);
    } else if (!hotmartCredentials && !hasInitialized) {
      setCredentials({ client_id: '', client_secret: '', basic_auth: '' });
      setHasInitialized(true);
    }
  }, [hotmartCredentials, hasInitialized]);

  const isConfigured = !!hotmartCredentials?.client_id;
  const isValidated = hotmartCredentials?.is_validated;
  const hasCredentialsInDB = !!hotmartCredentials?.client_id;

  // Save credentials - All 3 fields are required for first setup
  const handleSave = async () => {
    if (!credentials.client_id) {
      toast({
        title: 'Campo obrigatório',
        description: 'Client ID é necessário.',
        variant: 'destructive',
      });
      return;
    }

    // If no existing credentials, require ALL 3 fields
    if (!hasCredentialsInDB) {
      if (!credentials.client_secret) {
        toast({
          title: 'Campo obrigatório',
          description: 'Client Secret é necessário para a primeira configuração.',
          variant: 'destructive',
        });
        return;
      }
      if (!credentials.basic_auth) {
        toast({
          title: 'Campo obrigatório',
          description: 'Basic Auth é necessário. Copie o valor "Basic" do painel Hotmart.',
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('project_credentials')
        .select('id')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();

      if (existing) {
        const updateData: Record<string, any> = {
          client_id: credentials.client_id,
          is_configured: true,
          updated_at: new Date().toISOString()
        };
        
        // Only update secret if provided (not empty)
        if (credentials.client_secret && credentials.client_secret.trim() !== '') {
          updateData.client_secret = credentials.client_secret;
        }
        
        // Only update basic_auth if provided (not empty)
        if (credentials.basic_auth && credentials.basic_auth.trim() !== '') {
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
            is_configured: true,
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['hotmart_credentials'] });

      toast({
        title: 'Credenciais salvas!',
        description: 'API Hotmart configurada. Teste a conexão para validar.',
      });

      // Clear the secret fields after successful save (security)
      setCredentials(prev => ({ ...prev, client_secret: '', basic_auth: '' }));

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test connection using Client Credentials (clean-room test)
  const handleTestConnection = async () => {
    if (!isConfigured) {
      toast({
        title: 'API não configurada',
        description: 'Salve as credenciais primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      // Use clean-room test-connection action for detailed diagnostics
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          action: 'test-connection',
          projectId,
        },
      });

      if (error) throw error;

      // Check test result
      if (!data?.success) {
        // Show detailed error from clean-room test
        const errorMsg = data?.error || 'Erro desconhecido';
        const step = data?.step || 'unknown';
        const credStatus = data?.credentials;
        
        let detailedMsg = errorMsg;
        if (credStatus && (!credStatus.client_secret || !credStatus.basic_auth)) {
          detailedMsg = 'Credenciais incompletas no banco. Reinsira os 3 campos (Client ID, Client Secret e Basic).';
        }
        
        throw new Error(detailedMsg);
      }

      // Mark as validated
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
        description: data.message || `API Hotmart validada. ${data.productCount || 0} produtos encontrados.`,
      });
    } catch (error: any) {
      console.error('Test error:', error);
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

  // All 3 fields required for new setup, or just client_id for updates (secrets optional if already saved)
  const canSave = credentials.client_id && (
    hasCredentialsInDB || (credentials.client_secret && credentials.basic_auth)
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">API Hotmart</h3>
            {isConfigured ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configurado
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
        {/* Info Alert */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
            <strong>API de Produtos/Ofertas</strong> — usa Client Credentials (não requer OAuth).
            <ul className="list-disc list-inside mt-2 text-xs space-y-0.5">
              <li><strong>Importação de ofertas</strong> via API</li>
              <li><strong>Sincronização de ofertas</strong> com preços atualizados</li>
              <li><strong>Criação automática de ofertas</strong> quando uma venda acontece</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Credentials Form - 3 REQUIRED FIELDS */}
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID *</Label>
            <Input
              id="client_id"
              value={credentials.client_id}
              onChange={(e) => setCredentials(prev => ({ ...prev, client_id: e.target.value }))}
              placeholder="Seu Client ID da Hotmart"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">
              Client Secret *
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
            <Label htmlFor="basic_auth">
              Basic *
              {hasCredentialsInDB && (
                <span className="text-xs text-muted-foreground ml-2">(deixe vazio para manter o atual)</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="basic_auth"
                type={showSecrets ? 'text' : 'password'}
                value={credentials.basic_auth}
                onChange={(e) => setCredentials(prev => ({ ...prev, basic_auth: e.target.value }))}
                placeholder={hasCredentialsInDB ? '••••••••••••' : 'Valor do campo Basic do painel Hotmart'}
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
            <p className="text-xs text-muted-foreground">
              Copie o valor exato do campo "Basic" no painel de credenciais da Hotmart (sem o prefixo "Basic ").
            </p>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !canSave}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Credenciais
                </>
              )}
            </Button>

            {isConfigured && (
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
                  variant="destructive"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? 'Removendo...' : 'Remover'}
                </Button>
              </>
            )}
          </div>

          {/* Validation Status */}
          {isValidated && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">API validada e pronta para uso</span>
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
            <li>Copie os 3 valores: <strong>Client ID</strong>, <strong>Client Secret</strong> e <strong>Basic</strong></li>
          </ol>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
