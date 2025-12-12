import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { CustomerJourneyAnalysis } from '@/components/crm/CustomerJourneyAnalysis';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Settings, Loader2 } from 'lucide-react';

export default function CRM() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading } = useProjectModules();

  const crmEnabled = isModuleEnabled('crm');

  // Redirect if CRM module is not enabled
  useEffect(() => {
    if (!isLoading && currentProject && !crmEnabled) {
      // Don't redirect immediately, show a message first
    }
  }, [isLoading, currentProject, crmEnabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="CRM - Jornada do Cliente" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Verificando permissões...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="CRM - Jornada do Cliente" />
      
      <main className="container mx-auto px-6 py-8">
        {!currentProject ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                CRM - Análise de Jornada
              </CardTitle>
              <CardDescription>
                Selecione um projeto para visualizar a jornada dos clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Nenhum projeto selecionado. Use o seletor de projetos no cabeçalho para escolher um projeto.
              </p>
            </CardContent>
          </Card>
        ) : !crmEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Módulo CRM Desativado
              </CardTitle>
              <CardDescription>
                O módulo CRM não está habilitado para este projeto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Para utilizar o CRM, acesse as configurações e ative o módulo na aba "Módulos".
              </p>
              <Button onClick={() => navigate('/settings')} className="gap-2">
                <Settings className="h-4 w-4" />
                Ir para Configurações
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">CRM - Jornada do Cliente</h1>
              <p className="text-muted-foreground">
                Analise o comportamento de compra dos seus clientes e entenda o LTV por ponto de entrada
              </p>
            </div>

            <CustomerJourneyAnalysis />
          </div>
        )}
      </main>
    </div>
  );
}
