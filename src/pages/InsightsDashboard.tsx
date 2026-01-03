import { useNavigate } from 'react-router-dom';
import { Lightbulb, ClipboardList, MessageCircle, Lock } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { InsightsSubNav } from '@/components/insights/InsightsSubNav';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CubeLoader } from '@/components/CubeLoader';

export default function InsightsDashboard() {
  const navigate = useNavigate();
  const { isModuleEnabled, isLoading } = useProjectModules();

  const insightsEnabled = isModuleEnabled('insights');

  if (isLoading) {
    return <CubeLoader />;
  }

  // Show module disabled state
  if (!insightsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Insights" />
        <main className="container mx-auto px-6 py-8 flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="max-w-md cursor-help border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Módulo Insights
                  </CardTitle>
                  <CardDescription>
                    Este módulo não está habilitado para o seu projeto.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Entre em contato com o suporte para ativar este recurso.
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Para ativar o módulo Insights, entre em contato com nosso suporte pelo email suporte@cubo.app ou WhatsApp.</p>
            </TooltipContent>
          </Tooltip>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Insights" />
      <InsightsSubNav />
      
      <main className="container mx-auto px-6 py-6">
        {/* Description */}
        <div className="mb-8 max-w-3xl">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Insights
          </h1>
          <p className="text-muted-foreground">
            Entenda o que seus clientes dizem, sentem e demonstram — dentro e fora do seu funil.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          {/* Pesquisas Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/insights/surveys')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Pesquisas</CardTitle>
                  <CardDescription>Feedback explícito e estruturado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Crie pesquisas inteligentes para coletar dados declarados dos seus contatos. 
                Enriqueça o perfil do cliente com informações valiosas.
              </p>
              <Button variant="outline" size="sm">
                Acessar Pesquisas →
              </Button>
            </CardContent>
          </Card>

          {/* Social Listening Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/insights/social')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <CardTitle>Social Listening</CardTitle>
                  <CardDescription>Feedback implícito via redes sociais</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Monitore comentários e interações nas redes sociais. 
                Identifique sentimentos, intenções de compra e oportunidades.
              </p>
              <Button variant="outline" size="sm">
                Acessar Social Listening →
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
