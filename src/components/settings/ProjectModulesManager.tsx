import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectModules, AVAILABLE_MODULES, type ModuleKey } from '@/hooks/useProjectModules';
import { useProject } from '@/contexts/ProjectContext';
import { Users, BarChart3, Facebook, Blocks } from 'lucide-react';
import { CRMWebhookKeysManager } from './CRMWebhookKeysManager';

const iconMap: Record<string, React.ElementType> = {
  users: Users,
  facebook: Facebook,
  chart: BarChart3,
};

export function ProjectModulesManager() {
  const { currentProject } = useProject();
  const { modules, isLoading, isModuleEnabled, toggleModule, isToggling } = useProjectModules();

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
            Ative ou desative módulos extras para o projeto "{currentProject.name}".
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
                      {enabled && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {moduleInfo.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => toggleModule({ moduleKey: moduleInfo.key, enabled: checked })}
                  disabled={isToggling}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Show CRM Webhook Keys manager when CRM is enabled */}
      {crmEnabled && <CRMWebhookKeysManager />}
    </div>
  );
}
