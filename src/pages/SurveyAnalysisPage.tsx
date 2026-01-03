import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { InsightsSubNav } from '@/components/insights/InsightsSubNav';
import { 
  SurveyInsightsSubNav,
  SurveyAnalysisDashboard,
  SurveyAnalysisBySurvey,
  SurveyAIKnowledgeBaseSettings,
  SurveyAnalysisGuide 
} from '@/components/insights/surveys';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { CubeLoader } from '@/components/CubeLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function SurveyAnalysisPage() {
  const location = useLocation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: isLoadingModules } = useProjectModules();
  
  // Determine which sub-page to show based on path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/by-survey')) return 'by-survey';
    if (path.includes('/ai-settings')) return 'ai-settings';
    if (path.includes('/guide')) return 'guide';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  if (isLoadingModules || !currentProject) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Análise de Pesquisas" />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  // Check if insights module is enabled
  if (!isModuleEnabled('insights')) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Análise de Pesquisas" />
        <main className="container mx-auto px-6 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Módulo não habilitado</h3>
              <p className="text-muted-foreground mb-4">
                O módulo de Insights não está ativo para este projeto.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador para ativar este módulo.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Análise de Pesquisas" />
      <InsightsSubNav />
      <SurveyInsightsSubNav />
      
      <main className="container mx-auto px-6 py-6">
        {activeTab === 'dashboard' && (
          <SurveyAnalysisDashboard projectId={currentProject.id} />
        )}
        {activeTab === 'by-survey' && (
          <SurveyAnalysisBySurvey projectId={currentProject.id} />
        )}
        {activeTab === 'ai-settings' && (
          <SurveyAIKnowledgeBaseSettings projectId={currentProject.id} />
        )}
        {activeTab === 'guide' && (
          <SurveyAnalysisGuide projectId={currentProject.id} />
        )}
      </main>
    </div>
  );
}
