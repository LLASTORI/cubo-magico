import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Bot, AlertTriangle, Check, Settings2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { CubeLoader } from '@/components/CubeLoader';

export function AIProviderSettings() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('lovable');

  // Fetch AI quotas and usage
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ['ai-quota-settings', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;

      const { data, error } = await supabase
        .from('ai_project_quotas')
        .select('*')
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch usage stats from tracking table
  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-usage-stats', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ai_usage_tracking')
        .select('provider, items_processed, cost_estimate')
        .eq('project_id', currentProject.id)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;

      // Aggregate by provider
      const stats = {
        lovable: { count: 0, cost: 0 },
        openai: { count: 0, cost: 0 },
      };

      data?.forEach((row) => {
        const provider = row.provider?.toLowerCase() || 'lovable';
        if (provider.includes('lovable') || provider.includes('gemini')) {
          stats.lovable.count += row.items_processed || 1;
          stats.lovable.cost += row.cost_estimate || 0;
        } else if (provider.includes('openai') || provider.includes('gpt')) {
          stats.openai.count += row.items_processed || 1;
          stats.openai.cost += row.cost_estimate || 0;
        }
      });

      return stats;
    },
    enabled: !!currentProject?.id,
  });

  // Check if OpenAI key is configured
  const { data: hasOpenAIKey } = useQuery({
    queryKey: ['openai-key-check'],
    queryFn: async () => {
      // We can't directly check secrets, but we can infer from usage or quota settings
      return quotaData?.provider_preference === 'openai';
    },
    enabled: !!quotaData,
  });

  // Update provider preference
  const updateProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      if (!currentProject?.id) throw new Error('Projeto não selecionado');

      const { error } = await supabase
        .from('ai_project_quotas')
        .upsert({
          project_id: currentProject.id,
          provider_preference: provider,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Preferência de provider atualizada!');
      queryClient.invalidateQueries({ queryKey: ['ai-quota-settings'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar preferência: ' + (error as Error).message);
    },
  });

  // Reset monthly usage
  const resetUsageMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('Projeto não selecionado');

      const { error } = await supabase
        .from('ai_project_quotas')
        .update({
          lovable_credits_used: 0,
          openai_credits_used: 0,
          current_monthly_usage: 0,
          last_monthly_reset: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', currentProject.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Uso mensal resetado!');
      queryClient.invalidateQueries({ queryKey: ['ai-quota-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-stats'] });
    },
    onError: (error) => {
      toast.error('Erro ao resetar uso: ' + (error as Error).message);
    },
  });

  // Set initial provider from data
  useState(() => {
    if (quotaData?.provider_preference) {
      setSelectedProvider(quotaData.provider_preference);
    }
  });

  if (quotaLoading || statsLoading) {
    return <CubeLoader />;
  }

  const lovableLimit = quotaData?.lovable_credits_limit || 1000;
  const lovableUsed = usageStats?.lovable.count || 0;
  const lovablePercentage = Math.min((lovableUsed / lovableLimit) * 100, 100);
  const openaiUsed = usageStats?.openai.count || 0;
  const openaiCost = usageStats?.openai.cost || 0;

  const isNearLimit = lovablePercentage >= 80;
  const isOverLimit = lovablePercentage >= 100;

  // Calculate days until reset
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysUntilReset = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const currentProvider = quotaData?.provider_preference || 'lovable';

  return (
    <div className="space-y-6">
      {/* Warning if near limit */}
      {isNearLimit && !isOverLimit && (
        <Alert variant="destructive" className="border-yellow-500 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-500">
            Você está usando {lovablePercentage.toFixed(0)}% dos créditos gratuitos do Lovable AI. 
            Considere ativar a OpenAI como backup.
          </AlertDescription>
        </Alert>
      )}

      {isOverLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Limite de créditos gratuitos do Lovable AI atingido! 
            O sistema está usando OpenAI automaticamente (se configurado).
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lovable AI Card */}
        <Card className={currentProvider === 'lovable' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Lovable AI</CardTitle>
              </div>
              {currentProvider === 'lovable' && (
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              )}
            </div>
            <CardDescription>Gratuito até {lovableLimit} classificações/mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uso este mês</span>
                <span className={isNearLimit ? 'text-yellow-500 font-medium' : ''}>
                  {lovableUsed} / {lovableLimit}
                </span>
              </div>
              <Progress 
                value={lovablePercentage} 
                className={`h-2 ${isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
              />
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Modelo: google/gemini-2.5-flash</span>
              <span>Renova em: {daysUntilReset} dias</span>
            </div>
          </CardContent>
        </Card>

        {/* OpenAI Card */}
        <Card className={currentProvider === 'openai' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">OpenAI</CardTitle>
              </div>
              {currentProvider === 'openai' && (
                <Badge variant="default" className="bg-blue-500">
                  <Check className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              )}
            </div>
            <CardDescription>Requer API Key com créditos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Itens processados</span>
                <span>{openaiUsed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Custo estimado</span>
                <span className="font-medium">${openaiCost.toFixed(4)}</span>
              </div>
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Modelo: gpt-4o-mini</span>
              <span>API Key: {hasOpenAIKey ? '✓ Configurada' : '⚠ Não configurada'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            <CardTitle>Provider Preferencial</CardTitle>
          </div>
          <CardDescription>
            Escolha qual serviço de IA usar para classificação de comentários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup 
            value={selectedProvider} 
            onValueChange={setSelectedProvider}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="lovable" id="lovable" className="mt-1" />
              <Label htmlFor="lovable" className="flex-1 cursor-pointer">
                <div className="font-medium">Lovable AI (Gratuito)</div>
                <div className="text-sm text-muted-foreground">
                  Usa google/gemini-2.5-flash. Gratuito até {lovableLimit} classificações/mês.
                  Ideal para a maioria dos casos de uso.
                </div>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="openai" id="openai" className="mt-1" />
              <Label htmlFor="openai" className="flex-1 cursor-pointer">
                <div className="font-medium">OpenAI (Pago)</div>
                <div className="text-sm text-muted-foreground">
                  Usa gpt-4o-mini. Requer API key configurada com créditos.
                  Recomendado para grandes volumes ou quando Lovable AI estiver no limite.
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="flex items-center gap-3 pt-2">
            <Button 
              onClick={() => updateProviderMutation.mutate(selectedProvider)}
              disabled={updateProviderMutation.isPending || selectedProvider === currentProvider}
            >
              {updateProviderMutation.isPending ? 'Salvando...' : 'Salvar Preferência'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => resetUsageMutation.mutate()}
              disabled={resetUsageMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetar Contadores
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Como funciona:</strong> O sistema primeiro tenta classificar usando palavras-chave (gratuito e instantâneo). 
              Se não encontrar match, usa o provider de IA selecionado.
            </p>
            <p>
              <strong>Fallback automático:</strong> Se o provider preferencial falhar ou estiver no limite, 
              o sistema automaticamente tenta o outro provider disponível.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
