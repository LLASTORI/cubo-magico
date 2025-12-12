import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectModules, AVAILABLE_MODULES, type ModuleKey } from '@/hooks/useProjectModules';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BarChart3, Facebook, Blocks, Lock, Info, ShoppingCart } from 'lucide-react';
import { CRMWebhookKeysManager } from './CRMWebhookKeysManager';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, React.ElementType> = {
  users: Users,
  facebook: Facebook,
  chart: BarChart3,
  'shopping-cart': ShoppingCart,
};

export function ProjectModulesManager() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { modules, isLoading, isModuleEnabled, toggleModule, isToggling } = useProjectModules();

  // Check if current user is super_admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });

  if (!currentProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blocks className="h-5 w-5" />
            Módulos do Projeto
          </CardTitle>
          <CardDescription>
            Selecione um projeto para gerenciar seus módulos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum projeto selecionado. Use o seletor de projetos no cabeçalho.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blocks className="h-5 w-5" />
            Módulos do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const crmEnabled = isModuleEnabled('crm');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blocks className="h-5 w-5" />
            Módulos do Projeto
          </CardTitle>
          <CardDescription>
            {isSuperAdmin 
              ? `Ative ou desative módulos extras para o projeto "${currentProject.name}".`
              : `Módulos disponíveis para o projeto "${currentProject.name}". Entre em contato para ativar módulos adicionais.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AVAILABLE_MODULES.map((moduleInfo) => {
            const Icon = iconMap[moduleInfo.icon] || Blocks;
            const enabled = isModuleEnabled(moduleInfo.key);

            return (
              <div
                key={moduleInfo.key}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{moduleInfo.name}</h4>
                      {enabled ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {moduleInfo.description}
                    </p>
                  </div>
                </div>
                
                {isSuperAdmin ? (
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => toggleModule({ moduleKey: moduleInfo.key, enabled: checked })}
                    disabled={isToggling}
                  />
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Módulos são gerenciados pelo administrador</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
          
          {!isSuperAdmin && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Para ativar módulos adicionais, entre em contato com o suporte ou aguarde a confirmação do pagamento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Show CRM Webhook Keys manager when CRM is enabled */}
      {crmEnabled && <CRMWebhookKeysManager />}
    </div>
  );
}
