import { Lightbulb, Lock, MessageCircle } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { InsightsSubNav } from '@/components/insights/InsightsSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { SocialListeningTab } from '@/components/meta/social-listening';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CubeLoader } from '@/components/CubeLoader';

export default function SocialListeningPage() {
  const { currentProject, loading: projectLoading } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();

  const insightsEnabled = isModuleEnabled('insights');

  if (projectLoading || modulesLoading) {
    return <CubeLoader />;
  }

  if (!currentProject?.id) {
    return <CubeLoader />;
  }

  // Show module disabled state
  if (!insightsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Insights - Social Listening" />
        <main className="container mx-auto px-6 py-8 flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="max-w-md cursor-help border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Social Listening
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
      <AppHeader pageSubtitle="Insights - Social Listening" />
      <InsightsSubNav />
      
      <main className="container mx-auto px-6 py-6">
        <SocialListeningTab projectId={currentProject.id} />
      </main>
    </div>
  );
}
