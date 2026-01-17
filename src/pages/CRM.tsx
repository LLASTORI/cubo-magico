/**
 * CRM - Inteligência de Clientes
 * 
 * PROMPT 31: Otimização de performance perceptiva
 * 
 * Melhorias:
 * 1. Lazy loading por aba (queries só disparam quando aba ativada)
 * 2. Skeletons imediatos (<300ms)
 * 3. Cache por projeto (staleTime: 5min)
 * 4. Transições suaves entre abas
 */
import { useState, lazy, Suspense, useCallback } from 'react';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Lock, TrendingUp, ShoppingCart, Brain, LayoutDashboard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateContactDialog } from '@/components/crm/CreateContactDialog';

// Lazy imports para cada aba - só carrega quando necessário
const CustomerIntelligenceOverview = lazy(() => 
  import('@/components/crm/CustomerIntelligenceOverview').then(m => ({ default: m.CustomerIntelligenceOverview }))
);
const CustomerJourneyWithFallback = lazy(() => 
  import('@/components/crm/CustomerJourneyWithFallback').then(m => ({ default: m.CustomerJourneyWithFallback }))
);
const AscensionAnalysis = lazy(() => 
  import('@/components/crm/AscensionAnalysis').then(m => ({ default: m.AscensionAnalysis }))
);
const CustomerFlowsAnalysis = lazy(() => 
  import('@/components/crm/CustomerFlowsAnalysis').then(m => ({ default: m.CustomerFlowsAnalysis }))
);

// Skeletons para carregamento imediato
import { 
  OverviewSkeleton, 
  JourneySkeleton, 
  AscensionSkeleton, 
  FlowsSkeleton 
} from '@/components/crm/skeletons';

export default function CRM() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading } = useProjectModules();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Rastrear quais abas já foram visitadas (para manter cache)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['overview']));
  
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setVisitedTabs(prev => new Set([...prev, value]));
  }, []);

  const crmEnabled = isModuleEnabled('crm');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Inteligência de Clientes" />
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
      <AppHeader pageSubtitle="Inteligência de Clientes" />
      
      {!currentProject ? (
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Inteligência de Clientes
              </CardTitle>
              <CardDescription>
                Selecione um projeto para visualizar insights de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Nenhum projeto selecionado. Use o seletor de projetos no cabeçalho para escolher um projeto.
              </p>
            </CardContent>
          </Card>
        </main>
      ) : !crmEnabled ? (
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="max-w-md cursor-help border-muted">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Users className="h-5 w-5" />
                      Módulo CRM
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
                <p>Para ativar o módulo CRM, entre em contato com nosso suporte pelo email suporte@cubo.app ou WhatsApp.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </main>
      ) : (
        <>
          <CRMSubNav 
            showNewContact 
            onNewContact={() => setShowCreateDialog(true)}
          />
          
          <main className="container mx-auto px-6">
            {/* Header "Inteligência de Clientes" */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Inteligência de Clientes</h1>
              </div>
              <p className="text-muted-foreground">
                Entenda a jornada de compra, comportamento de ascensão e valor dos seus clientes
              </p>
            </div>

            {/* Tabs com lazy loading */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                
                <TabsTrigger value="journey" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Jornada
                </TabsTrigger>
                
                <TabsTrigger value="ascension" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ascensão
                </TabsTrigger>
                
                <TabsTrigger value="flows" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Mapa de Ascensão
                </TabsTrigger>
              </TabsList>
              
              {/* TAB 1: Visão Geral - Carrega imediatamente (default) */}
              <TabsContent value="overview" className="mt-2" forceMount={visitedTabs.has('overview') || undefined}>
                <div className={activeTab !== 'overview' ? 'hidden' : ''}>
                  <Suspense fallback={<OverviewSkeleton />}>
                    <CustomerIntelligenceOverview />
                  </Suspense>
                </div>
              </TabsContent>
              
              {/* TAB 2: Jornada - Só carrega quando clicada */}
              <TabsContent value="journey" className="mt-2" forceMount={visitedTabs.has('journey') || undefined}>
                <div className={activeTab !== 'journey' ? 'hidden' : ''}>
                  {visitedTabs.has('journey') && (
                    <Suspense fallback={<JourneySkeleton />}>
                      <CustomerJourneyWithFallback maxHeight="calc(100vh - 320px)" />
                    </Suspense>
                  )}
                </div>
              </TabsContent>
              
              {/* TAB 3: Ascensão - Só carrega quando clicada */}
              <TabsContent value="ascension" className="mt-2" forceMount={visitedTabs.has('ascension') || undefined}>
                <div className={activeTab !== 'ascension' ? 'hidden' : ''}>
                  {visitedTabs.has('ascension') && (
                    <Suspense fallback={<AscensionSkeleton />}>
                      <AscensionAnalysis />
                    </Suspense>
                  )}
                </div>
              </TabsContent>
              
              {/* TAB 4: Mapa de Ascensão - Só carrega quando clicada */}
              <TabsContent value="flows" className="mt-2" forceMount={visitedTabs.has('flows') || undefined}>
                <div className={activeTab !== 'flows' ? 'hidden' : ''}>
                  {visitedTabs.has('flows') && (
                    <Suspense fallback={<FlowsSkeleton />}>
                      <CustomerFlowsAnalysis />
                    </Suspense>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </>
      )}

      <CreateContactDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(contactId) => {
          navigateTo(`/crm/contact/${contactId}`);
        }}
      />
    </div>
  );
}
